/* 01 · titul: obědy jedné školy (500 žáků) jako tečky, 1 tečka = 10 obědů. Po kroku 1 se postupně dokreslují:
   1 den (50) → 2 týdny (500) → 1 měsíc (1 000) → 1 rok (asi 190 školních dní, 9 500 teček = 95 000 obědů).
   Zelená = dojedeno, oranžová = v koši (31 %, přirovnání). Mřížka je pevná pro celý rok a kreslí se jen nové tečky
   (žádné mazání plátna), takže to neseká. */
(function () {
  'use strict';
  const s = document.getElementById('s-uvod');
  const box = s && s.querySelector('.tecky-rok');
  if (!box) return;
  const cv = box.querySelector('canvas'), ctx = cv.getContext('2d');
  const obdobi = box.querySelector('.tr-obdobi'), cislo = box.querySelector('.tr-cislo b');
  const NA_TECKU = 10;
  const ETAPY = [{ t: '1 den', n: 50, dur: 500 }, { t: '2 týdny', n: 500, dur: 900 }, { t: '1 měsíc', n: 1000, dur: 700 }, { t: '1 rok', n: 9500, dur: 2200 }];
  const MAX = ETAPY[ETAPY.length - 1].n;
  const W = cv.width, H = cv.height, PODIL = 0.31;
  const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = x => (window.cisloCz ? window.cisloCz(Math.round(x)) : Math.round(x).toLocaleString('cs-CZ'));
  const css = getComputedStyle(document.documentElement);
  const ZELENA = (css.getPropertyValue('--zelena') || '#248a3d').trim();
  const ORANZ = (css.getPropertyValue('--oranz') || '#c9601b').trim();

  /* pevná mřížka pro celý rok */
  const COLS = Math.ceil(Math.sqrt(MAX * W / H)), ROWS = Math.ceil(MAX / COLS);
  const CELL = Math.min(W / COLS, H / ROWS), R = CELL * 0.36;
  const nahoda = i => { let x = (i + 1) * 0x9E3779B1; x ^= x >>> 15; x = Math.imul(x, 0x85EBCA6B); x ^= x >>> 13; x = Math.imul(x, 0xC2B2AE35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
  const kos = new Uint8Array(MAX).map((_, i) => (nahoda(i) < PODIL ? 1 : 0));

  let nakresleno = 0;
  function dokresli(n) {
    n = Math.min(MAX, Math.round(n));
    if (n <= nakresleno) return;
    for (const [barva, k] of [[ZELENA, 0], [ORANZ, 1]]) {
      ctx.fillStyle = barva;
      ctx.beginPath();
      for (let i = nakresleno; i < n; i++) {
        if (kos[i] !== k) continue;
        const x = (i % COLS + 0.5) * CELL, y = (Math.floor(i / COLS) + 0.5) * CELL;
        ctx.moveTo(x + R, y); ctx.arc(x, y, R, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    nakresleno = n;
  }
  function vymaz() { ctx.clearRect(0, 0, W, H); nakresleno = 0; }
  function popis(etapa, n) { obdobi.textContent = etapa.t; cislo.textContent = fmt(n * NA_TECKU); }

  let raf = 0, casovac = 0;
  function zastav() { cancelAnimationFrame(raf); clearTimeout(casovac); }
  function etapa(i, hotovo) {
    const e = ETAPY[i], od = nakresleno, t0 = performance.now();
    obdobi.textContent = e.t;
    const krok = ted => {
      const u = Math.min(1, (ted - t0) / e.dur), k = 1 - Math.pow(1 - u, 2);
      const n = od + (e.n - od) * k;
      dokresli(n); cislo.textContent = fmt(Math.round(n) * NA_TECKU);
      if (u < 1) raf = requestAnimationFrame(krok); else if (hotovo) hotovo();
    };
    raf = requestAnimationFrame(krok);
  }
  function prehraj(hned) {
    zastav(); vymaz();
    if (hned || REDUKCE) { dokresli(MAX); popis(ETAPY[ETAPY.length - 1], MAX); return; }
    let i = 0;
    const dalsi = () => { if (++i < ETAPY.length) casovac = setTimeout(() => etapa(i, dalsi), 900); };
    etapa(0, dalsi);
  }
  function reset() { zastav(); vymaz(); popis(ETAPY[0], 0); }

  reset();
  s.addEventListener('krok', e => { if (e.detail.k >= 1) prehraj(e.detail.hned); else reset(); });
  s.addEventListener('vstup', () => { if (+(s.dataset.k || 0) >= 1) prehraj(true); else reset(); });
  s.addEventListener('odchod', zastav);
  s.addEventListener('tisk', () => { zastav(); vymaz(); dokresli(MAX); popis(ETAPY[ETAPY.length - 1], MAX); });
})();
