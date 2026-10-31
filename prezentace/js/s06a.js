/* 06a · dva talíře: krok 1 sken talíře 1 → analýza, krok 2 talíř 2 → dojedeno, krok 3 spojení do prvních bodů dat.
   Třídy na sekci: t2 (talíř 2 v kameře), skenuje, detekce, v1, v2 (výsledky), spoj (souhrn). Skok/tisk = konečný stav bez animace. */
(function () {
  'use strict';
  const s = document.getElementById('s-dva-talire');
  if (!s) return;
  let data = { talir1: { slozky: [{ nazev: 'Knedlík', g: 90 }, { nazev: 'Guláš', g: 60 }], porce_g: 400 }, talir2: { g: 4 } };
  try { data = JSON.parse(s.querySelector('.dt-data').textContent); } catch (e) {}
  const g1 = data.talir1.slozky.reduce((a, x) => a + x.g, 0), g2 = data.talir2.g;
  const snedeno = Math.round((1 - g1 / data.talir1.porce_g) * 100);
  s.querySelector('.dt-slozky').innerHTML = data.talir1.slozky.map(x =>
    `<div class="dt-slozka"><span>${x.nazev}</span><i style="--podil:${x.g / Math.max(...data.talir1.slozky.map(y => y.g))}"></i><b>${x.g} g</b></div>`).join('');
  const nastav = (sel, v) => { const e = s.querySelector(sel); e.dataset.pocitej = v; e.dataset.od = 0; return e; };
  const c1 = nastav('.dt-g1', g1), c2 = nastav('.dt-g2', g2), cs = nastav('.dt-gs', g1 + g2), cp = nastav('.dt-snedeno', snedeno);
  const kruh = s.querySelector('.kruh-hodnota');
  const stav = s.querySelector('.dt-stav-text');
  let casovace = [];
  const zrus = () => { casovace.forEach(clearTimeout); casovace = []; };
  const pozdeji = (f, ms) => casovace.push(setTimeout(f, ms));
  const pocitej = (e, hned) => window.pocitejCz && window.pocitejCz(e, hned);

  function stavKroku(k, hned) {
    zrus();
    s.classList.remove('skenuje', 'detekce');
    s.classList.toggle('t2', k >= 2);
    s.classList.toggle('spoj', k >= 3);
    stav.textContent = k >= 2 ? 'Kamera nad pásem · talíř 2' : 'Kamera nad pásem · talíř 1';
    const ukaz1 = () => { s.classList.add('v1'); kruh.style.strokeDasharray = `${snedeno} 100`; pocitej(c1, hned); pocitej(cp, hned); };
    const ukaz2 = () => { s.classList.add('v2'); pocitej(c2, hned); };
    if (k < 1) { s.classList.remove('v1', 'v2'); kruh.style.strokeDasharray = '0 100'; return; }
    if (k < 2) s.classList.remove('v2');
    if (hned) { ukaz1(); if (k >= 2) ukaz2(); if (k >= 3) pocitej(cs, true); return; }
    if (k === 1) { s.classList.remove('v1'); s.classList.add('skenuje'); pozdeji(() => s.classList.add('detekce'), 700); pozdeji(ukaz1, 1300); }
    if (k === 2) { ukaz1(); pozdeji(() => s.classList.add('skenuje'), 500); pozdeji(() => s.classList.add('detekce'), 1200); pozdeji(ukaz2, 1800); }
    if (k === 3) { ukaz1(); ukaz2(); pozdeji(() => pocitej(cs, false), 450); }
  }
  s.addEventListener('krok', e => stavKroku(e.detail.k, e.detail.hned));
  s.addEventListener('odchod', zrus);
  s.addEventListener('tisk', () => stavKroku(3, true));
})();
