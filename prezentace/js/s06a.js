/* 06a · dva talíře → data. Krok 1 sken talíře 1 → analýza, 2 talíř 2 → dojedeno, 3 oba talíře jako dvě tečky (nic se nehýbe),
   4 kolem dvou teček (naše talíře, stojí na místě) pomalu doroste den (412 talířů), 5 den se zmenší do políčka kalendáře
   a přibudou dny 2–10 (canvas), 6 dny 11–20 + rámečky dnů se špenátem.
   Třídy na sekci: t2, skenuje, detekce, v1, v2, spoj, den, tydny, siroka, tecky-hned. Skok/tisk = konečný stav bez animace. */
(function () {
  'use strict';
  const s = document.getElementById('s-dva-talire');
  if (!s) return;
  let data = { talir1: { slozky: [{ nazev: 'Knedlík', g: 90 }, { nazev: 'Guláš', g: 60 }], porce_g: 400 }, talir2: { g: 4 } };
  try { data = JSON.parse(s.querySelector('.dt-data').textContent); } catch (e) {}
  const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const nastav = (sel, v) => { const e = s.querySelector(sel); e.dataset.pocitej = v; e.dataset.od = 0; return e; };
  const c1 = nastav('.dt-g1', 0), c2 = nastav('.dt-g2', 0), cp = nastav('.dt-snedeno', 0);
  let g1 = 0, g2 = 0, snedeno = 0;
  /* talíř 1 a 2: živě z dema (deck-bridge.js), jinak záložní čísla z .dt-data */
  const zive = { reference: null, leftover: null };
  function talir1() {
    const z = zive.reference;
    if (z && z.stav === 'hotovo') return { jidlo: z.jidlo, slozky: (z.slozky || []).filter(x => x.g != null), g: z.netto ?? 0, zive: true };
    return { jidlo: 'Segedínský guláš s knedlíkem', slozky: data.talir1.slozky, g: data.talir1.slozky.reduce((a, x) => a + x.g, 0), zive: false };
  }
  function talir2() {
    const z = zive.leftover;
    if (z && z.stav === 'hotovo') return { g: z.netto ?? 0, zive: true };
    return { g: data.talir2.g, zive: false };
  }
  function vykresliKarty() {
    const t1 = talir1(), t2 = talir2();
    g1 = t1.g; g2 = t2.g; snedeno = Math.max(0, Math.min(100, Math.round((1 - g1 / data.talir1.porce_g) * 100)));
    s.querySelector('.dt-jidlo').textContent = t1.jidlo;
    const max = Math.max(1, ...t1.slozky.map(y => y.g));
    s.querySelector('.dt-slozky').innerHTML = t1.slozky.map(x =>
      `<div class="dt-slozka"><span>${esc(x.nazev)}</span><i style="--podil:${x.g / max}"></i><b>${t1.zive ? '≈ ' : ''}${x.g} g</b></div>`).join('');
    s.querySelectorAll('.dt-k1 .dt-zdroj').forEach(e => { e.textContent = t1.zive ? 'živě' : 'ukázková data'; });
    s.querySelectorAll('.dt-k2 .dt-zdroj').forEach(e => { e.textContent = t2.zive ? 'živě' : 'ukázková data'; });
    const prazdny = g2 < 10;
    s.querySelector('.dt-h2').textContent = prazdny ? 'Prázdný talíř' : 'Zbytek na talíři';
    s.querySelector('.dt-verdikt').innerHTML = prazdny ? 'pod 10&nbsp;g = <span class="zelena">dojedeno</span>' : 'zbylo na talíři';
    [[c1, g1], [c2, g2], [cp, snedeno]].forEach(([e, v]) => { e.dataset.pocitej = v; });
    s.querySelector('.dr-l1').textContent = `${g1}\u00a0g zbytků`;
    s.querySelector('.dr-l2').textContent = prazdny ? 'dojedeno' : `${g2}\u00a0g zbytků`;
  }
  vykresliKarty();
  const kruh = s.querySelector('.kruh-hodnota');
  const stav = s.querySelector('.dt-stav-text');

  /* data: den = 412 talířů (38 % dojedeno), dny = kg zbytků z talířů (ukázková data, demo/data/month.json), 92,5 Kč/kg */
  const DNY = [32.9, 27.8, 35.1, 37.0, 32.1, 30.2, 37.0, 38.9, 37.3, 28.3, 29.6, 30.2, 37.6, 34.4, 34.3, 32.8, 39.4, 29.9, 29.9, 37.3];
  const KC_KG = 92.5, TALIRU = 412, DOJEDENO = 0.38;
  /* den: 26 × 16 teček; naše dva talíře stojí uprostřed a ostatní dorůstají od nich do stran */
  const tecky = s.querySelector('.dr-tecky'), SL = 26, RA = 16, P1 = 7 * SL + 12, P2 = 8 * SL + 12;
  const zelena = (i, den) => den === 0 ? ((i * 7919) % 100) < DOJEDENO * 100
    : ((((i + den * 977) * 7919) % 100) < 100 - (100 - DOJEDENO * 100) * DNY[den] / DNY[0]);
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

  /* kroky 5–6: kalendář 5 × 4 políček (Po–Pá, 4 týdny), každé políčko = jeden den = 412 teček ve stejném rozvržení jako den.
     Geometrie v px plochy 1180 × 700; políčko je den zmenšený faktorem M (proto plynulé převzetí z DOM mřížky). */
  const MEZ = 7, TD = (800 - (SL - 1) * MEZ) / SL, KROK_T = TD + MEZ, DEN_V = RA * TD + (RA - 1) * MEZ;
  const M = 0.26, BW = 800 * M, BH = DEN_V * M, BG = 16, KX = (1180 - (5 * BW + 4 * BG)) / 2, KY = 84;
  const blok = b => ({ x: KX + (b % 5) * (BW + BG), y: KY + Math.floor(b / 5) * (BH + BG) });
  tecky.style.setProperty('--do-bloku', `translate(${blok(0).x - 40}px, ${blok(0).y - 105}px) scale(${M})`);
  const SPENAT = [6, 11, 18]; /* dny 7, 12 a 19 (demo/data/month.json) */
  const kal = s.querySelector('.dr-kal');
  kal.innerHTML = ['Po', 'Út', 'St', 'Čt', 'Pá'].map((d, i) => `<p class="dr-den-tydne" style="left:${blok(i).x}px;width:${BW}px">${d}</p>`).join('') +
    SPENAT.map((b, i) => `<div class="dr-spenat" style="left:${blok(b).x - 6}px;top:${blok(b).y - 6}px;width:${BW + 12}px;height:${BH + 12}px;--zpozdeni:${1900 + i * 180}ms"><b>Špenát</b></div>`).join('');
  const platno = s.querySelector('.dr-mesic'), ctx = platno.getContext('2d'), DPR = 2;
  platno.width = 1180 * DPR; platno.height = 700 * DPR;
  const css = n => getComputedStyle(s).getPropertyValue(n).trim();
  /* pozice a barvy všech teček všech dní předpočítané: [x, y, barva(0 oranž, 1 zelená, 2 talíř 1), zpoždění v ms] */
  const TECKY = DNY.map((_, den) => {
    const o = blok(den), out = [];
    for (let i = 0; i < TALIRU; i++) {
      const r = Math.floor(i / SL), c = i % SL;
      const barva = den === 0 && i === P1 ? 2 : den === 0 && i === P2 ? 1 : zelena(i, den) ? 1 : 0;
      out.push([o.x + (c * KROK_T + TD / 2) * M, o.y + (r * KROK_T + TD / 2) * M, barva, Math.hypot(c - 12, r - 7.5) * 16]);
    }
    return out;
  });
  let anim = null;
  const pruh = (t, z, delka) => { const x = Math.min(1, Math.max(0, (t - z) / delka)); return 1 - Math.pow(1 - x, 3); };
  function kresliMesic(zacatky, t) {
    const barvy = [css('--oranz2'), css('--zelena-zivá'), css('--oranz')], R = TD / 2 * M;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, 1180, 700);
    let hotovo = true;
    for (let barva = 0; barva < 3; barva++) {
      ctx.beginPath();
      zacatky.forEach((z, den) => {
        if (z === null) return;
        for (const [x, y, b, zp] of TECKY[den]) {
          if (b !== barva) continue;
          const e = z === -1 ? 1 : pruh(t, z + zp, 380);
          if (e < 1) hotovo = false;
          if (e <= 0) continue;
          ctx.moveTo(x + R * e, y); ctx.arc(x, y, R * e, 0, Math.PI * 2);
        }
      });
      ctx.fillStyle = barvy[barva]; ctx.fill();
    }
    return hotovo;
  }
  /* zacatky[den]: null = není, -1 = už je, číslo = ms od začátku animace */
  function mesic(zacatky) {
    if (anim) cancelAnimationFrame(anim.raf);
    const t0 = performance.now();
    anim = { raf: 0 };
    const snimek = () => { if (!kresliMesic(zacatky, performance.now() - t0)) anim.raf = requestAnimationFrame(snimek); };
    snimek();
  }
  function stavMesice(k, hned, odkud) {
    const z = DNY.map(() => null);
    if (k < 5) { if (anim) cancelAnimationFrame(anim.raf); ctx.clearRect(0, 0, platno.width, platno.height); return; }
    const dnu = k >= 6 ? 20 : 10;
    for (let d = 0; d < dnu; d++) z[d] = -1;
    if (!hned && k === 5 && odkud === 4) { z[0] = 900; for (let d = 1; d < 10; d++) z[d] = 1000 + (d - 1) * 120; }
    if (!hned && k === 6 && odkud === 5) for (let d = 10; d < 20; d++) z[d] = 200 + (d - 10) * 120;
    mesic(z);
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
    if (aktualniK >= 1 && zive.reference?.stav === 'hotovo' && !s.classList.contains('v1')) { s.classList.add('v1'); pocitej(c1, false); pocitej(cp, false); kruh.style.strokeDasharray = `${snedeno} 100`; }
    if (aktualniK >= 2 && zive.leftover?.stav === 'hotovo' && !s.classList.contains('v2')) { s.classList.add('v2'); pocitej(c2, false); }
    if (s.classList.contains('v1')) { pocitej(c1, true); pocitej(cp, true); kruh.style.strokeDasharray = `${snedeno} 100`; }
    if (s.classList.contains('v2')) pocitej(c2, true);
  }
  /* QR pairing page does not load the demo or run any analysis. */
  const qrOkno = s.querySelector('.dt-qr-okno');
  s.querySelector('.dt-qr').addEventListener('click', () => {
    const u = new URL('pair.html', DEMO);
    qrOkno.querySelector('iframe').setAttribute('src', u.href); qrOkno.hidden = false;
  });
  s.querySelector('.dt-qr-zavrit').addEventListener('click', () => { qrOkno.hidden = true; qrOkno.querySelector('iframe').removeAttribute('src'); window.focus(); });

  function stavKroku(k, hned) {
    aktualniK = k;
    zrus();
    s.classList.remove('skenuje', 'detekce');
    s.classList.toggle('t2', k >= 2);
    s.classList.toggle('spoj', k >= 3);
    s.classList.toggle('den', k >= 4);
    s.classList.toggle('tydny', k >= 5);
    stav.textContent = k >= 2 ? 'Kamera nad pásem · talíř 2' : 'Kamera nad pásem · talíř 1';
    const ukaz1 = () => { s.classList.add('v1'); kruh.style.strokeDasharray = `${snedeno} 100`; pocitej(c1, hned); pocitej(cp, hned); };
    const ukaz2 = () => { s.classList.add('v2'); pocitej(c2, hned); };
    s.classList.toggle('siroka', k >= 5);
    stavMesice(k, hned, byl);
    if (k >= 4) pocitadlo(kgEl, hned ? KG[k] : KG[byl] || 0, KG[k], hned), pocitadlo(kcEl, hned ? KG[k] * KC_KG : (KG[byl] || 0) * KC_KG, KG[k] * KC_KG, hned);
    if (k < 4) s.classList.remove('tecky-hned'); else if (hned) s.classList.add('tecky-hned');
    umistiPopisky();
    byl = k;
    if (k < 1) { s.classList.remove('v1', 'v2'); kruh.style.strokeDasharray = '0 100'; return; }
    if (k < 2) s.classList.remove('v2');
    if (hned || k >= 4) { ukaz1(); if (k >= 2) ukaz2(); return; }
    const maVysledek = f => !pripojeno || !zive[f] || zive[f].stav === 'hotovo';
    if (k === 1) { s.classList.remove('v1'); s.classList.add('skenuje'); pozdeji(() => s.classList.add('detekce'), 700); pozdeji(() => { if (maVysledek('reference')) ukaz1(); cekani(); }, 1300); }
    if (k === 2) { ukaz1(); pozdeji(() => s.classList.add('skenuje'), 500); pozdeji(() => s.classList.add('detekce'), 1200); pozdeji(() => { if (maVysledek('leftover')) ukaz2(); cekani(); }, 1800); }
    /* záloha: když živá analýza do 20 s nedoběhne (mobil nepřipojen), ukážou se připravená čísla */
    const zaloha = (f, ukaz) => pozdeji(() => { if (!maVysledek(f)) { zive[f] = null; vykresliKarty(); s.querySelector(f === 'reference' ? '.dt-k1' : '.dt-k2').classList.remove('ceka'); ukaz(); } }, 20000);
    if (k === 1) zaloha('reference', ukaz1);
    if (k === 2) zaloha('leftover', ukaz2);
    if (k === 3) { ukaz1(); ukaz2(); }
  }
  s.addEventListener('krok', e => stavKroku(e.detail.k, e.detail.hned));
  addEventListener('resize', umistiPopisky);
  s.addEventListener('vstup', () => {pripoj();kamera.contentWindow?.postMessage({dojedeno:'aktivita',aktivni:true},'*');});
  s.addEventListener('odchod', () => {zrus();kamera.contentWindow?.postMessage({dojedeno:'aktivita',aktivni:false},'*');qrOkno.hidden=true;qrOkno.querySelector('iframe').removeAttribute('src');});
  s.addEventListener('tisk', () => stavKroku(6, true));
})();
