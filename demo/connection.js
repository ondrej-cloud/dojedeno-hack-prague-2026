/* Public hackathon demo connection; no presenter code is required. */
(function () {
  'use strict';
  const hosted = location.protocol === 'https:' && location.hostname.endsWith('.netlify.app');
  const scriptURL = document.currentScript?.src || new URL('connection.js', location.href).href;
  const configURL = new URL('live-server.json', scriptURL);
  let backendPromise = null;
  let qrValue = null;

  function consumeLiveCode() {
    const incoming = new URLSearchParams(location.hash.slice(1)).get('live');
    if (!hosted || !incoming) return false;
    // Old personal links remain usable, but their code is no longer needed.
    try { sessionStorage.removeItem("dojedeno-live-token"); } catch {}
    // Consume the access code before deck.js handles its slide hash.
    const slides = [...document.querySelectorAll('.slajd')];
    const demoIndex = slides.findIndex(slide => slide.hasAttribute('data-demo'));
    history.replaceState(null, '', location.pathname + location.search + (demoIndex >= 0 ? '#' + (demoIndex + 1) : ''));
    return true;
  }
  consumeLiveCode();
  addEventListener('hashchange', () => { if (consumeLiveCode()) location.reload(); });
  document.documentElement.classList.toggle('live-hosted', hosted);

  async function backendURL() {
    if (!backendPromise) backendPromise = (async () => {
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 10000);
      try {
        const response = await fetch(configURL.href, { cache: 'no-store', signal: abort.signal });
        if (!response.ok) throw new Error();
        const config = await response.json();
        const url = new URL(config.backendUrl);
        if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
        return url.origin;
      } catch {
        throw new Error('Živý server není dostupný. Na Macu spusťte přenos a aktualizujte jeho spojení s webem.');
      } finally { clearTimeout(timer); }
    })().catch(error => { backendPromise = null; throw error; });
    return backendPromise;
  }

  async function remoteFetch(path, options, phone) {
    const endpoint = new URL(path, location.origin);
    const allowed = phone ? ['/api/frame'] : ['/api/status', '/api/frame', '/api/analyze'];
    if (!allowed.includes(endpoint.pathname)) throw new Error('Neznámý požadavek živého dema.');
    endpoint.searchParams.delete('token');
    const target = await backendURL() + endpoint.pathname + endpoint.search;
    const headers = new Headers(options?.headers);
    headers.delete('Authorization');
    return fetch(target, { ...options, headers, mode: 'cors', credentials: 'omit', redirect: 'error', cache: 'no-store' });
  }

  window.demoApiFetch = function (path, options) {
    return hosted ? remoteFetch(path, options, false) : fetch(path, options);
  };
  window.phoneApiFetch = function (path, options) {
    return hosted ? remoteFetch(path, options, true) : fetch(path, options);
  };
  window.prepareDemoConfig = async function (config) {
    const mode = new URLSearchParams(location.search).get('mode');
    const copy = JSON.parse(JSON.stringify(config));
    function sample(notice = null) {
      copy.connectionNotice = notice;
      copy.analysis = { ...copy.analysis, mode: 'demo' };
      copy.camera = { ...copy.camera, source: 'none' };
      copy.detection = { ...copy.detection, enabled: false };
      document.documentElement.classList.remove('live-connected');
      const badge = document.querySelector('#stage header .badge');
      if (badge) badge.textContent = notice ? 'Ukázková data · offline' : 'Ukázková data';
      return copy;
    }
    if (mode === 'sample') return sample();
    if (!hosted && config.camera?.source !== 'mobile') return config;
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), mode === 'live' ? 12000 : 1800);
    try {
      const response = await window.demoApiFetch('/api/status', { signal: abort.signal });
      if (!response.ok) throw new Error('Živý server neodpovídá. Zkontrolujte připojení Macu.');
      const status = await response.json();
      if (mode !== 'live' && (!status.connected || status.lastFrameAgeMs >= 5000)) return sample();
      if (!status.analysis?.configured) throw new Error('Na Macu není nastavený klíč Claude. Doplňte jej a obnovte stránku.');
      copy.analysis = { ...copy.analysis, mode: 'claude', quantityMode: 'scale', weightSource: 'scale_display' };
      copy.camera = { ...copy.camera, source: 'mobile' };
      copy.detection = { ...copy.detection, enabled: true };
      document.documentElement.classList.add('live-connected');
      const badge = document.querySelector('#stage header .badge');
      if (badge) badge.textContent = 'Živé měření';
      return copy;
    } catch (error) {
      document.documentElement.classList.remove('live-connected');
      // A live connection failure must never trap the presenter in a dead end.
      // Make the data source explicit and allow the complete manual walkthrough.
      const url = new URL(location.href);
      url.searchParams.set('mode', 'sample');
      url.searchParams.delete('phone');
      history.replaceState(null, '', url.pathname + url.search + url.hash);
      return sample('Živé spojení není dostupné. Pokračujte šipkami s ukázkovými daty, nebo zkuste znovu Živé měření.');
    } finally { clearTimeout(timer); }
  };

  window.renderPhoneQR = function (url) {
    const box = document.getElementById('phone-qr');
    if (!box || !url || qrValue === url) return;
    box.replaceChildren();
    qrValue = null;
    try {
      const link = new URL(url);
      if (!['https:', 'http:'].includes(link.protocol)) return;
      if (typeof window.QRCode !== 'function') throw new Error();
      new window.QRCode(box, { text: url, width: 288, height: 288, colorDark: '#111111', colorLight: '#ffffff', correctLevel: window.QRCode.CorrectLevel.M });
      // Avoid an unnecessary URL tooltip over the QR.
      box.removeAttribute('title');
      qrValue = url;
    } catch {
      box.textContent = 'QR kód se nepodařilo vytvořit. Použijte odkaz vedle.';
    }
  };

  function init() {
    if (!hosted) return;
    const phoneDescription = document.getElementById('phone-description');
    if (phoneDescription) phoneDescription.textContent = 'Namiřte zadní kameru na talíř a displej váhy. Obraz se přes zabezpečené internetové spojení přenáší do prezentace; analyzované snímky zpracuje Claude.';
    const troubleshooting = document.getElementById('phone-troubleshooting');
    if (troubleshooting) {
      troubleshooting.replaceChildren();
      const summary = document.createElement('summary'); summary.textContent = 'Nefunguje kamera nebo připojení?'; troubleshooting.append(summary);
      for (const text of [
        'Povolte kameru pro tuto stránku. Telefon může být na Wi-Fi i mobilních datech; Mac musí zůstat zapnutý a připojený k internetu.',
        'Pokud přenos nefunguje, otevřete nový QR kód z prezentace. Telefon během přenosu nezamykejte. Po návratu z pozadí kameru zapněte znovu.'
      ]) { const p = document.createElement('p'); p.textContent = text; troubleshooting.append(p); }
    }
    const instructions = document.getElementById('phone-instructions');
    if (instructions) instructions.textContent = 'Naskenujte QR kód telefonem a povolte zadní kameru. Telefon může používat Wi-Fi nebo mobilní data.';
    const localNote = document.getElementById('phone-local-note');
    if (localNote) localNote.textContent = 'Mac s živým serverem musí zůstat zapnutý a online. Kamera se přenáší přes internet; vybrané snímky se odesílají do Claude API.';
    if (!document.getElementById('stage')) return;
    const nav = document.querySelector('footer nav');
    if (!nav || document.getElementById('live-connect-button')) return;
    const button = document.createElement('button');
    button.id = 'live-connect-button';
    button.textContent = 'Obnovit připojení';
    button.type = 'button';
    button.onclick = () => location.reload();
    nav.append(button);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
