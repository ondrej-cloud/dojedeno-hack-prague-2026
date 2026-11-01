/* 01 · titul: obědy jedné školy (500 žáků) jako tečky. Po kroku 1 samy přibývají: 1 den (500) → 2 týdny (10 dní, 5 000)
   → 1 měsíc (20 dní, 10 000) → 1 rok (asi 190 školních dní, 95 000). Mřížka se při každém skoku plynule zahustí.
   Oranžově 31 % teček: tolik uvařeného jídla skončí v koši (jako by to byl každý třetí oběd). */
(function () {
  'use strict';
  const s = document.getElementById('s-uvod');
  const box = s && s.querySelector('.tecky-rok');
  if (!box) return;
  const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  const obdobi = box.querySelector('.tr-obdobi'), cislo = box.querySelector('.tr-cislo b');
  const ETAPY = [{ t: '1 den', n: 500 }, { t: '2 týdny', n: 5000 }, { t: '1 měsíc', n: 10000 }, { t: '1 rok', n: 95000 }];
  const W = cv.width, H = cv.height, PODIL = 0.31;
  const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = x => (window.cisloCz ? window.cisloCz(Math.round(x)) : Math.round(x).toLocaleString('cs-CZ'));
  const css = getComputedStyle(document.documentElement);
  const SEDA = '#d9d4cc', ORANZ = (css.getPropertyValue('--oranz') || '#c9601b').trim();

  /* pevná pseudonáhoda podle pořadí tečky (bez pruhů, při každém vykreslení stejná) */
  const nahoda = i => { let x = (i + 1) * 0x9E3779B1; x ^= x >>> 15; x = Math.imul(x, 0x85EBCA6B); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  function kresli(n) {
    n = Math.max(1, Math.round(n));
    const cols = Math.ceil(Math.sqrt(n * W / H)), rows = Math.ceil(n / cols);
    const cell = Math.min(W / cols, H / rows), r = Math.max(0.9, cell * 0.36);
    ctx.clearRect(0, 0, W, H);
    for (const [barva, kos] of [[SEDA, false], [ORANZ, true]]) {
      ctx.fillStyle = barva;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        if ((nahoda(i) < PODIL) !== kos) continue;
        const x = (i % cols + 0.5) * cell, y = (Math.floor(i / cols) + 0.5) * cell;
        if (r < 2) ctx.rect(x - r, y - r, r * 2, r * 2); else { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
      }
      ctx.fill();
    }
  }

  let raf = 0, casovac = 0;
  function zastav() { cancelAnimationFrame(raf); clearTimeout(casovac); }
  function ukaz(i, hned) {
    const cil = ETAPY[i], od = i ? ETAPY[i - 1].n : cil.n;
    obdobi.textContent = cil.t;
    if (hned || REDUKCE || i === 0) { kresli(cil.n); cislo.textContent = fmt(cil.n); return; }
    const t0 = performance.now(), DUR = 900;
    const krok = ted => {
      const u = Math.min(1, (ted - t0) / DUR), e = 1 - Math.pow(1 - u, 3);
      const n = Math.exp(Math.log(od) + (Math.log(cil.n) - Math.log(od)) * e);   /* logaritmicky, ať je skok plynulý */
      kresli(n); cislo.textContent = fmt(n);
      if (u < 1) raf = requestAnimationFrame(krok);
    };
    raf = requestAnimationFrame(krok);
  }
  function prehraj(hned) {
    zastav();
    if (hned || REDUKCE) { ukaz(ETAPY.length - 1, true); return; }
    let i = 0;
    ukaz(0);
    const dalsi = () => { i++; if (i >= ETAPY.length) return; ukaz(i); casovac = setTimeout(dalsi, 1700); };
    casovac = setTimeout(dalsi, 1500);
  }
  function reset() { zastav(); obdobi.textContent = ETAPY[0].t; cislo.textContent = fmt(ETAPY[0].n); kresli(ETAPY[0].n); }

  reset();
  s.addEventListener('krok', e => { if (e.detail.k >= 1) prehraj(e.detail.hned); else reset(); });
  s.addEventListener('vstup', () => { if (+(s.dataset.k || 0) >= 1) prehraj(true); else reset(); });
  s.addEventListener('odchod', zastav);
  s.addEventListener('tisk', () => { zastav(); ukaz(ETAPY.length - 1, true); });
})();
