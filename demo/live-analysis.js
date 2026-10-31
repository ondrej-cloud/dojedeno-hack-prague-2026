'use strict';
// Analysis is tied to the exact captured image; stale requests never update a new run.
class LivePlateAnalysis {
 constructor(){this.reset();}
 reset(){this.pending?.abort();this.epoch=(this.epoch||0)+1;this.states={reference:null,leftover:null};}
 phase(){return step===2?'reference':'leftover';}
 navigate(target){if(this.pending&&target!==2&&target!==3&&target!==4){this.pending.abort();this.epoch++;} }
 grams(result){const scale=result?.scaleReading;return scale?.visible&&scale.confidence!=='low'&&Number.isFinite(scale.grams)&&scale.grams>=0?scale.grams:null;}
 ready(phase){const s=this.states[phase],grams=this.grams(s?.result);return s?.status==='done'&&s.result.plateDetected&&grams!==null&&(phase!=='reference'||grams>0);}
 async capture(phase,canvas){
  const old=this.states[phase];if(old?.canvas===canvas&&old.status!=='error')return;
  this.pending?.abort();const epoch=++this.epoch;
  if(phase==='reference')this.states.leftover=null;
  const state={status:'pending',canvas,result:null,error:null,requestId:crypto.randomUUID()};this.states[phase]=state;
  if(!canvas||!useCamera){state.status='error';state.error='Nejdřív připojte živou kameru. Potom pořiďte nový snímek.';this.refresh(phase);return;}
  if(phase==='leftover'&&!this.ready('reference')){state.status='error';state.error='Nejdřív načtěte plnou porci v kroku 2 včetně displeje váhy.';this.refresh(phase);return;}
  state.image=canvas.toDataURL('image/jpeg',.85).split(',')[1];
  const payload={requestId:state.requestId,phase,image:state.image};
  if(phase==='leftover'){const ref=this.states.reference;payload.reference={image:ref.image,result:ref.result};}
  const controller=new AbortController();this.pending=controller;
  const timeout=setTimeout(()=>controller.abort(),55000);this.refresh(phase);
  try{
   const response=await (window.demoApiFetch||fetch)('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   const data=await response.json();
   if(epoch!==this.epoch)return;
   if(!response.ok)throw Error(typeof data.error==='string'?data.error:(data.error?.message||data.message||'Analýza není dostupná. Zkuste to znovu.'));
   if(!data.result||!Array.isArray(data.result.components))throw Error('Claude nevrátil použitelný výsledek.');
   state.result=data.result;state.model=data.model;state.status='done';state.time=new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'});
  }catch(error){if(epoch!==this.epoch)return;state.status='error';state.error=error.name==='AbortError'?'Analýza trvala příliš dlouho. Zkontrolujte internet a zkuste nový snímek.':error.message;}
  finally{clearTimeout(timeout);if(epoch===this.epoch){this.pending=null;this.refresh(phase);}}
 }
 panel(phase){
  const state=this.states[phase];
  if(!state)return '<div class="waiting"><div class="orb">◎</div><h2>Čekám na živou analýzu</h2><p class="note">Nejdřív zachyťte plnou porci a displej váhy v kroku 2.</p></div>';
  if(state.status==='pending')return '<div class="waiting"><div class="orb pulse">◎</div><h2>Claude analyzuje snímek…</h2><p class="note">Rozpoznávám jídlo a čtu displej váhy.</p><p class="status pulse">● živé API · čekám na odpověď</p></div>';
  if(state.status==='error')return `<div class="waiting"><div class="orb orange-text">!</div><h2>Analýza se nepodařila</h2><p>${esc(state.error)}</p><button data-new-analysis="${phase}">Zkusit nový snímek</button><p class="note">Žádné připravené výsledky se nepoužily.</p></div>`;
  const r=state.result,grams=this.grams(r),reference=this.states.reference?.result,referenceGrams=this.grams(reference);
  const comparable=phase==='leftover'&&r.comparableToReference&&referenceGrams>0&&grams!==null&&grams<=referenceGrams;
  const percent=comparable?Math.round((1-grams/referenceGrams)*100):null;
  const notes=[];
  if(!r.plateDetected)notes.push('Na snímku není spolehlivě rozpoznaný talíř.');
  else if(grams===null)notes.push('Displej váhy není spolehlivě čitelný. Přibližte jej do záběru a pořiďte nový snímek.');
  else if(phase==='reference'&&grams===0)notes.push('Pro srovnání nejdřív zachyťte plnou porci, nikoli prázdný talíř.');
  if(phase==='leftover'&&!comparable)notes.push('Podíl snědeného nelze z těchto dvou snímků spolehlivě spočítat.');
  if(r.confidence==='low')notes.push('Nízká jistota rozpoznání jídla.');
  if(r.notes)notes.push(r.notes);
  const components=r.components.slice(0,6).map(c=>`<div class="food-row"><span>${esc(c.name)}</span><span class="muted">${esc(c.amountDescription||'')}</span></div>`).join('');
  return `<p class="eyebrow">Claude · ${phase==='reference'?'plná porce':'talíř po obědě'}</p><h2 class="dish-title">${esc(r.dishName||'Jídlo se nepodařilo určit')}</h2>${components}<div class="analysis-metrics"><div><strong class="big ${phase==='leftover'?'orange-text':'green'}">${grams===null?'—':fmt(grams)+' g'}</strong><p>Údaj z displeje váhy</p></div>${percent!==null?`<div><strong class="big green">${percent} %</strong><p>Snědeno podle váhy</p></div>`:''}</div>${phase==='leftover'&&grams!==null?`<div class="total-line">Zbylo ${fmt(grams)} g · hodnota ~${fmt(foodCost(grams),2)} Kč</div>`:''}<p class="note analysis-note">${notes.map(esc).join(' ')||'Hmotnost přečtená z displeje. Váha musí být vytárovaná s prázdným talířem.'}</p><button data-new-analysis="${phase}">Nový snímek</button><p class="note">${esc(state.time||'')} · ${esc(state.model||'Claude')} · živá odpověď</p>`;
 }
 refresh(phase){
  if((phase==='reference'&&step!==2)||(phase==='leftover'&&step!==3&&step!==4))return;
  const panel=$('#results');if(panel)panel.innerHTML=this.panel(phase);
  this.paintWeight();
  if(phase==='leftover'&&this.ready('leftover')&&autoEnabled&&step===3&&captured)go(4,true);
 }
 paintWeight(){
  if(!isLiveAnalysis()||step>4)return;
  const el=$('#weight'),status=$('#weight-status');if(!el||!status)return;
  const phase=step===2?'reference':'leftover',state=this.states[phase];const grams=step===1?null:this.grams(state?.result);
  el.textContent=grams===null?'—':fmt(grams);status.textContent=state?.status==='pending'?'čtu displej…':grams!==null?'přečteno z displeje':'čekám na čitelný displej';
 }
}
const liveAnalysis=new LivePlateAnalysis();
document.addEventListener('click',event=>{const button=event.target.closest('[data-new-analysis]');if(!button)return;const phase=button.dataset.newAnalysis;snapshot();if(phase==='leftover'){step=3;captured=true;}else step=2;render();});
