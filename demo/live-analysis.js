'use strict';
// Results belong to one immutable photo; manual corrections remain separate from AI data.
class LivePlateAnalysis {
 constructor(){this.weightSettings=null;this.reset();}
 reset(){this.pending?.abort();this.pending=null;this.epoch=(this.epoch||0)+1;this.states={reference:null,leftover:null};}
 settings(){
  if(!this.weightSettings){
   this.weightSettings={tareGrams:config?.measurement?.plateTareGrams??216,subtractPlate:config?.measurement?.subtractPlate!==false};
   try{const saved=JSON.parse(sessionStorage.getItem('dojedeno-weight-settings-v1'));if(saved&&Number.isFinite(saved.tareGrams)&&saved.tareGrams>=0&&saved.tareGrams<=50000&&typeof saved.subtractPlate==='boolean')this.weightSettings=saved;}catch{}
  }
  return this.weightSettings;
 }
 setSettings(tareGrams,subtractPlate){
  if(!Number.isFinite(tareGrams)||tareGrams<0||tareGrams>50000)return false;
  this.weightSettings={tareGrams,subtractPlate};
  try{sessionStorage.setItem('dojedeno-weight-settings-v1',JSON.stringify(this.weightSettings));}catch{}
  this.syncSettings();this.refresh(step===2?'reference':'leftover');return true;
 }
 syncSettings(){
  const settings=this.settings(),button=$('#weight-settings-button');
  if(button)button.textContent=settings.subtractPlate?`Talíř −${fmt(settings.tareGrams)} g`:'Váha vytárovaná';
  if($('#plate-tare'))$('#plate-tare').value=settings.tareGrams;
  if($('#subtract-plate'))$('#subtract-plate').checked=settings.subtractPlate;
 }
 phase(){return step===2?'reference':'leftover';}
 navigate(target){const phase=target===2?'reference':target===3||target===4?'leftover':null;if(this.pending&&this.pendingPhase!==phase){this.pending.abort();this.pending=null;this.epoch++;const state=this.states[this.pendingPhase];if(state?.status==='pending'){state.status='error';state.error='Analýza byla přerušena. Pořiďte nový snímek.';}}}
 measure(phase){const state=this.states[phase];return PlateMeasurement.derive(state?.result,{...this.settings(),manualGross:state?.manualGross});}
 grams(result){const phase=this.states.reference?.result===result?'reference':'leftover';return this.measure(phase).net;}
 ready(phase){const s=this.states[phase],m=this.measure(phase);return s?.status==='done'&&s.result.plateDetected&&m.valid&&(phase!=='reference'||m.net>0);}
 problem(phase){const state=this.states[phase],m=this.measure(phase);if(state?.status==='pending')return 'Čtu váhu a složení…';if(m.reason==='below_tare')return 'Údaj je menší než talíř · zkontrolujte odečet talíře';if(state?.status==='done'&&m.gross===null)return 'Potvrďte číslo z displeje nebo pořiďte nový snímek';return 'Zkuste nový snímek';}
 async capture(phase,canvas){
  const old=this.states[phase];if(old?.canvas===canvas&&old.status!=='error')return;
  this.pending?.abort();const epoch=++this.epoch;
  if(phase==='reference')this.states.leftover=null;
  const state={status:'pending',canvas,result:null,error:null,manualGross:null,requestId:crypto.randomUUID()};this.states[phase]=state;
  if(!canvas||!useCamera){state.status='error';state.error='Připojte kameru a pořiďte nový snímek.';this.refresh(phase);return;}
  if(phase==='leftover'&&!this.ready('reference')){state.status='error';state.error='Nejdřív načtěte plnou porci včetně hmotnosti jídla.';this.refresh(phase);return;}
  state.image=canvas.toDataURL('image/jpeg',.85).split(',')[1];
  const payload={requestId:state.requestId,phase,image:state.image};
  const detail=makeScaleDetail(canvas);
  if(detail)payload.scaleImage=detail.toDataURL('image/jpeg',.9).split(',')[1];
  if(phase==='leftover'){const ref=this.states.reference;payload.reference={image:ref.image,result:ref.result};}
  const controller=new AbortController();this.pending=controller;this.pendingPhase=phase;
  const timeout=setTimeout(()=>controller.abort(),75000);this.refresh(phase);
  try{
   const response=await (window.demoApiFetch||fetch)('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:controller.signal});
   const data=await response.json();
   if(epoch!==this.epoch)return;
   if(!response.ok)throw Error(typeof data.error==='string'?data.error:(data.error?.message||data.message||'Analýza není dostupná. Zkuste to znovu.'));
   if(!data.result||!Array.isArray(data.result.components))throw Error('Analýza nevrátila použitelný výsledek.');
   state.result=data.result;state.model=data.model;state.status='done';state.time=new Date().toLocaleTimeString('cs-CZ',{hour:'2-digit',minute:'2-digit'});
  }catch(error){if(epoch!==this.epoch)return;state.status='error';state.error=error.name==='AbortError'?'Analýza trvala příliš dlouho. Zkuste nový snímek.':error.message;}
  finally{clearTimeout(timeout);if(epoch===this.epoch){this.pending=null;this.refresh(phase);}}
 }
 confirmForm(phase,m){return `<form class="weight-confirm" data-confirm-weight="${phase}"><label for="gross-${phase}">Co ukazuje displej váhy?</label><div class="weight-confirm-row"><input id="gross-${phase}" name="grossGrams" type="number" inputmode="decimal" min="0" max="50000" step="any" required placeholder="Např. 263" value="${m.gross===null?'':m.gross}" aria-describedby="confirm-note-${phase}"><span>g</span><button type="submit">Potvrdit</button></div><p id="confirm-note-${phase}" class="note">${m.tare?`Talíř ${fmt(m.tare)} g odečteme automaticky.`:'Váha už je vytárovaná.'} Údaj označíme jako ruční.</p><p class="measurement-alert" data-weight-error role="alert" hidden></p></form>`;}
 panel(phase){
  const state=this.states[phase];
  if(!state)return '<div class="waiting"><div class="analysis-spinner"></div><h2>Připraveno k měření</h2><p class="note">Nejdřív vyfoťte plnou porci i displej váhy.</p></div>';
  if(state.status==='pending')return '<div class="waiting"><div class="analysis-spinner"></div><p class="eyebrow">Snímek zachycen</p><h2>Čtu váhu a složení.</h2><p class="note">Za chvíli uvidíte hmotnost samotného jídla.</p><div class="analysis-stages"><span class="done">Fotka</span><span class="active">Analýza</span><span>Výsledek</span></div></div>';
  if(state.status==='error')return `<div class="waiting"><p class="eyebrow">Zkusíme to znovu</p><h2>Snímek se nepodařilo zpracovat.</h2><p class="note">${esc(state.error)}</p><button data-new-analysis="${phase}">Pořídit nový snímek</button></div>`;
  const r=state.result,m=this.measure(phase),ref=this.measure('reference');
  const comparable=phase==='leftover'&&r.comparableToReference&&ref.net>0&&m.net!==null&&m.net<=ref.net;
  const percent=comparable?Math.round((1-m.net/ref.net)*100):null;
  const uncertain=m.source==='estimated'||ref.source==='estimated';
  const sourceText={display:'Odečet displeje',estimated:'Nejistý odečet · odhad',manual:'Ručně potvrzeno',missing:'Doplňte hmotnost'}[m.source];
  let message='';
  if(!r.plateDetected)message='Talíř není dostatečně vidět. Pořiďte nový snímek.';
  else if(m.reason==='below_tare')message=`Displej ukazuje méně než ${fmt(m.tare)} g. Pokud je váha už vytárovaná, vypněte odečet talíře.`;
  else if(phase==='reference'&&m.net===0)message='Plná porce má po odečtení talíře 0 g. Zkontrolujte nastavení váhy.';
  else if(phase==='leftover'&&!comparable&&m.valid)message='Tyto dvě porce nelze spolehlivě porovnat.';
  const components=m.components.map((c,i)=>`<div class="food-row" style="animation-delay:${i*65}ms"><span class="component-label">${esc(c.name)}${m.allocation?`<div class="component-share"><i style="width:${m.net?Math.min(100,c.estimatedGrams/m.net*100):0}%"></i></div>`:''}</span><span class="${m.allocation?'food-grams':'muted'}">${m.allocation?'≈ '+fmt(c.estimatedGrams)+' g':esc(c.amountDescription||'')}</span></div>`).join('');
  const allocationNote=m.allocation?`${r.massEstimateConfidence==='low'?'Velmi hrubý odhad AI.':'Odhad AI podle fotografie.'} Součet je hmotnost jídla bez talíře.`:m.valid?'Rozdělení gramů zatím nelze odhadnout.':'Po doplnění váhy se dopočítají gramy složek.';
  const name=(!r.dishName||/neurčen|neznám/i.test(r.dishName))?'Obsah vašeho talíře':r.dishName;
  const form=this.confirmForm(phase,m);
  const advance=this.ready(phase)&&(!autoEnabled||phase==='reference')?`<button class="primary-action" data-analysis-continue>${phase==='reference'?'Pokračovat ke zbytkům':'Zobrazit výsledek'}</button>`:'';
  return `<div class="analysis-head"><p class="eyebrow">${phase==='reference'?'Plná porce':'Zbytky na talíři'}</p><span class="measurement-source" data-source="${m.source}">${sourceText}</span></div><h2 class="dish-title">${esc(name)}</h2><div class="analysis-metrics"><div class="metric-primary"><strong class="big ${phase==='leftover'?'orange-text':'green'}">${m.net===null?'—':(m.source==='estimated'?'≈ ':'')+fmt(m.net)}<span class="metric-unit"> g</span></strong><p>Hmotnost jídla</p></div>${percent!==null?`<div class="metric-secondary"><strong class="big green">${uncertain?'≈ ':''}${percent}<span class="metric-unit"> %</span></strong><p>Snědeno podle váhy</p></div>`:''}</div><div class="weight-equation"><span>Displej <b>${m.gross===null?'—':fmt(m.gross)} g</b></span><i>−</i><span>Talíř <b>${fmt(m.tare)} g</b></span><i>=</i><span>Jídlo <b>${m.net===null?'—':fmt(m.net)} g</b></span></div>${message?`<p class="measurement-alert" role="status">${esc(message)}</p>`:''}${!m.valid?form:''}${components?`<div class="components-heading"><span>Rozdělení jídla</span><small>Odhad AI</small></div>${components}<p class="component-estimate-note">${allocationNote}</p>`:''}<div class="analysis-actions">${advance}<button data-new-analysis="${phase}">Nový snímek</button>${m.valid?`<details class="weight-correction"><summary>Opravit odečet</summary>${form}</details>`:''}</div>`;
 }
 refresh(phase){
  this.syncSettings();
  if((phase==='reference'&&step!==2)||(phase==='leftover'&&step!==3&&step!==4)){this.paintWeight();return;}
  const panel=$('#results');if(panel)panel.innerHTML=this.panel(phase);
  this.paintWeight();
  if(phase==='leftover'&&this.ready('leftover')&&autoEnabled&&step===3&&captured)go(4,true);
 }
 paintWeight(){
  if(!isLiveAnalysis()||step>4)return;
  this.syncSettings();
  const el=$('#weight'),status=$('#weight-status');if(!el||!status)return;
  const phase=step===2?'reference':'leftover',state=this.states[phase],m=this.measure(phase),grams=step===1?null:m.net;
  el.textContent=grams===null?'—':(m.source==='estimated'?'≈ ':'')+fmt(grams);
  status.textContent=state?.status==='pending'?'zpracovávám snímek':grams!==null?(m.tare?`bez talíře · −${fmt(m.tare)} g`:'váha je vytárovaná'):'hmotnost samotného jídla';
 }
}
const liveAnalysis=new LivePlateAnalysis();
document.addEventListener('click',event=>{
 const button=event.target.closest('[data-new-analysis]');
 if(button){const phase=button.dataset.newAnalysis;if(phase==='reference'){referenceRemoved=false;firstCapturedAt=performance.now();}snapshot();if(phase==='leftover'){step=3;captured=true;}else step=2;render();return;}
 if(event.target.closest('[data-analysis-continue]'))next();
 if(event.target.closest('#weight-settings-button')){liveAnalysis.syncSettings();const panel=$('#weight-settings');if(panel){panel.hidden=!panel.hidden;$('#weight-settings-button').setAttribute('aria-expanded',String(!panel.hidden));}}
 if(event.target.closest('#weight-settings-close')){$('#weight-settings').hidden=true;$('#weight-settings-button').setAttribute('aria-expanded','false');}
});
document.addEventListener('submit',event=>{
 const form=event.target.closest('[data-confirm-weight]');if(!form)return;event.preventDefault();
 const phase=form.dataset.confirmWeight,state=liveAnalysis.states[phase];if(!state?.result)return;
 const text=form.elements.grossGrams.value.trim(),value=Number(text),error=form.querySelector('[data-weight-error]');
 if(!text||!Number.isFinite(value)||value<0||value>50000){error.hidden=false;error.textContent='Zadejte číslo z displeje v gramech.';return;}
 state.manualGross=value;liveAnalysis.refresh(phase);
});
document.addEventListener('change',event=>{
 if(!event.target.matches('#plate-tare,#subtract-plate'))return;
 const input=$('#plate-tare'),value=Number(input.value);
 if(input.value.trim()&&liveAnalysis.setSettings(value,$('#subtract-plate').checked))input.setCustomValidity('');
 else{input.setCustomValidity('Zadejte hmotnost talíře od 0 do 50 000 g.');input.reportValidity();}
});
