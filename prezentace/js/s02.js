/* 02 · pole 8 891 teček (1 tečka = 1 školní jídelna): v kroku 2 se vykreslí zleva doprava za 1,4 s, jinak hned nebo prázdné. */
(function () {
  'use strict';
  const s = document.getElementById('s-problem');
  if (!s) return;
  const REDUKCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const platno = s.querySelector('.tecky');
  const ctx = platno.getContext('2d');
  const POCET = 8891, SLOUPCU = 198, RADKU = Math.ceil(POCET / SLOUPCU);   /* 198 × 45 ≈ poměr plátna 1020 × 230 */
  const W = platno.width, H = platno.height;           /* 2× rozlišení CSS velikosti 1020 × 230 */
  const dx = W / SLOUPCU, dy = H / RADKU, r = Math.min(dx, dy) * 0.36;
  /* pořadí vykreslení: po sloupcích zleva, uvnitř sloupce mírně náhodně, ať to „naprší“ */
  const poradi = [];
  for (let n = 0; n < POCET; n++) {
    const sl = Math.floor(n / RADKU), ra = n % RADKU;
    poradi.push({ x: (sl + 0.5) * dx, y: (ra + 0.5) * dy, t: sl / SLOUPCU * 0.85 + ((n * 7919) % 97) / 97 * 0.15 });
  }
  poradi.sort((a, b) => a.t - b.t);

  let raf = null;
  function kresli(podil) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#a1a1a6';
    const kolik = Math.round(POCET * podil);
    ctx.beginPath();
    for (let n = 0; n < kolik; n++) { const b = poradi[n]; ctx.moveTo(b.x + r, b.y); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); }
    ctx.fill();
  }
  function zastav() { if (raf) cancelAnimationFrame(raf); raf = null; }
  function animuj() {
    zastav();
    if (REDUKCE) { kresli(1); return; }
    const t0 = performance.now(), T = 1400;
    const tik = t => {
      const u = Math.min(1, (t - t0) / T), e = 1 - Math.pow(1 - u, 2);
      kresli(e);
      raf = u < 1 ? requestAnimationFrame(tik) : null;
    };
    raf = requestAnimationFrame(tik);
  }
  s.addEventListener('krok', e => {
    if (e.detail.k >= 2) { if (e.detail.hned) { zastav(); kresli(1); } else animuj(); }
    else { zastav(); kresli(0); }
  });
  s.addEventListener('odchod', zastav);
  s.addEventListener('tisk', () => { zastav(); kresli(1); });
})();
