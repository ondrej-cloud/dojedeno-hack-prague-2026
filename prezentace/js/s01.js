/* 01 · otevření (záloha bez WebGL): gastronádoba se nakloní a 31 % oběda se přelije do kbelíku, počítadlo 0 → 31 %.
   Při vstupu dopředu běží 4 s (po 600 ms), mezerník (krok 1), skok zpět a tisk ukážou rovnou konečný stav. */
(function () {
  'use strict';
  const s = document.getElementById('s-uvod');
  if (!s) return;
  const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SVG = 'http://www.w3.org/2000/svg';
  const nadoba = s.querySelector('.nadoba');
  const jidlo = s.querySelector('.jidlo-g');
  const odpad = s.querySelector('.odpad');
  const cisloEl = s.querySelector('.pocitadlo-cislo');
  const kousky = s.querySelector('.kousky');

  const POCET = 18, TRVANI = 4000, ZPOZDENI = 600;
  const POKLES = 74;                        /* hladina v nádobě klesne o 31 % hloubky 240: 280 → 354 */
  const DNO_KOSE = 648, STOUPANI = 168;     /* odpad v kbelíku: 648 → 480 */

  /* kousky jídla: start u pravého okraje nádoby, oblouk nad mezerou, dopad do kbelíku */
  const nahoda = (n => () => (n = (n * 16807) % 2147483647) / 2147483647)(7);
  const data = [];
  for (let n = 0; n < POCET; n++) {
    const c = document.createElementNS(SVG, 'circle');
    c.setAttribute('r', (8 + nahoda() * 7).toFixed(1));
    c.setAttribute('opacity', '0');
    kousky.appendChild(c);
    data.push({ c, start: 0.1 + n * (0.62 / POCET), cy: 120 + nahoda() * 60, kx: 1010 + nahoda() * 80, ky: 400 + nahoda() * 40 });
  }

  const omez = (x, a, b) => Math.max(a, Math.min(b, x));
  const hladke = u => u * u * (3 - 2 * u);

  function vykresli(p) {
    /* náklon: najede do 13 °, drží, vrátí se */
    const naklon = 13 * (hladke(omez(p / 0.14, 0, 1)) - hladke(omez((p - 0.82) / 0.16, 0, 1)));
    nadoba.setAttribute('transform', `rotate(${naklon.toFixed(2)} 700 250)`);
    const f = hladke(omez((p - 0.16) / 0.66, 0, 1));
    jidlo.setAttribute('transform', `translate(0 ${(POKLES * f).toFixed(1)})`);
    odpad.setAttribute('y', (DNO_KOSE - STOUPANI * f).toFixed(1));
    cisloEl.textContent = Math.round(31 * f);
    for (const d of data) {
      const u = (p - d.start) / 0.26;
      if (u <= 0 || u >= 1) { d.c.setAttribute('opacity', '0'); continue; }
      const t = Math.pow(u, 1.5), a = 1 - t;
      const x = a * a * 712 + 2 * a * t * 880 + t * t * d.kx;
      const yy = a * a * 262 + 2 * a * t * d.cy + t * t * d.ky;
      d.c.setAttribute('cx', x.toFixed(1));
      d.c.setAttribute('cy', yy.toFixed(1));
      d.c.setAttribute('opacity', u > 0.85 ? ((1 - u) / 0.15).toFixed(2) : '1');
    }
  }

  let raf = null, casovac = null;
  function zastav() { if (raf) cancelAnimationFrame(raf); raf = null; clearTimeout(casovac); casovac = null; }
  function hotovo() { zastav(); vykresli(1); }
  function spust() {
    zastav();
    /* běží-li filmové 3D otevření (js/uvod3d.js), 2D scéna je skrytá: jen konečný stav */
    if (s.classList.contains('kino')) { vykresli(1); return; }
    vykresli(0);
    if (REDUKCE) { vykresli(1); return; }
    casovac = setTimeout(() => {
      const t0 = performance.now();
      const tik = t => {
        const p = Math.min(1, (t - t0) / TRVANI);
        vykresli(p);
        raf = p < 1 ? requestAnimationFrame(tik) : null;
      };
      raf = requestAnimationFrame(tik);
    }, ZPOZDENI);
  }

  s.addEventListener('vstup', e => { if (e.detail.dopredu) spust(); else hotovo(); });
  s.addEventListener('krok', e => { if (e.detail.k >= 1 || e.detail.hned) hotovo(); });
  s.addEventListener('odchod', zastav);
  s.addEventListener('tisk', () => { hotovo(); s.dataset.k = '1'; });
  hotovo();
})();
