/* 06a · dva talíře → data. Krok 1 sken talíře 1 → analýza, 2 talíř 2 → dojedeno, 3 oba talíře jako dvě tečky (nic se nehýbe),
   4 kolem dvou teček (naše talíře, stojí na místě) pomalu doroste den (412 talířů), 5 tečky dne se přelijí do prvního
   proužku souvislé plochy a zleva přirůstají dny 2–10 (canvas), 6 dny 11–20 + rámečky dnů se špenátem.
   Třídy na sekci: t2, skenuje, detekce, v1, v2, spoj, den, tydny, siroka, tecky-hned. Skok/tisk = konečný stav bez animace. */
(function () {
  'use strict';
  const s = document.getElementById('s-dva-talire');
  if (!s) return;
  /* natočené demo: výsledek analýzy Claude Opus 5.5 (assets/analyza-opus.json), gramy = váha − talíř */
  let data = { talir1: { jidlo: 'Ovoce, zelenina a croissant', slozky: [{ nazev: 'Nakousnuté jablko', g: 69 }, { nazev: 'Mrkev', g: 50 }, { nazev: 'Croissant', g: 33 }], vaha_g: 352, talir_g: 200 }, talir2: { jidlo: 'Prázdný talíř', vaha_g: 201, talir_g: 200 } };
  try { data = JSON.parse(s.querySelector('.dt-data').textContent); } catch (e) {}
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nastav = (sel, v) => { const e = s.querySelector(sel); e.dataset.pocitej = v; e.dataset.od = 0; return e; };
  const c1 = nastav('.dt-g1', 0), c2 = nastav('.dt-g2', 0);
  let g1 = 0, g2 = 0;
  /* talíř 1 a 2: živě z dema (deck-bridge.js), jinak záložní čísla z .dt-data */
  const zive = { reference: null, leftover: null };
  function talir1() {
    const z = zive.reference;
    if (z && z.stav === 'hotovo') return { jidlo: z.jidlo, slozky: (z.slozky || []).filter(x => x.g != null), g: z.netto ?? 0, zive: true };
    return { jidlo: data.talir1.jidlo, slozky: data.talir1.slozky, g: data.talir1.vaha_g - data.talir1.talir_g, vaha: data.talir1.vaha_g, talir: data.talir1.talir_g, zive: false };
  }
  function talir2() {
    const z = zive.leftover;
    if (z && z.stav === 'hotovo') return { g: z.netto ?? 0, zive: true };
    return { g: data.talir2.vaha_g - data.talir2.talir_g, vaha: data.talir2.vaha_g, zive: false };
  }
  function vykresliKarty() {
    const t1 = talir1(), t2 = talir2();
    g1 = t1.g; g2 = t2.g;
    if (t1.vaha != null) { s.querySelector('.dt-v1').textContent = t1.vaha; s.querySelector('.dt-t1').textContent = t1.talir; }
    s.querySelector('.dt-vypocet').hidden = t1.vaha == null;
    s.querySelector('.dt-jidlo').textContent = t1.jidlo;
    const max = Math.max(1, ...t1.slozky.map(y => y.g));
    s.querySelector('.dt-slozky').innerHTML = t1.slozky.map(x =>
      `<div class="dt-slozka"><span>${esc(x.nazev)}</span><i style="--podil:${x.g / max}"></i><b>≈ ${x.g} g</b></div>`).join('');
    s.querySelectorAll('.dt-k1 .dt-zdroj').forEach(e => { e.textContent = t1.zive ? 'živě' : s.classList.contains('ma-zaznam') ? 'záznam' : 'ukázková data'; });
    s.querySelectorAll('.dt-k2 .dt-zdroj').forEach(e => { e.textContent = t2.zive ? 'živě' : s.classList.contains('ma-zaznam') ? 'záznam' : 'ukázková data'; });
    const prazdny = g2 < 10;
    s.querySelector('.dt-h2').textContent = prazdny ? 'Prázdný talíř' : 'Zbytek na talíři';
    s.querySelector('.dt-verdikt').innerHTML = prazdny ? 'pod 10&nbsp;g = <span class="zelena">dojedeno</span>' : 'zbylo na talíři';
    [[c1, g1], [c2, g2]].forEach(([e, v]) => { e.dataset.pocitej = v; });
    s.querySelector('.dr-l1').textContent = `${g1}\u00a0g zbytků`;
    s.querySelector('.dr-l2').textContent = prazdny ? 'dojedeno' : `${g2}\u00a0g zbytků`;
  }
  vykresliKarty();
  const stav = s.querySelector('.dt-stav-text');

  /* data: den = 412 talířů (38 % dojedeno), dny = kg zbytků z talířů (ukázková data, demo/data/month.json), 92,5 Kč/kg */
  const DNY = [32.9, 27.8, 35.1, 37.0, 32.1, 30.2, 37.0, 38.9, 37.3, 28.3, 29.6, 30.2, 37.6, 34.4, 34.3, 32.8, 39.4, 29.9, 29.9, 37.3];
  const KC_KG = 92.5, TALIRU = 412, DOJEDENO = 0.38;
  /* den: 26 × 16 teček; naše dva talíře stojí uprostřed a ostatní dorůstají od nich do stran */
  const tecky = s.querySelector('.dr-tecky'), SL = 26, RA = 16, P1 = 7 * SL + 12, P2 = 8 * SL + 12;
  /* barvy teček promíchané hashem (bez pruhů); den 1 má stejné barvy v mřížce i v proužku, ostatní podíl zbytků podle kg dne */
  const hash = (i, den) => { let h = Math.imul(i + 1, 0x9E3779B1) ^ Math.imul(den + 7, 0x85EBCA6B); h ^= h >>> 15; h = Math.imul(h, 0xC2B2AE35); h ^= h >>> 13; return (h >>> 0) % 100; };
  const zelena = (i, den) => den === 0 ? hash(i, 0) < DOJEDENO * 100
    : hash(i, den) < 100 - (100 - DOJEDENO * 100) * DNY[den] / DNY[0];
  let h = '';
  for (let i = 0; i < TALIRU; i++) {
    if (i === P1) { h += '<i class="prvni p1"></i>'; continue; }
    if (i === P2) { h += '<i class="prvni p2"></i>'; continue; }
    const r = Math.floor(i / SL), c = i % SL, vzd = Math.hypot(c - 12, r - 7.5);
    const d = Math.round(250 + vzd * 165 + ((i * 2654435761) % 997) / 997 * 260);
    h += `<i style="--d:${d}ms" class="${zelena(i, 0) ? 'z' : ''}"></i>`;
  }
  tecky.innerHTML = h;
  const prvni = [...tecky.querySelectorAll('.prvni')], popisky = [...s.querySelectorAll('.dr-popisek')];
  function umistiPopisky() {
    prvni.forEach((t, i) => {
      if (!t.offsetWidth) return;
      /* talíř 1 vlevo od své tečky, talíř 2 vpravo, ať se popisky nepřekrývají */
      const l = popisky[i], vlevo = tecky.offsetLeft + t.offsetLeft;
      const x = i === 0 ? vlevo - 22 - l.offsetWidth : vlevo + t.offsetWidth + 22, y = tecky.offsetTop + t.offsetTop + t.offsetHeight / 2;
      l.style.left = x + 'px'; l.style.top = (y - l.offsetHeight / 2) + 'px';
    });
  }

  /* kroky 5–6: jedna souvislá plocha teček. Každý den = proužek 7 × 59 teček (412 talířů) hned vedle předchozího,
     pod proužky jen dny v týdnu a týdny. Krok 5: tečky dne se plynule přelijí ze čtverce do prvního proužku a zleva
     doprava přirůstají dny 2–10; krok 6 dny 11–20 a rámečky dnů se špenátem. Geometrie v px plochy 1180 × 700. */
  const MEZ = 7, TD = (800 - (SL - 1) * MEZ) / SL, KROK_T = TD + MEZ;
  const SC = 7, SR = Math.ceil(TALIRU / SC), PT = 8, R_MALE = 3, PX = 30, PY = 92, PRUH = SC * PT;
  const SPENAT = [6, 11, 18]; /* dny 7, 12 a 19 (demo/data/month.json) */
  const kal = s.querySelector('.dr-kal'), DNY_T = ['Po', 'Út', 'St', 'Čt', 'Pá'];
  kal.innerHTML = DNY.map((_, d) => `<p class="dr-den" style="left:${PX + d * PRUH}px;top:${PY + SR * PT + 12}px;width:${PRUH}px">${DNY_T[d % 5]}</p>`).join('') +
    [0, 1, 2, 3].map(t => `<p class="dr-tyden" style="left:${PX + t * 5 * PRUH + 4}px;top:${PY + SR * PT + 48}px;width:${5 * PRUH - 8}px">${t + 1}.&nbsp;týden</p>`).join('') +
    SPENAT.map((d, i) => `<div class="dr-spenat" style="left:${PX + d * PRUH - 4}px;top:${PY - 6}px;width:${PRUH + 8}px;height:${SR * PT + 12}px;--zpozdeni:${1500 + i * 160}ms"><b>Špenát</b></div>`).join('');
  const popisDnu = [...kal.querySelectorAll('.dr-den')], popisTydnu = [...kal.querySelectorAll('.dr-tyden')];
  const platno = s.querySelector('.dr-mesic'), ctx = platno.getContext('2d'), DPR = 2;
  platno.width = 1180 * DPR; platno.height = 700 * DPR;
  const css = n => getComputedStyle(s).getPropertyValue(n).trim();
  /* tečky: [cílové x, y, barva (0 oranž, 1 zelená, 2 talíř 1), globální sloupec, řádek, výchozí x, y (jen den 1 = pozice ve čtverci)] */
  const TECKY = DNY.map((_, den) => {
    const out = [];
    for (let i = 0; i < TALIRU; i++) {
      const c = i % SC, r = Math.floor(i / SC);
      const barva = den === 0 && i === P1 ? 2 : den === 0 && i === P2 ? 1 : zelena(i, den) ? 1 : 0;
      out.push([PX + den * PRUH + c * PT + PT / 2, PY + r * PT + PT / 2, barva, den * SC + c, r,
        40 + (i % SL) * KROK_T + TD / 2, 105 + Math.floor(i / SL) * KROK_T + TD / 2]);
    }
    return out;
  });
  let anim = null;
  const omez = x => Math.min(1, Math.max(0, x));
  const ven = x => 1 - Math.pow(1 - x, 3), plynule = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  /* plan[den]: null = není, 'je' = hotový, {prelij: t} = den 1 se přelévá ze čtverce, {od: t, sl0} = přirůstá ve vlně zleva */
  function kresliMesic(plan, t) {
    const barvy = [css('--oranz2'), css('--zelena-zivá'), css('--oranz')];
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, 1180, 700);
    let hotovo = true;
    for (let barva = 0; barva < 3; barva++) {
      ctx.beginPath();
      plan.forEach((pl, den) => {
        if (!pl) return;
        for (const [x, y, b, gc, r, sx, sy] of TECKY[den]) {
          if (b !== barva) continue;
          let px = x, py = y, rad = R_MALE;
          if (pl.prelij !== undefined) {
            const e = plynule(omez((t - pl.prelij - (r * SC) * 0.45) / 1150));
            if (e < 1) hotovo = false;
            px = sx + (x - sx) * e; py = sy + (y - sy) * e; rad = TD / 2 + (R_MALE - TD / 2) * e;
          } else if (pl.od !== undefined) {
            const e = ven(omez((t - pl.od - (gc - pl.sl0) * 15 - r * 2.5) / 320));
            if (e < 1) hotovo = false;
            if (e <= 0) continue;
            rad = R_MALE * e;
          }
          ctx.moveTo(px + rad, py); ctx.arc(px, py, rad, 0, Math.PI * 2);
        }
      });
      ctx.fillStyle = barvy[barva]; ctx.fill();
    }
    return hotovo;
  }
  function mesic(plan) {
    if (anim) cancelAnimationFrame(anim.raf);
    const t0 = performance.now();
    anim = { raf: 0 };
    const snimek = () => { if (!kresliMesic(plan, performance.now() - t0)) anim.raf = requestAnimationFrame(snimek); };
    snimek();
  }
  function stavMesice(k, hned, odkud) {
    const dnu = k >= 6 ? 20 : k >= 5 ? 10 : 0;
    const plan = DNY.map((_, d) => d < dnu ? 'je' : null);
    let start = -1, zacatek = 0;
    if (!hned && k === 5 && odkud === 4) { plan[0] = { prelij: 0 }; start = 1; zacatek = 900; }
    if (!hned && k === 6 && odkud === 5) { start = 10; zacatek = 150; }
    if (start > 0) for (let d = start; d < dnu; d++) plan[d] = { od: zacatek, sl0: start * SC };
    /* popisky dnů a týdnů naskakují se svými proužky */
    popisDnu.forEach((p, d) => {
      const vlna = start > 0 && d >= start ? zacatek + (d - start) * SC * 15 + 150 : 0;
      p.style.transitionDelay = hned ? '0ms' : vlna + 'ms'; p.classList.toggle('je', d < dnu);
    });
    popisTydnu.forEach((p, t) => {
      const d = t * 5, vlna = start > 0 && d + 4 >= start ? zacatek + Math.max(0, d + 2 - start) * SC * 15 + 150 : 0;
      p.style.transitionDelay = hned ? '0ms' : vlna + 'ms'; p.classList.toggle('je', d < dnu);
    });
    if (k < 5) { if (anim) cancelAnimationFrame(anim.raf); ctx.clearRect(0, 0, platno.width, platno.height); return; }
    mesic(plan);
  }

  const kgEl = s.querySelector('.dr-kg'), kcEl = s.querySelector('.dr-kc');
  const soucet = n => DNY.slice(0, n).reduce((a, b) => a + b, 0);
  const KG = { 3: 0, 4: 34, 5: soucet(10), 6: soucet(20) };

  let casovace = [], byl = 0;
  const zrus = () => { casovace.forEach(clearTimeout); casovace = []; };
  const pozdeji = (f, ms) => casovace.push(setTimeout(f, ms));
  const pocitej = (e, hned) => window.pocitejCz && window.pocitejCz(e, hned);
  function pocitadlo(el, od, cil, hned) { el.dataset.od = Math.round(od); el.dataset.pocitej = Math.round(cil); pocitej(el, hned); }

  /* živé spojení: demo z localhost:8080 (z Netlify ../demo/) v režimu ?mode=live&vlozeno=kamera */
  const DEMO = location.protocol === 'file:' ? 'http://localhost:8080/' : new URL('../demo/', location.href).href;
  const kamera = s.querySelector('.dt-live');
  let pripojeno = false, aktualniK = 0;
  function pripoj() {
    fetch(DEMO, { mode: 'no-cors', cache: 'no-store' }).then(() => {
      // The frame itself reports whether actual mobile pixels are arriving.
      if (!kamera.getAttribute('src')) { const u = new URL(DEMO); u.searchParams.set('mode', 'live'); u.searchParams.set('vlozeno', 'kamera'); kamera.setAttribute('src', u.href); }

    }).catch(() => { pripojeno = false; s.classList.remove('live'); });
  }
  addEventListener('message', e => {
    const d = e.data;
    if(!d||typeof d!=='object')return;
    if(e.source===qrOkno.querySelector('iframe').contentWindow&&d.dojedeno==='mobil-pripojen'){if(!pripojeno){kamera.removeAttribute('src');pripoj();}return;}
    if(e.source!==kamera.contentWindow)return;
    if(d.dojedeno==='kamera'){pripojeno=!!d.pripojeno;s.classList.toggle('live',pripojeno);return;}
    if(d.dojedeno!=='talir'||!['reference','leftover'].includes(d.faze))return;
    zive[d.faze] = d;
    vykresliKarty();
    cekani();
  });
  /* krok 1/2 v živém režimu: dokud AI nedoběhne, karta ukazuje „Analyzuji…“ */
  function cekani() {
    const k1 = s.querySelector('.dt-k1'), k2 = s.querySelector('.dt-k2');
    const ceka = f => pripojeno && zive[f] && zive[f].stav !== 'hotovo';
    k1.classList.toggle('ceka', aktualniK >= 1 && ceka('reference'));
    k2.classList.toggle('ceka', aktualniK >= 2 && ceka('leftover'));
    if (aktualniK >= 1 && zive.reference?.stav === 'hotovo' && !s.classList.contains('v1')) { s.classList.add('v1'); pocitej(c1, false); }
    if (aktualniK >= 2 && zive.leftover?.stav === 'hotovo' && !s.classList.contains('v2')) { s.classList.add('v2'); pocitej(c2, false); }
    if (s.classList.contains('v1')) pocitej(c1, true);
    if (s.classList.contains('v2')) pocitej(c2, true);
  }
  /* QR pairing page does not load the demo or run any analysis. */
  const qrOkno = s.querySelector('.dt-qr-okno');
  s.querySelector('.dt-qr').addEventListener('click', () => {
    const u = new URL('pair.html', DEMO);
    qrOkno.querySelector('iframe').setAttribute('src', u.href); qrOkno.hidden = false;
  });
  s.querySelector('.dt-qr-zavrit').addEventListener('click', () => { qrOkno.hidden = true; qrOkno.querySelector('iframe').removeAttribute('src'); window.focus(); });

  /* záloha: klipy (nebo jen fotky) z mobilu; použijí se, jen když se opravdu načtou a živá kamera neběží */
  const zaznamy = [...s.querySelectorAll('.dt-zaznam')];
  const maZaznam = v => { v.classList.add('ok'); if (!s.classList.contains('ma-zaznam')) { s.classList.add('ma-zaznam'); vykresliKarty(); if (!s.classList.contains('live')) stav.textContent = stav.textContent.replace('Kamera nad pásem', 'Záznam z kamery'); } };
  zaznamy.forEach(v => {
    v.addEventListener('loadeddata', () => maZaznam(v));
    const foto = new Image(); foto.onload = () => maZaznam(v); foto.src = v.getAttribute('poster');
  });
  function prehraj(k, hned) {
    zaznamy.forEach((v, i) => {
      const muj = i === (k >= 2 ? 1 : 0);
      try {
        if (!muj || k >= 3 || s.classList.contains('live')) { v.pause(); return; }
        if (hned || k === 0) { v.pause(); v.currentTime = hned && v.duration ? Math.max(0, v.duration - 0.05) : 0; return; }
        v.currentTime = 0; const p = v.play(); if (p) p.catch(() => {});
      } catch (e) {}
    });
  }

  function stavKroku(k, hned) {
    aktualniK = k;
    zrus();
    s.classList.remove('skenuje', 'detekce');
    s.classList.toggle('t2', k >= 2);
    s.classList.toggle('spoj', k >= 3);
    s.classList.toggle('den', k >= 4);
    s.classList.toggle('tydny', k >= 5);
    stav.textContent = (s.classList.contains('ma-zaznam') && !s.classList.contains('live') ? 'Záznam z kamery' : 'Kamera nad pásem') + (k >= 2 ? ' · talíř 2' : ' · talíř 1');
    prehraj(k, hned);
    s.querySelector('.dt-vaha-g').textContent = k >= 2 ? talir2().vaha ?? '' : talir1().vaha ?? '';
    const ukaz1 = () => { s.classList.add('v1'); pocitej(c1, hned); };
    const ukaz2 = () => { s.classList.add('v2'); pocitej(c2, hned); };
    s.classList.toggle('siroka', k >= 5);
    stavMesice(k, hned, byl);
    if (k >= 4) pocitadlo(kgEl, hned ? KG[k] : KG[byl] || 0, KG[k], hned), pocitadlo(kcEl, hned ? KG[k] * KC_KG : (KG[byl] || 0) * KC_KG, KG[k] * KC_KG, hned);
    if (k < 4) s.classList.remove('tecky-hned'); else if (hned) s.classList.add('tecky-hned');
    umistiPopisky();
    byl = k;
    if (k < 1) { s.classList.remove('v1', 'v2', 'vazi'); return; }
    if (k < 2) s.classList.remove('v2');
    if (hned || k >= 3) s.classList.add('vazi');
    if (hned || k >= 4) { ukaz1(); if (k >= 2) ukaz2(); return; }
    const maVysledek = f => !pripojeno || !zive[f] || zive[f].stav === 'hotovo';
    /* natočené video: talíř se nejdřív položí (délka klipu), pak sken a výsledek */
    const vid = i => (s.classList.contains('ma-zaznam') && !s.classList.contains('live') && zaznamy[i].duration) ? Math.round(zaznamy[i].duration * 1000) : 0;
    const z1 = k === 1 ? vid(0) : 0, z2 = k === 2 ? vid(1) : 0;
    s.classList.remove('vazi');
    if (k === 1 || k === 2) pozdeji(() => s.classList.add('vazi'), Math.max(0, (k === 1 ? z1 : z2) - 250));
    if (k === 1) { s.classList.remove('v1'); pozdeji(() => s.classList.add('skenuje'), z1); pozdeji(() => s.classList.add('detekce'), z1 + 700); pozdeji(() => { if (maVysledek('reference')) ukaz1(); cekani(); }, z1 + 1300); }
    if (k === 2) { ukaz1(); pozdeji(() => s.classList.add('skenuje'), z2 || 500); pozdeji(() => s.classList.add('detekce'), (z2 || 500) + 700); pozdeji(() => { if (maVysledek('leftover')) ukaz2(); cekani(); }, (z2 || 500) + 1300); }
    /* záloha: když živá analýza do 20 s nedoběhne (mobil nepřipojen), ukážou se připravená čísla */
    const zaloha = (f, ukaz) => pozdeji(() => { if (!maVysledek(f)) { zive[f] = null; vykresliKarty(); s.querySelector(f === 'reference' ? '.dt-k1' : '.dt-k2').classList.remove('ceka'); ukaz(); } }, 20000);
    if (k === 1) zaloha('reference', ukaz1);
    if (k === 2) zaloha('leftover', ukaz2);
    if (k === 3) { ukaz1(); ukaz2(); }
  }
  s.addEventListener('krok', e => stavKroku(e.detail.k, e.detail.hned));
  addEventListener('resize', umistiPopisky);
  s.addEventListener('vstup', () => {kamera.contentWindow?.postMessage({dojedeno:'aktivita',aktivni:true},'*');});
  s.addEventListener('odchod', () => {zrus();zaznamy.forEach(v => v.pause());kamera.contentWindow?.postMessage({dojedeno:'aktivita',aktivni:false},'*');qrOkno.hidden=true;qrOkno.querySelector('iframe').removeAttribute('src');});
  s.addEventListener('tisk', () => stavKroku(6, true));
})();
