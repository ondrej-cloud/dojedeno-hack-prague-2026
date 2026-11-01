/* Dojezeno · ovládání decku (podle decku z Děčína): slajdy a kroky, škálování plochy, vstup prvků po 70 ms, počítadla čísel,
   talíř jako ukazatel průběhu, poznámky řečníka se stopkami (N), černá (B), celá obrazovka (F), tisk do PDF, adresa #slajd.krok.
   Slajdové skripty (js/sNN.js) poslouchají na své sekci události: 'vstup' {dopredu}, 'krok' {k, hned}, 'odchod', 'tisk'. Bez knihoven. */
(function () {
  'use strict';
  const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LIMIT = 300;                                   /* délka pitche v sekundách: oranžově od LIMIT − 30, červeně od LIMIT */
  const plocha = document.querySelector('.plocha');
  const slajdy = Array.from(document.querySelectorAll('.slajd'));
  const N = slajdy.length;
  const hlavniN = slajdy.filter(s => !s.hasAttribute('data-zaloha')).length;
  const hudCas = document.getElementById('hud-cas');
  const poznamky = document.getElementById('poznamky');
  const cerna = document.getElementById('cerna');
  const prubeh = document.getElementById('prubeh');
  let i = -1, krok = 0, start = null, casovace = [];

  const cislo = (x, des) => x.toFixed(des || 0).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  window.cisloCz = cislo;

  /* škálování plochy 1920 × 1080 na okno */
  function meritko() {
    const s = Math.min(innerWidth / 1920, innerHeight / 1080);
    plocha.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px, ${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
    /* kolikrát zvětšit vrstvu, aby pokryla celé okno i mimo 16:9 (úvodní film bez pruhů na 16:10) */
    plocha.style.setProperty('--kryti', Math.max(innerWidth / 1920, innerHeight / 1080) / s);
  }
  addEventListener('resize', meritko);
  meritko();

  /* počítadla: data-pocitej="cíl", data-od, data-des (desetinná místa), data-trvani (ms) */
  function pocitej(span, hned) {
    const cil = parseFloat(span.dataset.pocitej), od = parseFloat(span.dataset.od || '0'), des = +(span.dataset.des || 0);
    const trvani = +(span.dataset.trvani || 1100);
    const vypis = v => { span.textContent = cislo(v, des); };
    if (hned || REDUKCE) { vypis(cil); return; }
    const t0 = performance.now();
    const tik = t => {
      const u = Math.min(1, (t - t0) / trvani), e = 1 - Math.pow(1 - u, 3);
      vypis(od + (cil - od) * e);
      if (u < 1) requestAnimationFrame(tik);
    };
    requestAnimationFrame(tik);
  }
  window.pocitejCz = pocitej;

  const kroku = s => +(s.dataset.kroky || 0);
  const posli = (s, typ, detail) => s.dispatchEvent(new CustomEvent(typ, { detail }));

  /* kroky uvnitř slajdu */
  function nastavKrok(k, hned) {
    const s = slajdy[i];
    krok = k;
    s.dataset.k = k;
    s.classList.toggle('hned', !!hned);
    s.querySelectorAll('[data-krok]').forEach(e => {
      const bylo = e.classList.contains('je'), bude = k >= +e.dataset.krok;
      e.classList.toggle('je', bude);
      if (bude && !bylo) {
        e.querySelectorAll('[data-pocitej]').forEach(sp => pocitej(sp, hned));
        if (e.matches('[data-pocitej]')) pocitej(e, hned);
      }
    });
    s.querySelectorAll('[data-jen-krok]').forEach(e => {
      const bylo = e.classList.contains('je'), bude = String(e.dataset.jenKrok).split(',').map(Number).includes(k);
      e.classList.toggle('je', bude);
      if (bude && !bylo) e.querySelectorAll('[data-pocitej]').forEach(sp => pocitej(sp, hned));
    });
    posli(s, 'krok', { k, hned: !!hned });
    if (hned) { s.getBoundingClientRect(); s.classList.remove('hned'); }
    ukazPoznamky();
  }

  function zrusCasovace() { casovace.forEach(clearTimeout); casovace = []; }
  function pozdeji(f, ms) { casovace.push(setTimeout(f, REDUKCE ? 0 : ms)); }

  /* prvky slajdu, které při vstupu dopředu nastupují po 70 ms: přímé děti slajdu; .rozbal se rozbalí na své děti;
     kroky, .bez-vstupu a skripty se přeskakují */
  function jednotky(s) {
    const ven = [];
    const pridej = e => {
      if (e.matches('[data-krok], [data-jen-krok], .bez-vstupu, script, style, .zdroj')) return;
      if (e.matches('.rozbal')) { Array.from(e.children).forEach(pridej); return; }
      ven.push(e);
    };
    Array.from(s.children).forEach(pridej);
    return ven;
  }

  function vstup(s, dopredu) {
    const hned = !dopredu || REDUKCE;
    s.classList.toggle('kresli', !hned);
    if (!hned) {
      const j = jednotky(s);
      j.forEach((e, n) => { e.style.setProperty('--zpozdeni', (n * 70) + 'ms'); e.classList.add('vstup'); });
      pozdeji(() => j.forEach(e => e.classList.remove('vstup')), j.length * 70 + 700);
    }
    s.querySelectorAll('[data-pocitej]').forEach(sp => { if (!sp.closest('[data-krok], [data-jen-krok]')) pocitej(sp, hned); });
    posli(s, 'vstup', { dopredu: !hned });
  }
  function odchod(s) {
    zrusCasovace();
    s.classList.remove('kresli');
    s.querySelectorAll('.vstup').forEach(e => e.classList.remove('vstup'));
    posli(s, 'odchod', {});
  }

  /* talíř vpravo nahoře: oblouk roste se slajdy, na titulu je skrytý (data-bez-prubehu) */
  function nastavPrubeh() {
    if (!prubeh) return;
    const oblouk = prubeh.querySelector('.jidlo');
    const delka = 2 * Math.PI * 34;
    const podil = hlavniN > 1 ? Math.min(1, i / (hlavniN - 1)) : 1;
    oblouk.style.strokeDasharray = delka;
    oblouk.style.strokeDashoffset = delka * (1 - podil);
    prubeh.classList.toggle('skryty', slajdy[i].hasAttribute('data-bez-prubehu'));
  }

  function prejdi(n, dozadu, cilovyKrok) {
    n = Math.max(0, Math.min(N - 1, n));
    if (n === i) { if (cilovyKrok !== undefined) nastavKrok(Math.min(cilovyKrok, kroku(slajdy[i])), true); return; }
    if (i >= 0) {
      const byl = slajdy[i];
      odchod(byl);
      byl.classList.remove('aktivni');
      byl.classList.add('odchazi');
      setTimeout(() => byl.classList.remove('odchazi'), 500);
    }
    i = n;
    const s = slajdy[i];
    s.classList.remove('odchazi');
    if (dozadu && !REDUKCE) { s.classList.add('zpet'); s.getBoundingClientRect(); }
    s.classList.add('aktivni');
    s.classList.remove('zpet');
    nastavPrubeh();
    const k = cilovyKrok !== undefined ? Math.min(cilovyKrok, kroku(s)) : (dozadu ? kroku(s) : 0);
    nastavKrok(k, true);
    vstup(s, !dozadu && cilovyKrok === undefined);
    history.replaceState(null, '', '#' + (i + 1) + (k ? '.' + k : ''));
  }
  function dalsi() {
    spustHodiny();
    if (!slajdy[i].dispatchEvent(new CustomEvent('pred-dalsi', { cancelable: true }))) return;
    if (krok < kroku(slajdy[i])) { nastavKrok(krok + 1); history.replaceState(null, '', '#' + (i + 1) + '.' + krok); }
    else prejdi(i + 1);
  }
  function predchozi() {
    spustHodiny();
    if (!slajdy[i].dispatchEvent(new CustomEvent('pred-predchozi', { cancelable: true }))) return;
    if (krok > 0) { nastavKrok(krok - 1); history.replaceState(null, '', '#' + (i + 1) + (krok ? '.' + krok : '')); }
    else prejdi(i - 1, true);
  }

  /* stopky od prvního posunu, jen v panelu poznámek */
  function spustHodiny() {
    if (start) return;
    start = Date.now();
    setInterval(() => {
      const s = Math.floor((Date.now() - start) / 1000);
      hudCas.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
      hudCas.className = s >= LIMIT ? 'pres' : s >= LIMIT - 30 ? 'pozor' : '';
    }, 500);
  }

  /* poznámky: každý slajd má <script type="application/json" class="poznamky-data">["čas · kdo", "odstavec", "[mezerník] …", "Zdroje: …"]</script> */
  function poznamkySlajdu(s) {
    const el = s.querySelector('script.poznamky-data');
    if (!el) return ['', ''];
    try { return JSON.parse(el.textContent); } catch (e) { return ['chyba v poznámkách', String(e)]; }
  }
  function ukazPoznamky() {
    if (poznamky.hidden || i < 0) return;
    const p = poznamkySlajdu(slajdy[i]);
    document.getElementById('poznamky-hlava-text').textContent =
      `${i + 1}/${N} · ${slajdy[i].dataset.nazev || ''} · ${p[0]}` + (kroku(slajdy[i]) ? ` · krok ${krok}/${kroku(slajdy[i])}` : '');
    const t = document.getElementById('poznamky-text');
    t.innerHTML = '';
    p.slice(1).forEach(odst => {
      const e = document.createElement('p');
      if (odst.startsWith('[')) e.className = 'krok';
      else if (odst.startsWith('Zdroje:')) e.className = 'zdroj-p';
      e.textContent = odst;
      t.appendChild(e);
    });
  }

  /* tisk: všechno odkryté, počítadla na cíli */
  function tisk() {
    slajdy.forEach(s => {
      s.classList.remove('kresli');
      s.querySelectorAll('.vstup').forEach(e => e.classList.remove('vstup'));
      s.querySelectorAll('[data-krok]').forEach(e => e.classList.add('je'));
      s.querySelectorAll('[data-pocitej]').forEach(sp => pocitej(sp, true));
      posli(s, 'tisk', {});
    });
  }
  addEventListener('beforeprint', tisk);

  addEventListener('keydown', e => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (!cerna.hidden && e.key !== 'b' && e.key !== 'B') { cerna.hidden = true; }
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': case ' ': case 'PageDown': case 'Enter': e.preventDefault(); dalsi(); break;
      case 'ArrowLeft': case 'ArrowUp': case 'PageUp': case 'Backspace': e.preventDefault(); predchozi(); break;
      case 'Home': e.preventDefault(); prejdi(0); break;
      case 'End': e.preventDefault(); prejdi(N - 1); break;
      case 'f': case 'F':
        if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen().catch(() => {});
        break;
      case 'n': case 'N': poznamky.hidden = !poznamky.hidden; ukazPoznamky(); break;
      case 'b': case 'B': cerna.hidden = !cerna.hidden; break;
      case 'Escape': if (!poznamky.hidden) poznamky.hidden = true; break;
    }
  });
  /* klepnutí posouvá, kromě interaktivních prvků (3D, posuvníky, vložené demo) */
  addEventListener('click', e => { if (!e.target.closest('a, button, input, label, select, iframe, .poznamky, [data-interaktivni]')) dalsi(); });

  /* vložené demo (iframe) hlásí konec a začátek svého scénáře: deck pak pokračuje dál nebo zpět */
  addEventListener('message', e => {
    const d = e.data;
    if (!d || typeof d !== 'object' || !d.dojedeno) return;
    if (!slajdy[i] || !slajdy[i].hasAttribute('data-demo')) return;
    window.focus();
    if (d.dojedeno === 'konec') dalsi();
    else if (d.dojedeno === 'zacatek') predchozi();
  });

  /* adresa #slajd nebo #slajd.krok (např. #3.2 = třetí slajd, druhý krok, hned v konečném stavu) */
  function zAdresy() {
    const m = location.hash.match(/^#(\d+)(?:\.(\d+))?$/);
    if (!m) return null;
    return { n: +m[1] - 1, k: m[2] !== undefined ? +m[2] : undefined };
  }
  addEventListener('hashchange', () => {
    const a = zAdresy();
    if (a && a.n >= 0 && a.n < N && (a.n !== i || (a.k !== undefined && a.k !== krok))) prejdi(a.n, false, a.k);
  });

  const a = zAdresy();
  if (a && a.n >= 0 && a.n < N) prejdi(a.n, false, a.k); else prejdi(0);
  if (new URLSearchParams(location.search).has('tisk')) tisk();

  window.deck = { prejdi, dalsi, predchozi, nastavKrok, tisk, pozdeji, get slajd() { return i; }, get krok() { return krok; } };
})();
