/* 06a · dva talíře → data. Krok 1 sken talíře 1 → analýza, 2 talíř 2 → dojedeno, 3 spojení do dvou teček,
   4 tečky přeletí do mřížky a naroste den (412 talířů), 5 sloupce dnů 1–10, 6 dny 11–20 + co se vrací nejvíc.
   Třídy na sekci: t2, skenuje, detekce, v1, v2, spoj, den, tydny. Skok/tisk = konečný stav bez animace. */
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

  /* data: den = 412 talířů (38 % dojedeno), dny = kg zbytků z talířů (ukázková data, demo/data/month.json), 92,5 Kč/kg */
  const DNY = [32.9, 27.8, 35.1, 37.0, 32.1, 30.2, 37.0, 38.9, 37.3, 28.3, 29.6, 30.2, 37.6, 34.4, 34.3, 32.8, 39.4, 29.9, 29.9, 37.3];
  const KC_KG = 92.5, TALIRU = 412, DOJEDENO = 0.38;
  const tecky = s.querySelector('.dr-tecky');
  let h = '<i class="prvni p1" style="--n:0"></i><i class="prvni p2" style="--n:1"></i>';
  for (let i = 2; i < TALIRU; i++) h += `<i style="--n:${i}" class="${((i * 7919) % 100) < DOJEDENO * 100 ? 'z' : ''}"></i>`;
  tecky.innerHTML = h;
  const prvni = [...tecky.querySelectorAll('.prvni')], bodySouhrnu = [...s.querySelectorAll('.dt-souhrn .dt-bod')];
  const svg = s.querySelector('.dr-graf'), W = 1040, H = 290, Y0 = 230, MAX = 40, sirka = W / DNY.length;
  svg.innerHTML = DNY.map((kg, i) => {
    const v = kg / MAX * H;
    return `<rect x="${i * sirka + 6}" y="${Y0 + H - v}" width="${sirka - 12}" height="${v}" rx="6"/>` +
      (i % 5 === 4 ? `<text x="${i * sirka + sirka / 2}" y="${Y0 + H + 34}" text-anchor="middle">${i + 1}. den</text>` : '');
  }).join('');
  const sloupce = [...svg.querySelectorAll('rect')];
  const kgEl = s.querySelector('.dr-kg'), kcEl = s.querySelector('.dr-kc');
  const soucet = n => DNY.slice(0, n).reduce((a, b) => a + b, 0);
  const KG = { 3: 0, 4: 34, 5: soucet(10), 6: soucet(20) };

  let casovace = [], byl = 0;
  const zrus = () => { casovace.forEach(clearTimeout); casovace = []; };
  const pozdeji = (f, ms) => casovace.push(setTimeout(f, ms));
  const pocitej = (e, hned) => window.pocitejCz && window.pocitejCz(e, hned);
  function pocitadlo(el, od, cil, hned) { el.dataset.od = Math.round(od); el.dataset.pocitej = Math.round(cil); pocitej(el, hned); }

  /* FLIP: první dvě tečky mřížky začnou na místě teček ze souhrnu a doletí na své místo */
  function preletTecky() {
    const meritko = s.getBoundingClientRect().width / 1920 || 1;
    prvni.forEach((t, i) => {
      t.style.transition = 'none'; t.style.transform = 'none';
      const a = bodySouhrnu[i].getBoundingClientRect(), b = t.getBoundingClientRect();
      const dx = (a.left + a.width / 2 - (b.left + b.width / 2)) / meritko, dy = (a.top + a.height / 2 - (b.top + b.height / 2)) / meritko;
      const sk = a.width / Math.max(1, b.width);
      t.style.transform = `translate(${dx}px, ${dy}px) scale(${sk})`;
      t.getBoundingClientRect();
      t.style.transition = ''; t.style.transform = '';
    });
  }

  function stavKroku(k, hned) {
    zrus();
    s.classList.remove('skenuje', 'detekce');
    s.classList.toggle('t2', k >= 2);
    s.classList.toggle('spoj', k >= 3);
    s.classList.toggle('den', k >= 4);
    s.classList.toggle('tydny', k >= 5);
    stav.textContent = k >= 2 ? 'Kamera nad pásem · talíř 2' : 'Kamera nad pásem · talíř 1';
    const ukaz1 = () => { s.classList.add('v1'); kruh.style.strokeDasharray = `${snedeno} 100`; pocitej(c1, hned); pocitej(cp, hned); };
    const ukaz2 = () => { s.classList.add('v2'); pocitej(c2, hned); };
    /* sloupce: dny podle kroku, při postupu dopředu postupně */
    const dnu = k >= 6 ? 20 : k >= 5 ? 10 : 0;
    sloupce.forEach((r, i) => { r.style.transitionDelay = hned ? '0ms' : `${Math.max(0, i - (k >= 6 ? 10 : 0)) * 70 + 300}ms`; r.classList.toggle('je', i < dnu); });
    if (k >= 4) pocitadlo(kgEl, hned ? KG[k] : KG[byl] || 0, KG[k], hned), pocitadlo(kcEl, hned ? KG[k] * KC_KG : (KG[byl] || 0) * KC_KG, KG[k] * KC_KG, hned);
    if (k === 4 && byl === 3 && !hned) preletTecky();
    byl = k;
    if (k < 1) { s.classList.remove('v1', 'v2'); kruh.style.strokeDasharray = '0 100'; return; }
    if (k < 2) s.classList.remove('v2');
    if (hned || k >= 4) { ukaz1(); if (k >= 2) ukaz2(); if (k >= 3) pocitej(cs, true); return; }
    if (k === 1) { s.classList.remove('v1'); s.classList.add('skenuje'); pozdeji(() => s.classList.add('detekce'), 700); pozdeji(ukaz1, 1300); }
    if (k === 2) { ukaz1(); pozdeji(() => s.classList.add('skenuje'), 500); pozdeji(() => s.classList.add('detekce'), 1200); pozdeji(ukaz2, 1800); }
    if (k === 3) { ukaz1(); ukaz2(); pozdeji(() => pocitej(cs, false), 450); }
  }
  s.addEventListener('krok', e => stavKroku(e.detail.k, e.detail.hned));
  s.addEventListener('odchod', zrus);
  s.addEventListener('tisk', () => stavKroku(6, true));
})();
