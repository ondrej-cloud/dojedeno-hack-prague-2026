/* 06c · data rostou: 412 teček za jeden den (38 % dojedeno), pak sloupce kg zbytků z talířů za dny 1–10 a 11–20
   (ukázková data z demo/data/month.json) a počítadlo kg a Kč (cena surovin 92,5 Kč/kg = 37 Kč za oběd 400 g). */
(function () {
  'use strict';
  const s = document.getElementById('s-data-rostou');
  if (!s) return;
  const DNY = [32.9, 27.8, 35.1, 37.0, 32.1, 30.2, 37.0, 38.9, 37.3, 28.3, 29.6, 30.2, 37.6, 34.4, 34.3, 32.8, 39.4, 29.9, 29.9, 37.3];
  const KC_KG = 92.5, TALIRU = 412, DOJEDENO = 0.38;
  const tecky = s.querySelector('.dr-tecky');
  let h = '';
  for (let i = 0; i < TALIRU; i++) h += `<i style="--n:${i}" class="${((i * 7919) % 100) < DOJEDENO * 100 ? 'z' : ''}"></i>`;
  tecky.innerHTML = h;
  const svg = s.querySelector('.dr-graf'), W = 1040, H = 290, max = 40, sirka = W / DNY.length, Y0 = 230;
  svg.innerHTML = DNY.map((kg, i) => {
    const v = kg / max * H;
    return `<rect x="${i * sirka + 6}" y="${Y0 + H - v}" width="${sirka - 12}" height="${v}" rx="6" data-den="${i}"/>` +
      (i % 5 === 4 ? `<text x="${i * sirka + sirka / 2}" y="${Y0 + H + 34}" text-anchor="middle">${i + 1}. den</text>` : '');
  }).join('');
  const sloupce = [...svg.querySelectorAll('rect')];
  const kgEl = s.querySelector('.dr-kg'), kcEl = s.querySelector('.dr-kc');
  const soucet = n => DNY.slice(0, n).reduce((a, b) => a + b, 0);
  const STAVY = [{ kg: 34, dny: 1 }, { kg: soucet(10), dny: 10 }, { kg: soucet(20), dny: 20 }];
  let byl = 0;
  function pocitej(el, od, cil, hned) {
    el.dataset.od = Math.round(od); el.dataset.pocitej = Math.round(cil);
    window.pocitejCz ? window.pocitejCz(el, hned) : (el.textContent = Math.round(cil));
  }
  function krok(k, hned) {
    const st = STAVY[k];
    sloupce.forEach((r, i) => {
      const ma = k >= 1 && i < st.dny;
      if (hned) r.style.transitionDelay = '0ms';
      else r.style.transitionDelay = ma ? `${Math.max(0, i - (k === 2 ? 10 : 0)) * 70 + 250}ms` : '0ms';
      r.classList.toggle('je', ma);
    });
    s.classList.toggle('tecky-hned', !!hned && k === 0);
    pocitej(kgEl, hned ? st.kg : STAVY[byl].kg, st.kg, hned);
    pocitej(kcEl, hned ? st.kg * KC_KG : STAVY[byl].kg * KC_KG, st.kg * KC_KG, hned);
    byl = k;
  }
  s.addEventListener('krok', e => krok(e.detail.k, e.detail.hned));
  s.addEventListener('tisk', () => krok(2, true));
})();
