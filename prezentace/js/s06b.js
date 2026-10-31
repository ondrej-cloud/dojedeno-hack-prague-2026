/* 06b · živá ukázka: zavřená se chová jako obyčejný slajd (mezerník ji přeskočí). Klepnutí na náhled otevře demo
   z localhost:8080 přes celou plochu a předá mu klávesnici (klikr); křížek nebo odchod ze slajdu ho zavře a klávesnici
   vrátí decku. Když server neběží, ukáže návod a klávesy dál ovládají deck. */
(function () {
  'use strict';
  const s = document.getElementById('s-ukazka');
  if (!s) return;
  const DEMO = 'http://localhost:8080/';
  const ifr = s.querySelector('iframe.demo');
  const chyba = s.querySelector('.demo-chyba');
  let bezi = false, pokus = 0, hlidac = null;

  function over() {
    const p = ++pokus;
    return fetch(DEMO, { mode: 'no-cors', cache: 'no-store' }).then(() => {
      if (p !== pokus) return bezi;
      bezi = true;
      chyba.hidden = true;
      if (!ifr.getAttribute('src')) {
        const embedded = new URL(DEMO, document.baseURI);
        embedded.searchParams.set('mode', 'sample');
        ifr.setAttribute('src', embedded.href);
      }
      return true;
    }).catch(() => {
      if (p !== pokus) return bezi;
      bezi = false;
      if (s.classList.contains('otevreno')) chyba.hidden = false;
      return false;
    });
  }
  const predejKlavesnici = () => { try { ifr.focus(); ifr.contentWindow.focus(); } catch (e) {} };

  function otevri() {
    s.classList.add('otevreno');
    over().then(ok => { if (ok && s.classList.contains('otevreno')) setTimeout(predejKlavesnici, 250); });
    clearInterval(hlidac);
    hlidac = setInterval(() => { if (!bezi) over().then(ok => { if (ok && s.classList.contains('otevreno')) predejKlavesnici(); }); }, 2000);
  }
  function zavri() {
    clearInterval(hlidac);
    s.classList.remove('otevreno');
    chyba.hidden = true;
    try { ifr.blur(); } catch (e) {}
    window.focus();
  }

  s.querySelector('.otevrit').addEventListener('click', otevri);
  s.querySelector('.zavrit').addEventListener('click', zavri);
  s.addEventListener('vstup', zavri);
  s.addEventListener('odchod', zavri);
})();
