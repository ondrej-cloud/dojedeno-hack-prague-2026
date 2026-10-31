/* Dojedeno · jednodušší obrazovky dema ve stylu prezentace: přepíše dayView, monthView a solutionView z app.js
   (stejná data z config.json a data/month.json, jen jedna velká myšlenka na obrazovku). Klávesa S ukáže technické ovládání. */
(function () {
  'use strict';
  const kg = (x, d = 0) => fmt(x, d);
  const O = '#c9601b', O2 = '#efb68d', S = '#aeaeb2';

  dayView = function () {
    const d = config.day, total = d.plateKg + d.unservedKg + d.prepKg;
    const porce = d.unservedKg / config.referencePortionKg;
    const top = [...d.dishes].sort((a, b) => b.kg - a.kg)[0];
    const dily = [['Z talířů', d.plateKg, O], ['Nevydané', d.unservedKg, O2], ['Příprava', d.prepKg, S]];
    return title('Celý den', 'Jeden den v jídelně.', 'Ukázková data') +
      `<div class="dk-hero">
        <div class="dk-cislo oranz"><b>${count(d.plateKg)}<small>kg</small></b><p>zbytky z talířů · ${kg(d.plateKg * config.pricePerKg)} Kč za suroviny</p></div>
        <div class="dk-cislo seda" style="animation-delay:120ms"><b>${count(porce)}<small>porcí</small></b><p>nevydáno z gastronádob (${kg(d.unservedKg)} kg)</p></div>
        <div class="dk-cislo zelena" style="animation-delay:240ms"><b>${count(d.finishedPercent)}<small>%</small></b><p>talířů dojedeno</p></div>
      </div>
      <div class="dk-pruh">${dily.map(([n, v, c], i) => `<div style="width:${v / total * 100}%;background:${c};animation-delay:${400 + i * 120}ms">${Math.round(v / total * 100)} %</div>`).join('')}</div>
      <div class="dk-legenda">${dily.map(([n, v, c]) => `<span><i style="background:${c}"></i>${n} · ${kg(v)} kg</span>`).join('')}</div>
      <p class="dk-veta">Nejvíc dnes zbylo: <b>${esc(top.name)}</b> · ${kg(top.kg)} kg</p>`;
  };

  monthView = function () {
    const dny = month.days, max = Math.max(...dny.map(x => x.plateKg + x.unservedKg + x.prepKg));
    const W = 1000, H = 430, sirka = W / dny.length;
    const sloupce = dny.map((x, i) => {
      let y = H; return ['plateKg', 'unservedKg', 'prepKg'].map((k, j) => {
        const h = x[k] / max * (H - 20); y -= h;
        return `<rect class="sloupec" x="${i * sirka + 6}" y="${y}" width="${sirka - 12}" height="${h}" rx="5" fill="${[O, O2, S][j]}" style="animation-delay:${i * 45}ms"/>`;
      }).join('');
    }).join('');
    const hlavni = dishes.filter(x => x.type === 'main').sort((a, b) => b.plateKg / b.servedKg - a.plateKg / a.servedKg);
    const nej = hlavni[0];
    return title('Měsíc ve škole', 'Za měsíc je jasné, co se nejí.', 'Ukázková data') +
      `<div class="dk-mesic">
        <div class="dk-graf"><h2>20 školních dní · kg odpadu</h2><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Denní odpad: talíře, nevydané, příprava">${sloupce}</svg>
          <div class="dk-legenda"><span><i style="background:${O}"></i>z talířů</span><span><i style="background:${O2}"></i>nevydané</span><span><i style="background:${S}"></i>příprava</span></div></div>
        <div class="dk-nej"><h2>Nejčastěji se vrací</h2><p class="jidlo">${esc(nej.name)}</p>
          <div class="vraci">${count(nej.plateKg / nej.servedKg * 100)}<small>% porce</small></div>
          <ol>${hlavni.slice(1, 4).map(x => `<li><span>${esc(x.name)}</span><b>${kg(x.plateKg / x.servedKg * 100)} %</b></li>`).join('')}</ol></div>
      </div>
      <div class="dk-souhrn"><span>Za měsíc z talířů</span><strong>${count(totals.plateKg)} kg · ${count(totals.plateKg * config.pricePerKg)} Kč</strong><span>nevydáno ≈ ${kg(totals.unservedKg / config.referencePortionKg)} porcí</span></div>`;
  };

  solutionView = function () {
    const r = recommendations().slice(0, 3);
    const rocne = config.annualPlateCost * config.exampleReduction;
    return title('Řešení pro školu', 'Z dat rovnou opatření.', 'Příklad, ne slib') +
      `<div class="dk-opatreni">${r.map(([ikona, nazev, duvod, data], i) => `<article class="dk-karta" style="animation-delay:${200 + i * 350}ms"><span class="ikona">${ikona}</span><h2>${nazev}</h2><p>${duvod}</p><p class="data">${data}</p></article>`).join('')}</div>
      <div class="dk-souhrn zeleny"><span><span class="dk-priklad">Příklad</span>−${kg(config.exampleReduction * 100)} % odpadu z talířů</span><strong>${count(rocne)} Kč / rok</strong></div>`;
  };

  /* S = technické ovládání (párování mobilu, tárování talíře, auto, nápověda) */
  addEventListener('keydown', e => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.target.closest?.('input,textarea,select')) return;
    if (e.key === 's' || e.key === 'S') { document.body.classList.toggle('nastaveni'); e.preventDefault(); }
  });
})();
