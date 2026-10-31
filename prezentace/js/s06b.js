/* 06b · živá ukázka: připojí demo z localhost:8080, při vstupu mu předá klávesnici (klikr), při odchodu ji vrátí decku.
   Když server neběží, ukáže návod a klávesy dál ovládají deck. */
(function () {
  'use strict';
  const s = document.getElementById('s-ukazka');
  if (!s) return;
  const DEMO = 'http://localhost:8080/';
  const ifr = s.querySelector('iframe.demo');
  const chyba = s.querySelector('.demo-chyba');
  let bezi = false, pokus = 0;

  function over() {
    const p = ++pokus;
    return fetch(DEMO, { mode: 'no-cors', cache: 'no-store' }).then(() => {
      if (p !== pokus) return bezi;
      bezi = true;
      chyba.hidden = true;
      if (!ifr.getAttribute('src')) ifr.setAttribute('src', DEMO);
      s.classList.add('demo-bezi');
      return true;
    }).catch(() => {
      if (p !== pokus) return bezi;
      bezi = false;
      s.classList.remove('demo-bezi');
      if (s.classList.contains('aktivni')) chyba.hidden = false;
      return false;
    });
  }
  over();

  let hlidac = null;
  s.addEventListener('vstup', () => {
    over().then(ok => { if (ok && s.classList.contains('aktivni')) setTimeout(() => { try { ifr.focus(); ifr.contentWindow.focus(); } catch (e) {} }, 250); });
    clearInterval(hlidac);
    hlidac = setInterval(() => { if (!bezi) over().then(ok => { if (ok && s.classList.contains('aktivni')) { try { ifr.focus(); ifr.contentWindow.focus(); } catch (e) {} } }); }, 2000);
  });
  s.addEventListener('odchod', () => { clearInterval(hlidac); chyba.hidden = true; try { ifr.blur(); } catch (e) {} window.focus(); });
})();
