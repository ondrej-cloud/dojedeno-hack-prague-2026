/* Most mezi demem a prezentací (slajd „Ukázka: dva talíře“). Aktivní jen s ?vlozeno=kamera nebo ?vlozeno=qr.
   kamera: demo ukazuje jen živý obraz z mobilu a samo (automatika) analyzuje talíř 1 (reference) a talíř 2 (leftover);
   každou změnu výsledku pošle rodiči: {dojedeno:'talir', faze, stav, jidlo, slozky:[{nazev,g}], netto}.
   qr: otevře párování mobilu. Rodič může poslat {dojedeno:'qr'} (párování) nebo {dojedeno:'reset'} (znovu od talíře 1). */
(function () {
  'use strict';
  const rezim = new URLSearchParams(location.search).get('vlozeno');
  if (!rezim) return;
  document.body.classList.add('vlozeno', 'vlozeno-' + rezim);
  const posli = zprava => { try { window.parent.postMessage(Object.assign({ dojedeno: 'talir' }, zprava), '*'); } catch (e) {} };
  let posledni = {};
  function vysledek(faze) {
    if (typeof liveAnalysis === 'undefined') return null;
    const st = liveAnalysis.states[faze];
    if (!st) return { faze, stav: 'ceka' };
    if (st.status !== 'done') return { faze, stav: st.status === 'error' ? 'chyba' : 'analyzuje' };
    const r = st.result || {}, m = liveAnalysis.measure(faze) || {};
    if(!m.valid||!r.plateDetected)return {faze,stav:'chyba',platne:false};
    const alok = m.components || [];
    const slozky = (alok || r.components || []).map(c => ({ nazev: c.name, g: c.estimatedGrams != null ? Math.round(c.estimatedGrams) : null }));
    return { faze, stav: 'hotovo', jidlo: r.dishName || 'Obsah talíře', slozky, netto: m.net != null ? Math.round(m.net) : null, platne: !!m.valid };
  }
  let spojeni = null;
  setInterval(() => {
    if(rezim==='kamera'&&typeof remoteFresh==='function'){const fresh=isLiveAnalysis()&&remoteFresh();if(fresh!==spojeni){spojeni=fresh;window.parent.postMessage({dojedeno:'kamera',pripojeno:fresh},'*');}}
    for (const faze of ['reference', 'leftover']) {
      const v = vysledek(faze);
      if (!v) continue;
      const klic = JSON.stringify(v);
      if (posledni[faze] !== klic) { posledni[faze] = klic; posli(v); }
    }
  }, 300);
  addEventListener('message', e => {
    const d = e.data;
    if (e.source!==window.parent||!d || typeof d !== 'object') return;
    if(d.dojedeno==='aktivita'&&typeof config!=='undefined'&&config){if(!d.aktivni)pauseAuto();else{autoEnabled=config.detection?.enabled!==false;captureGate?.reset();detector?.pause();updateAutoButton();}}
    if (d.dojedeno === 'qr') document.getElementById('phone-button')?.click();
    if (d.dojedeno === 'reset' && window.demo) { window.demo.go(1); posledni = {}; }
  });
})();
