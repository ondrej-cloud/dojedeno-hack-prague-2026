/* 06a · dva natočené talíře → přehled pro jídelnu. Krok 1 video talíře 1, obkroužení, analýza; 2 talíř 2 → dojedeno;
   3 oba talíře jako dvě tečky (nic se nehýbe); 4 tečky se rozvinou do dlaždic a plocha vyroste v přehled; 5 návrhy.
   Třídy na sekci: t2, skenuje, v1, v2, vazi, spoj, dash, navrhy, ma-zaznam, live. Skok/tisk = konečný stav bez animace. */
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

  /* dvě tečky z měření: mřížka 26 × 16 slouží jen k umístění obou teček doprostřed bílé plochy */
  const tecky = s.querySelector('.dr-tecky'), SL = 26, P1 = 7 * SL + 12, P2 = 8 * SL + 12;
  let h = '';
  for (let i = 0; i < 412; i++) h += i === P1 ? '<i class="prvni p1"></i>' : i === P2 ? '<i class="prvni p2"></i>' : '<i></i>';
  tecky.innerHTML = h;
  const prvni = [...tecky.querySelectorAll('.prvni')], popisky = [...s.querySelectorAll('.dr-popisek')];
  const morfy = [s.querySelector('.dd-t.m1'), s.querySelector('.dd-t.m2')];
  function umistiPopisky() {
    prvni.forEach((t, i) => {
      if (!t.offsetWidth) return;
      /* talíř 1 vlevo od své tečky, talíř 2 vpravo, ať se popisky nepřekrývají */
      const l = popisky[i], vlevo = tecky.offsetLeft + t.offsetLeft;
      const x = i === 0 ? vlevo - 22 - l.offsetWidth : vlevo + t.offsetWidth + 22, y = tecky.offsetTop + t.offsetTop + t.offsetHeight / 2;
      l.style.left = x + 'px'; l.style.top = (y - l.offsetHeight / 2) + 'px';
      /* dlaždice přehledu startují přesně na místě tečky (přehled leží na 80 × 236, plocha v kroku 3 na 80 × 252) */
      morfy[i].style.setProperty('--x0', vlevo + 'px');
      morfy[i].style.setProperty('--y0', (252 - 236 + tecky.offsetTop + t.offsetTop) + 'px');
      morfy[i].style.setProperty('--d0', t.offsetWidth + 'px');
    });
  }

  /* přehled: zbytky z talířů po dnech (ukázková data, demo/data/month.json), dny se špenátem tmavší */
  const DNY = [32.9, 27.8, 35.1, 37.0, 32.1, 30.2, 37.0, 38.9, 37.3, 28.3, 29.6, 30.2, 37.6, 34.4, 34.3, 32.8, 39.4, 29.9, 29.9, 37.3];
  const SPENAT = [6, 11, 18];
  const graf = s.querySelector('.dd-graf svg'), GW = 998, GH = 94, GY = 26, GMAX = 40, gs = GW / DNY.length;
  graf.innerHTML = DNY.map((kg, i) => {
    const v = kg / GMAX * GH, sp = SPENAT.includes(i);
    return `<rect class="${sp ? 'sp' : ''}" x="${i * gs + 5}" y="${GY + GH - v}" width="${gs - 10}" height="${v}" rx="5" style="transition-delay:${900 + i * 45}ms"/>` +
      (sp ? `<text class="sp" x="${i * gs + gs / 2}" y="16" text-anchor="middle">špenát</text>` : '');
  }).join('') + [0, 1, 2, 3].map(t => `<text x="${(t * 5 + 2.5) * gs}" y="${GY + GH + 30}" text-anchor="middle">${t + 1}. týden</text>`).join('');
  const cisla = [...s.querySelectorAll('.dd-n1, .dd-n2, .dd-n3')];

  let casovace = [], byl = 0;
  const zrus = () => { casovace.forEach(clearTimeout); casovace = []; };
  const pozdeji = (f, ms) => casovace.push(setTimeout(f, ms));
  const pocitej = (e, hned) => window.pocitejCz && window.pocitejCz(e, hned);

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
        if (k === 0) { v.pause(); v.currentTime = 0; return; }
        if (hned) { v.pause(); v.currentTime = v.duration ? Math.max(0, v.duration - 0.05) : 0; return; }
        v.currentTime = 0; const p = v.play(); if (p) p.catch(() => {});
      } catch (e) {}
    });
  }

  /* kroužek sleduje talíř ve videu. Polohy středu talíře (px videa 464 × 832) jsme odečetli ze snímků po 0,1–0,25 s,
     stop = kdy se talíř zastaví (pak se kroužek zvýrazní a vyjede analýza). Mezi body vede hladká křivka (Catmull-Rom). */
  const STOPY = [
    { stop: 1.55, body: [[0.17, 600, 360], [0.3, 480, 336], [0.45, 418, 312], [0.6, 378, 310], [0.75, 330, 312], [0.9, 294, 316], [1.05, 266, 320], [1.2, 254, 323], [1.35, 242, 326], [1.5, 222, 330], [1.62, 221, 330], [99, 221, 330]] },
    { stop: 1.6, body: [[0.13, 600, 312], [0.2, 544, 314], [0.3, 480, 314], [0.4, 425, 312], [0.5, 378, 310], [0.6, 342, 312], [0.7, 330, 314], [0.85, 302, 316], [1.0, 278, 320], [1.15, 264, 324], [1.3, 247, 328], [1.45, 232, 332], [1.6, 228, 332], [1.75, 226, 332], [99, 226, 332]] }
  ];
  const obrys = s.querySelector('.dt-obrys circle');
  let smycka = 0;
  function polohaTaliru(i, t) {
    const b = STOPY[i].body;
    if (t < b[0][0]) return null;
    let n = 0;
    while (n < b.length - 2 && t > b[n + 1][0]) n++;
    const P0 = b[Math.max(0, n - 1)], P1 = b[n], P2 = b[n + 1], P3 = b[Math.min(b.length - 1, n + 2)];
    const u = Math.min(1, Math.max(0, (t - P1[0]) / (P2[0] - P1[0])));
    const cr = (a, b1, c1, d) => 0.5 * (2 * b1 + (c1 - a) * u + (2 * a - 5 * b1 + 4 * c1 - d) * u * u + (3 * b1 - a - 3 * c1 + d) * u * u * u);
    return [cr(P0[1], P1[1], P2[1], P3[1]), cr(P0[2], P1[2], P2[2], P3[2])];
  }
  function umistiObrys(i, t) {
    const v = zaznamy[i], p = polohaTaliru(i, t);
    if (!p) { s.classList.remove('sleduje'); return; }
    const vw = v.videoWidth || 464, vh = v.videoHeight || 832, m = Math.min(880 / vw, 700 / vh);
    obrys.setAttribute('cx', ((880 - vw * m) / 2 + p[0] * m).toFixed(1));
    obrys.setAttribute('cy', ((700 - vh * m) / 2 + p[1] * m).toFixed(1));
    obrys.setAttribute('r', (146 * m).toFixed(1));
    s.classList.add('sleduje');
  }
  /* během přehrávání: kroužek jede s talířem; jakmile čas dojde k zastavení, zavolá poZastaveni (jednou) */
  function sleduj(i, poZastaveni) {
    cancelAnimationFrame(smycka);
    const v = zaznamy[i];
    let hotovo = false;
    const zastav = () => { if (hotovo) return; hotovo = true; umistiObrys(i, 99); poZastaveni(); };
    const snimek = () => {
      umistiObrys(i, v.currentTime);
      if (v.currentTime >= STOPY[i].stop) zastav();
      if (!hotovo || !v.paused) smycka = requestAnimationFrame(snimek);
    };
    snimek();
    pozdeji(zastav, (STOPY[i].stop + 1.2) * 1000);
  }

  function stavKroku(k, hned) {
    cancelAnimationFrame(smycka);
    s.classList.remove('sleduje', 'zachyceno');
    aktualniK = k;
    zrus();
    s.classList.remove('skenuje', 'detekce');
    s.classList.toggle('t2', k >= 2);
    s.classList.toggle('spoj', k >= 3);
    s.classList.toggle('dash', k >= 4);
    s.classList.toggle('navrhy', k >= 5);
    stav.textContent = (s.classList.contains('ma-zaznam') && !s.classList.contains('live') ? 'Záznam z kamery' : 'Kamera nad pásem') + (k >= 2 ? ' · talíř 2' : ' · talíř 1');
    prehraj(k, hned);
    s.querySelector('.dt-vaha-g').textContent = k >= 2 ? talir2().vaha ?? '' : talir1().vaha ?? '';
    /* výsledek talíře se počítá jen při prvním zobrazení; v dalších krocích už číslo stojí */
    const ukaz1 = () => { const uz = s.classList.contains('v1'); s.classList.add('v1'); pocitej(c1, hned || uz); };
    const ukaz2 = () => { const uz = s.classList.contains('v2'); s.classList.add('v2'); pocitej(c2, hned || uz); };
    /* čísla v dlaždicích naskočí, až se tečky rozvinou */
    if (k >= 4 && byl < 4 && !hned) cisla.forEach(e => { e.dataset.od = 0; e.textContent = '0'; pozdeji(() => pocitej(e, false), 800); });
    else if (k >= 4) cisla.forEach(e => pocitej(e, true));
    umistiPopisky();
    byl = k;
    if (k < 1) { s.classList.remove('v1', 'v2', 'vazi'); return; }
    if (k < 2) s.classList.remove('v2');
    if (hned || k >= 3) s.classList.add('vazi');
    if (hned && (k === 1 || k === 2) && s.classList.contains('ma-zaznam') && !s.classList.contains('live')) { umistiObrys(k - 1, 99); s.classList.add('zachyceno'); }
    if (hned || k >= 4) { ukaz1(); if (k >= 2) ukaz2(); return; }
    const maVysledek = f => !pripojeno || !zive[f] || zive[f].stav === 'hotovo';
    /* natočené video: kroužek sleduje talíř, při zastavení se zvýrazní, ukáže se váha a za chvíli analýza */
    const zaznam = s.classList.contains('ma-zaznam') && !s.classList.contains('live');
    s.classList.remove('vazi');
    if ((k === 1 || k === 2) && zaznam) {
      const i = k - 1, faze = i ? 'leftover' : 'reference', ukaz = i ? ukaz2 : ukaz1;
      if (k === 1) s.classList.remove('v1'); else ukaz1();
      sleduj(i, () => { s.classList.add('zachyceno', 'vazi'); pozdeji(() => { if (maVysledek(faze)) ukaz(); cekani(); }, 700); });
    } else {
      if (k === 1) { s.classList.remove('v1'); s.classList.add('skenuje'); pozdeji(() => { if (maVysledek('reference')) ukaz1(); cekani(); }, 1300); }
      if (k === 2) { ukaz1(); pozdeji(() => s.classList.add('skenuje'), 500); pozdeji(() => { if (maVysledek('leftover')) ukaz2(); cekani(); }, 1800); }
    }
    /* záloha: když živá analýza do 20 s nedoběhne (mobil nepřipojen), ukážou se připravená čísla */
    const zaloha = (f, ukaz) => pozdeji(() => { if (!maVysledek(f)) { zive[f] = null; vykresliKarty(); s.querySelector(f === 'reference' ? '.dt-k1' : '.dt-k2').classList.remove('ceka'); ukaz(); } }, 20000);
    if (k === 1) zaloha('reference', ukaz1);
    if (k === 2) zaloha('leftover', ukaz2);
    if (k === 3) { ukaz1(); ukaz2(); }
  }
  s.addEventListener('krok', e => stavKroku(e.detail.k, e.detail.hned));
  addEventListener('resize', umistiPopisky);
  s.addEventListener('vstup', () => {kamera.contentWindow?.postMessage({dojedeno:'aktivita',aktivni:true},'*');});
  s.addEventListener('odchod', () => {zrus();cancelAnimationFrame(smycka);zaznamy.forEach(v => v.pause());kamera.contentWindow?.postMessage({dojedeno:'aktivita',aktivni:false},'*');qrOkno.hidden=true;qrOkno.querySelector('iframe').removeAttribute('src');});
  s.addEventListener('tisk', () => stavKroku(5, true));
})();
