'use strict';
const $ = (s) => document.querySelector(s);
const fmt = (n, d=0) => new Intl.NumberFormat('cs-CZ',{maximumFractionDigits:d,minimumFractionDigits:d}).format(n);
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sum = (arr, key) => arr.reduce((n,x)=>n+(typeof key==='function'?key(x):x[key]),0);
let config, month, totals, dishes, step=1, captured=false, generation=0, stream=null, useCamera=true, cameraRequest=0, frozen=null;
const colors=['#30d158','#ff9f0a','#777784'];
const later = (fn, ms) => {const g=generation;setTimeout(()=>{if(g===generation)fn();},ms);};
function scale(){const s=Math.min(innerWidth/1920,innerHeight/1080);$('#stage').style.transform=`scale(${s})`;$('#stage').style.left=`${(innerWidth-1920*s)/2}px`;$('#stage').style.top=`${(innerHeight-1080*s)/2}px`;}
addEventListener('resize',scale);scale();
const count = (value, decimals=0) => `<span data-count="${value}" data-decimals="${decimals}">${fmt(value,decimals)}</span>`;
function animateCounts(){const g=generation;const nodes=[...document.querySelectorAll('[data-count]')];const start=performance.now();function tick(t){if(g!==generation)return;const progress=Math.min(1,(t-start)/800),ease=1-(1-progress)**3;nodes.forEach(n=>n.textContent=(n.dataset.prefix||'')+fmt(Number(n.dataset.count)*ease,Number(n.dataset.decimals||0)));if(progress<1)requestAnimationFrame(tick);}requestAnimationFrame(tick);}
function ring(pct,second=false){return `<svg class="ring" viewBox="0 0 220 220" aria-label="${fmt(pct)} procent"><circle class="track" cx="110" cy="110" r="90"/><circle class="value eaten ${second?'second':''}" cx="110" cy="110" r="90" style="--length:${565.5*pct/100}"/></svg>`;}
function bar(name,value,max,color=colors[0],suffix=' kg'){return `<div class="bar-row"><div class="bar-label"><span>${esc(name)}</span><span>${fmt(value,1)}${suffix}</span></div><div class="bar-track"><div class="bar-fill" style="width:${Math.min(100,value/max*100)}%;background:${color}"></div></div></div>`;}
function derive(){totals={plateKg:sum(month.days,'plateKg'),unservedKg:sum(month.days,'unservedKg'),prepKg:sum(month.days,'prepKg')};totals.kg=totals.plateKg+totals.unservedKg+totals.prepKg;totals.components={};for(const day of month.days)for(const [k,v]of Object.entries(day.components))totals.components[k]=(totals.components[k]||0)+v;const map=new Map();for(const day of month.days)for(const d of day.dishes){if(!map.has(d.id))map.set(d.id,{...d,plateKg:0,servedKg:0,unservedKg:0,days:0});const a=map.get(d.id);for(const k of ['plateKg','servedKg','unservedKg'])a[k]+=d[k];a.days++;}dishes=[...map.values()];}
function title(kicker,text,badge=''){return `<div class="title-row"><div><p class="eyebrow">${kicker}</p><h1>${text}</h1></div>${badge?`<span class="badge orange">${badge}</span>`:''}</div>`;}
function plateRows(kind){return config.plate[kind].map((d,i)=>`<div class="food-row" style="animation-delay:${i*150}ms"><span>${esc(d.name)}${d.pieces?` <span class="muted">${d.pieces} ks</span>`:''}</span><span>${fmt(d.grams)} g</span></div>`).join('');}
function componentRing(){const total=sum(config.plate.full,'grams');let offset=0;return `<svg class="ring" viewBox="0 0 220 220" aria-label="Složení plné porce">${config.plate.full.map((d,i)=>{const length=d.grams/total*565.5;const result=`<circle class="value" cx="110" cy="110" r="90" stroke-dashoffset="${-offset}" style="stroke:${colors[i%colors.length]};--length:${length}"/>`;offset+=length;return result;}).join('')}</svg>`;}
function isLiveAnalysis(){return config?.analysis?.mode==='claude';}
function fullResult(){if(isLiveAnalysis())return liveAnalysis.panel('reference');return `<p class="eyebrow">Ranní vzor · plná porce</p><h2 class="dish-title">${esc(config.menu[0])}</h2>${plateRows('full')}<div class="ring-row">${componentRing()}<div class="big">${fmt(sum(config.plate.full,'grams'))} g<p>Plná porce · 100 %</p></div></div><p class="note">Vzor pro dnešní měření.<br>Celková hmotnost pochází z váhy.</p>`;}
function leftoverResult(){if(isLiveAnalysis())return liveAnalysis.panel('leftover');const grams=sum(config.plate.leftover,'grams'),pct=Math.round((1-grams/sum(config.plate.full,'grams'))*100);return `<p class="eyebrow">Talíř č. 041 · hotovo</p><h2 class="dish-title">${esc(config.menu[0])}</h2>${plateRows('leftover')}<div class="ring-row">${ring(pct)}<div class="big green">${pct} %<p>Snědeno · zbylo ${fmt(grams)} g</p></div></div><div class="total-line">Vyhozeno <strong class="orange-text">${fmt(grams)} g · ${fmt(grams/1000*config.pricePerKg,2)} Kč</strong></div><div class="records"><h2>Dnešní záznamy</h2><div class="record"><span>${esc(config.plate.time)} · ${esc(config.menu[0])}</span><span>${fmt(grams)} g</span></div></div><p class="note">O dojedení rozhoduje váha, ne AI: přírůstek pod ${config.finishedThresholdGrams} g = dojedeno.</p>`;}
function live(){let result;if(step===1)result='<div class="waiting"><div class="orb">◎</div><h2>Čekám na talíř…</h2><p class="status pulse">● měřím</p></div>';else if(step===2)result='<div class="waiting"><div class="orb pulse">◎</div><h2>Rozpoznávám…</h2><p class="muted">Porovnávám s dnešním menu</p></div>';else if(step===3)result=`<div class="waiting"><div class="orb">↻</div><h2>${captured?'Vážím zbytek…':'Talíř se vrací z výdeje…'}</h2><p class="muted">${captured?'Čekám na ustálení váhy':'Vyměňte talíř pod kamerou.'}</p><p class="status">${captured?'● měřím':'Další stisk → pořídit snímek'}</p></div>`;else result=leftoverResult();if(isLiveAnalysis()&&(step===2||(step===3&&captured)))result=liveAnalysis.panel(step===2?'reference':'leftover');const scan=step===2||(step===3&&captured);return title('01 / Živě z jídelny','Každý talíř má svůj příběh.')+`<div class="live-layout"><div><div class="camera-box"><img src="assets/plate-${step>=3?'leftover':'full'}.jpg" alt="Zástupný obrázek ${step>=3?'zbytků':'plné porce'} na talíři"><video autoplay muted playsinline hidden></video><canvas class="remote-live" hidden></canvas><canvas class="snapshot" hidden></canvas><div class="plate-outline" hidden aria-label="Zachycený obrys objektu"></div><span class="camera-label">● <span id="source-label">Ukázková fotografie</span></span><span class="camera-caption" id="auto-status">${step===2?'Ranní referenční porce':step>=3?'Talíř po obědě':'Stanoviště 01 · pohled nad kbelík'}</span>${scan?'<div class="flash"></div><div class="scan"></div>':''}</div><div class="under-camera"><div class="menu"><strong>Dnešní menu</strong>${config.menu.map(esc).join(' · ')}</div><div class="weight">Váha: <span id="weight">${isLiveAnalysis()?'—':step===4?'+'+sum(config.plate.leftover,'grams'):0}</span> g<small id="weight-status">${isLiveAnalysis()?'čekám na displej':step===4?'ustáleno ✓':'připraveno'}</small></div></div></div><div class="panel results" id="results">${result}</div></div>`;}
function dayView(){const d=config.day,total=d.plateKg+d.unservedKg+d.prepKg;const stats=[['Talířů',d.plates,''],['Z talířů',d.plateKg,' kg'],['Nevydané z gastronádob',d.unservedKg,' kg'],['Příprava',d.prepKg,' kg']];return title('02 / Celý den','Z jednotlivých talířů je celý obraz.','Ukázková data')+`<div class="stats">${stats.map(([label,n,u],i)=>`<div class="panel stat"><p>${label}</p><div class="value ${i===0?'':'orange-text'}">${count(n)}${u}</div></div>`).join('')}</div><div class="day-bottom"><div class="panel"><h2>Která jídla dnes zbyla</h2>${d.dishes.map(x=>bar(x.name,x.kg,Math.max(...d.dishes.map(x=>x.kg)),colors[1])).join('')}</div><div class="panel"><h2>Odkud odpad pochází</h2>${stacked(d,total)}<div class="big green" style="margin-top:35px">${count(d.finishedPercent)} % <span style="font-size:25px;color:white;letter-spacing:0">talířů dojedeno</span></div><p class="note">Známe množství. Teď můžeme hledat příčinu.</p></div></div><div class="summary"><span>Celkem dnes</span><strong class="big orange-text">${count(total)} kg · ${count(total*config.pricePerKg)} Kč</strong></div>`;}
function stacked(d,total){let x=0;return `<svg class="segmented" viewBox="0 0 1000 33" preserveAspectRatio="none" role="img" aria-label="Rozdělení odpadu">${['plateKg','unservedKg','prepKg'].map((k,i)=>{const w=d[k]/total*1000;const s=`<rect x="${x}" y="0" width="${w}" height="33" fill="${colors[i]}"/>`;x+=w;return s;}).join('')}</svg><div class="legend">${['Talíře','Nevydané','Příprava'].map((s,i)=>`<span><i class="dot" style="background:${colors[i]}"></i>${s} ${fmt(d[['plateKg','unservedKg','prepKg'][i]]/total*100)} %</span>`).join('')}</div>`;}
function monthView(){const max=Math.ceil(Math.max(...month.days.map(d=>d.plateKg+d.unservedKg+d.prepKg))/20)*20;const chart=month.days.map((d,i)=>{let y=285;return `<g class="column" style="animation-delay:${i*40}ms">${['plateKg','unservedKg','prepKg'].map((key,j)=>{const h=d[key]/max*250;y-=h;return `<rect x="${55+i*43}" y="${y}" width="29" height="${h}" fill="${colors[j]}" rx="3"/>`;}).join('')}</g><text x="${69+i*43}" y="320" text-anchor="middle">${i+1}</text>`;}).join('');const top=dishes.filter(d=>d.type==='main').sort((a,b)=>b.plateKg+b.unservedKg-a.plateKg-a.unservedKg).slice(0,5);return title('03 / Měsíc ve škole','Data ukážou, kde začít.','Ukázková data')+`<div class="month-grid"><div class="panel"><h2>20 školních dní <span class="muted">/ kg odpadu</span></h2><svg class="month-chart" viewBox="0 0 950 340" role="img" aria-label="Denní odpad podle původu">${[0,max/2,max].map(v=>`<text x="0" y="${290-v/max*250}">${v}</text><line x1="48" x2="930" y1="${285-v/max*250}" y2="${285-v/max*250}" stroke="#ffffff12"/>`).join('')}${chart}</svg><div class="legend">${['Z talířů','Nevydané','Příprava'].map((s,i)=>`<span><i class="dot" style="background:${colors[i]}"></i>${s}</span>`).join('')}</div></div><div class="panel"><h2>5 nejčastěji vyhazovaných jídel</h2><div class="ranking-row muted"><span>Pokrm</span><span>Odpad</span><span>Vrací se</span></div>${top.map(d=>`<div class="ranking-row"><span class="name" title="${esc(d.name)}">${esc(d.name)}</span><span>${fmt(d.plateKg+d.unservedKg)} kg</span><span class="orange-text">${fmt(d.plateKg/d.servedKg*100)} %</span></div>`).join('')}<p class="note">Odpad = talíře + nevydané.<br>Vrací se = podíl z vydané hmotnosti.</p></div></div><div class="components">${Object.entries(totals.components).map(([name,n])=>`<div class="panel component">${name}<strong>${fmt(n)} kg <span class="muted">· ${fmt(n/totals.plateKg*100)} %</span></strong></div>`).join('')}</div><div class="summary"><span>Za měsíc</span><strong>${fmt(totals.kg/1000,1)} t jídla · ${fmt(totals.kg*config.pricePerKg)} Kč · ~${fmt(totals.kg*config.co2Factor/1000,1)} t CO₂e</strong></div><p class="note" style="text-align:right">CO₂e: orientační odhad · faktor ${fmt(config.co2Factor,1)} kg / kg jídla</p>`;}
function recommendations(){const a=month.assumptions,rice=dishes.find(d=>d.id==='main-2'),dill=dishes.find(d=>d.id==='main-0'),soups=dishes.filter(d=>['soup-1','soup-2'].includes(d.id));const portions=rice.unservedKg/rice.portionKg/rice.days,less=Math.floor(portions*a.riceReductionFraction+1e-8);return [
['↘',`Rizoto: vařte o ${less} porcí méně`,`V gastronádobách průměrně zbývá ${fmt(portions)} porcí.`,less*rice.portionKg*rice.days],
['↻','Koprovka: upravit recept',`Vrací se ${fmt(dill.plateKg/dill.servedKg*100)} % porce. Model: o ${fmt(a.recipeReduction*100)} % méně těchto zbytků.`,dill.plateKg*a.recipeReduction],
['◒','Menší příloha pro 1. stupeň',`Přílohy tvoří ${fmt(totals.components['Příloha']/totals.plateKg*100)} % zbytků. Model: snížení o ${fmt(a.sideReduction*100)} %.`,totals.components['Příloha']*a.sideReduction],
['♨','Polévky: jen oblíbené',`Čočková a kulajda: vrací se ${fmt(sum(soups,'plateKg')/sum(soups,'servedKg')*100)} %. Model: snížení o ${fmt(a.soupReduction*100)} %.`,sum(soups,'plateKg')*a.soupReduction],
['♡','Přebytky zchladit a darovat',`Přes aplikaci Zachraň jídlo. Model: ${fmt(a.donationFraction*100)} % nevydaného jídla.`,totals.unservedKg*a.donationFraction],
['⚑','Soutěž tříd v jídelně',`Inspirace Brnem: 80 → 19 kg. Náš model: −${fmt(a.competitionReduction*100)} % zbytků z talířů.`,totals.plateKg*a.competitionReduction]];}
function solutionView(){const annual=totals.kg/month.days.length*config.schoolDaysPerYear*config.pilotReduction;return title('04 / Řešení pro školu','Méně odpadu začíná konkrétní změnou.','Modelové úspory')+`<div class="recommendations">${recommendations().map(([icon,name,reason,kg],i)=>`<article class="panel recommendation" style="animation-delay:${i*400}ms"><span class="rec-icon">${icon}</span><h2>${name}</h2><p>${reason}</p><div class="saving">${fmt(kg,1)} kg · ${fmt(kg*config.pricePerKg)} Kč / měsíc</div></article>`).join('')}</div><p class="note">Opatření se překrývají; úspory nesčítáme. U darování jde o hodnotu zachráněného jídla.</p><div class="summary"><span>Cíl pilotu: <strong class="green">−${fmt(config.pilotReduction*100)} % odpadu</strong></span><strong class="big green">~${count(Math.round(annual*config.pricePerKg/1000)*1000)} Kč · ~${count(annual/1000,1)} t / rok</strong></div><p class="note">Přepočet z ukázkového měsíce na ${config.schoolDaysPerYear} školních dní. Cíl, nikoli naměřený výsledek.</p>`;}
function studentView(){return title('05 / Obrazovka pro žáky','Dobré jídlo si zaslouží prázdný talíř.','Ukázková data')+`<div class="students"><div class="student-score"><p class="eyebrow">Dnes dojedeno</p><div class="hero-number">${count(config.students.finishedPercent)}<span style="font-size:100px"> %</span></div><h2>Malý zbytek. Velký rozdíl.</h2><p>Díky, že jídlu dáváte šanci.<br>Klidně si řekněte o menší porci.</p><span class="badge">Každý dojezený oběd se počítá.</span></div><div class="panel"><h2>Dnešní liga prázdných talířů</h2><p class="note">Podíl dojezených talířů ve třídě</p>${config.students.classes.map((c,i)=>`<div class="class-row" style="animation-delay:${i*200}ms"><span class="rank">0${i+1}</span><div><span class="class-name">${esc(c.name)}</span><div class="bar-track"><div class="bar-fill" style="width:${c.percent}%;animation-delay:${i*200}ms;background:${i===0?'#30d158':'#69a97b'}"></div></div></div><strong class="class-percent">${c.percent} %</strong></div>`).join('')}<p class="note">Soutěžíme společně, bez jmen a fotek žáků.</p></div></div>`;}
async function requestCamera(){
 const request=++cameraRequest;if(config.camera.source==='mobile'){attachRemote();return;}if(!useCamera||!navigator.mediaDevices?.getUserMedia)return;
 let next=null;
 try{
  next=await navigator.mediaDevices.getUserMedia({video:true,audio:false});
  if(request!==cameraRequest||!useCamera){next.getTracks().forEach(t=>t.stop());return;}
  let devices=[];try{devices=await navigator.mediaDevices.enumerateDevices();}catch{/* Keep the default stream. */}
  const match=config.camera.labelContains&&devices.find(d=>d.kind==='videoinput'&&d.label.toLowerCase().includes(config.camera.labelContains.toLowerCase()));
  if(match&&next.getVideoTracks()[0].getSettings().deviceId!==match.deviceId){try{const preferred=await navigator.mediaDevices.getUserMedia({video:{deviceId:{exact:match.deviceId}},audio:false});next.getTracks().forEach(t=>t.stop());next=preferred;}catch{/* Default camera remains available. */}}
  if(request!==cameraRequest||!useCamera){next.getTracks().forEach(t=>t.stop());return;}
  stream=next;attachCamera();
 }catch{next?.getTracks().forEach(t=>t.stop());if(request===cameraRequest){stream=null;attachCamera();}}
}
function attachCamera(){
 const video=$('video'),canvas=$('canvas.snapshot');if(!video)return;
 if(config.camera.source==='mobile'){attachRemote();return;}
 const live=useCamera&&stream;video.hidden=!live;canvas.hidden=true;
 $('#source-label').textContent=live?'Živá kamera':'Ukázková fotografie';
 if(!live)return;
 const g=generation,freeze=step===2||(step===3&&captured)||step===4;
 const showSnapshot=()=>{if(g!==generation||!useCamera||!video.isConnected)return;
  if(!frozen&&video.readyState>=2){const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);frozen=c;frozenBounds=measureOutline(c);}
  if(frozen){canvas.width=frozen.width;canvas.height=frozen.height;canvas.getContext('2d').drawImage(frozen,0,0);canvas.hidden=false;$('#source-label').textContent='Zachycený snímek';paintOutline();}
 };
 video.srcObject=stream;
 if(freeze){if(frozen)showSnapshot();else video.addEventListener('loadeddata',showSnapshot,{once:true});}
 video.play().catch(()=>{});
}
function snapshot(){frozenBounds=null;if(config.camera.source==='mobile'){frozen=null;if(useCamera&&remoteFresh()){frozen=document.createElement('canvas');frozen.width=remoteFrame.width;frozen.height=remoteFrame.height;frozen.getContext('2d').drawImage(remoteFrame,0,0);frozenBounds=measureOutline(frozen);}return;}const video=$('video');if(useCamera&&video&&!video.hidden&&video.readyState>=2){const c=document.createElement('canvas');c.width=video.videoWidth;c.height=video.videoHeight;c.getContext('2d').drawImage(video,0,0);frozen=c;frozenBounds=measureOutline(c);}else frozen=null;}
function render(){generation++;document.querySelectorAll(".camera-exit").forEach(n=>n.remove());$('#scene').innerHTML=`<div class="enter">${step<=4?live():step===5?dayView():step===6?monthView():step===7?solutionView():studentView()}</div>`;$('#progress').textContent=`${step} / 8`;$('#back').disabled=step===1;$('#next').disabled=step===8;$('#chapter').textContent=['','Živě z jídelny','Ranní referenční porce','Návrat talíře','Výsledek měření','Celý den','Měsíc ve škole','Doporučení','Liga prázdných talířů'][step];attachCamera();paintOutline();animateCounts();if(isLiveAnalysis()){liveAnalysis.paintWeight();if(step===2)liveAnalysis.capture('reference',frozen);else if(step===3&&captured)liveAnalysis.capture('leftover',frozen);return;}if(step===2)later(()=>{$('#results').innerHTML=fullResult();},1500);if(step===3&&captured){$('#weight-status').textContent='ustaluji…';later(()=>{$('#weight').dataset.prefix='+';$('#weight').dataset.count=sum(config.plate.leftover,'grams');animateCounts();later(()=>{$('#weight-status').textContent='ustáleno ✓';$('#results').innerHTML='<div class="waiting"><div class="orb">✓</div><h2>Hmotnost zaznamenána</h2><p class="status">Další stisk → výsledek talíře</p></div>';},800);},1200);}}
function go(n,automatic=false){if(!config)return;if(isLiveAnalysis())liveAnalysis.navigate(n);if(!automatic){if(n===1)resetAuto();else pauseAuto();}const target=Math.max(1,Math.min(8,n));const outgoing=step<=4&&target===5?$(".camera-box")?.cloneNode(true):null;if(target===2||(target===4&&!(step===3&&captured&&frozen)))snapshot();else if(target!==4)frozen=null;step=target;captured=false;render();if(outgoing){outgoing.classList.add("camera-exit");$("#stage").append(outgoing);setTimeout(()=>outgoing.remove(),550);}}
function next(automatic=false){if(!automatic&&step===8&&window.parent!==window){window.parent.postMessage({dojedeno:'konec'},'*');return;}if(!automatic)pauseAuto();if(step===3&&!captured){snapshot();captured=true;render();}else go(step+1,automatic);}
function toggleCamera(){useCamera=!useCamera;cameraRequest++;if(!useCamera){stream?.getTracks().forEach(t=>t.stop());stream=null;frozen=null;render();}else if(stream)attachCamera();else requestCamera();}
$('#next').onclick=()=>next();$('#back').onclick=()=>go(step-1);$('#help-button').onclick=()=>{$('#help').hidden=!$('#help').hidden;};$('#camera-button').onclick=toggleCamera;
addEventListener('keydown',e=>{if(!config||e.altKey||e.ctrlKey||e.metaKey||e.repeat)return;const key=e.key.toLowerCase();if(['arrowright',' ','pagedown','arrowleft','pageup','r','c','h','a','b','1','2','3','4','5','6','7','8'].includes(key))e.preventDefault();if(['arrowright',' ','pagedown'].includes(key))next();else if(['arrowleft','pageup'].includes(key))(step===1&&window.parent!==window?window.parent.postMessage({dojedeno:'zacatek'},'*'):go(step-1));else if(key==='a')toggleAuto();else if(key==='b'){resetAuto();go(1,true);}else if(key==='r')go(1);else if(key==='c')toggleCamera();else if(key==='h')$('#help').hidden=!$('#help').hidden;else if(/^[1-8]$/.test(key))go(Number(key));});
addEventListener('pagehide',()=>stream?.getTracks().forEach(t=>t.stop()));
Promise.all(['config.json','data/month.json'].map(async path=>{const r=await fetch(path);if(!r.ok)throw Error(path);return r.json();})).then(([c,m])=>{config=c;month=m;derive();initAuto();$('#school').textContent=`ZŠ ${config.school} · Oběd ${config.date}`;render();requestCamera();startRemote();window.demo={go,next,getState:()=>({step,captured,autoEnabled,detectorState:detector?.state}),getData:()=>({totals,recommendations:recommendations()})};}).catch(()=>{$('#scene').innerHTML='<div class="error">Data se nepodařilo načíst. Spusťte demo přes <code>python3 -m http.server 8080</code> ve složce demo a otevřete localhost:8080.</div>';});

// Only foreground presence is measured. Food identity and weights remain scripted.
let outlineDetector=null,liveBounds=null,frozenBounds=null;
let detector=null,autoEnabled=false,firstCapturedAt=0,lastSampleAt=0,lastFrameKey=null;
const detectorCanvas=document.createElement('canvas');detectorCanvas.width=64;detectorCanvas.height=48;
const detectorContext=detectorCanvas.getContext('2d',{willReadFrequently:true});
const remoteFrame=document.createElement('canvas');let remoteAt=0,remoteSerial=0,remoteWasFresh=false,remoteServerId=null;
const remoteFresh=()=>remoteAt>0&&performance.now()-remoteAt<1600;
function initAuto(){detector=new PlatePresence(config.detection||{});outlineDetector=new PlatePresence(config.detection||{});autoEnabled=config.detection?.enabled!==false;setInterval(samplePresence,100);updateAutoButton();}
function updateAutoButton(){$('#auto-button').textContent=autoEnabled?'Auto ●':'Ručně';$('#auto-button').classList.toggle('active',autoEnabled);}
function resetAuto(){if(isLiveAnalysis())liveAnalysis.reset();detector?.reset();outlineDetector?.reset();liveBounds=null;frozenBounds=null;autoEnabled=config.detection?.enabled!==false;lastSampleAt=0;lastFrameKey=null;firstCapturedAt=0;updateAutoButton();}
function pauseAuto(){autoEnabled=false;updateAutoButton();}
function toggleAuto(){if(autoEnabled)pauseAuto();else{resetAuto();autoEnabled=true;updateAutoButton();go(1,true);}}
function autoStatus(text){const el=$('#auto-status');if(el)el.textContent=text;}
function samplePresence(){
 if(!config||step>4)return;
 if(!useCamera){autoStatus('Statická fotografie · C zapne kameru');return;}
 let source,key,width,height;
 if(config.camera.source==='mobile'){
  if(!remoteFresh()){autoStatus('Připojte mobil · tlačítko Mobil dole');liveBounds=null;paintOutline();if(remoteWasFresh){detector.reset();outlineDetector.reset();remoteWasFresh=false;}return;}
  source=remoteFrame;key=remoteSerial;width=source.width;height=source.height;remoteWasFresh=true;
 }else{source=$('video');if(!source||source.readyState<2||!stream?.getVideoTracks().some(t=>t.readyState==='live')){autoStatus('Čekám na kameru · povolte přístup nebo použijte šipky');return;}key=source.currentTime;width=source.videoWidth;height=source.videoHeight;}
 if(key===lastFrameKey)return;
 const now=performance.now();if(lastSampleAt&&now-lastSampleAt>1600){detector.reset();outlineDetector.reset();}lastSampleAt=now;lastFrameKey=key;
 liveBounds=measureOutline(source);paintOutline();
 if(!autoEnabled){autoStatus('Ruční režim · A zapne automatické snímání');return;}
 detectorContext.drawImage(source,width*.15,height*.15,width*.7,height*.7,0,0,64,48);
 const result=detector.sample(detectorContext.getImageData(0,0,64,48).data,64,48,now);
 if(result.state==='calibrating'){autoStatus(`Nechte místo prázdné · kalibrace ${Math.round(result.calibrationProgress*100)} %`);return;}
 if(step===1){autoStatus('Připraveno · vložte první talíř doprostřed obrazu');if(result.event==='arrived'){firstCapturedAt=now;go(2,true);}}
 else if(step===2){const ready=!isLiveAnalysis()||liveAnalysis.ready('reference');autoStatus(!ready?'Čekám na čitelnou analýzu jídla a váhy…':now-firstCapturedAt<4000?'Zpracovávám první talíř…':'Vzor uložen · odeberte talíř z obrazu');if(ready&&now-firstCapturedAt>=4000&&result.state==='empty')go(3,true);}
 else if(step===3&&!captured){autoStatus('Připraveno · vložte druhý talíř se zbytky');if(result.event==='arrived'){next(true);if(!isLiveAnalysis())later(()=>{if(autoEnabled)go(4,true);},2600);}}
 else if(step===3)autoStatus('Zpracovávám druhý talíř…');
 else if(step===4)autoStatus('Hotovo · → denní přehled · R nové měření');
}
function attachRemote(){
 const live=$('canvas.remote-live'),snap=$('canvas.snapshot');if(!live)return;
 const available=useCamera&&remoteFresh();live.hidden=!available;snap.hidden=true;
 $('#source-label').textContent=available?'Živě z mobilu':'Ukázková fotografie';
 if(!available)return;
 const freeze=step===2||(step===3&&captured)||step===4;
 if(freeze){if(!frozen)snapshot();if(frozen){snap.width=frozen.width;snap.height=frozen.height;snap.getContext('2d').drawImage(frozen,0,0);snap.hidden=false;$('#source-label').textContent='Zachycený snímek';paintOutline();}}
 live.width=remoteFrame.width;live.height=remoteFrame.height;live.getContext('2d').drawImage(remoteFrame,0,0);paintOutline();
}
function startRemote(){
 if(config.camera.source!=='mobile')return;
 async function poll(){
  try{const response=await fetch('/api/frame',{cache:'no-store'});if(response.ok&&response.status!==204&&response.headers.get('content-type')?.includes('image/')){
   const id=response.headers.get('X-Frame-Id');if(id&&id===remoteServerId){await response.body?.cancel();return;}remoteServerId=id;const blob=await response.blob(),url=URL.createObjectURL(blob);try{const img=new Image();img.src=url;await img.decode();remoteFrame.width=img.naturalWidth;remoteFrame.height=img.naturalHeight;remoteFrame.getContext('2d').drawImage(img,0,0);remoteAt=performance.now();remoteSerial++;attachRemote();}finally{URL.revokeObjectURL(url);}
  }}catch{/* Keep the presentation usable when the phone disconnects. */}finally{setTimeout(poll,180);}
  if(!remoteFresh())attachRemote();
 }
 poll();refreshPhoneStatus();
}
async function refreshPhoneStatus(){
 try{const r=await fetch('/api/status',{cache:'no-store'});if(!r.ok)throw Error();const status=await r.json();const link=$('#phone-url');link.textContent=status.phoneUrl;link.href=status.phoneUrl;$('#phone-connection').textContent=status.connected?'Mobil připojen · přijímám obraz':'Čekám na mobil. Na telefonu klepněte na Spustit kameru.';}catch{$('#phone-url').textContent='Spusťte python3 tools/serve.py ve složce demo';$('#phone-connection').textContent='Běžný http.server přenos z telefonu nepodporuje.';}
}
$('#phone-button').onclick=()=>{$('#phone-help').hidden=false;refreshPhoneStatus();};$('#phone-close').onclick=()=>{$('#phone-help').hidden=true;};$('#auto-button').onclick=toggleAuto;
setInterval(()=>{if(!$('#phone-help').hidden)refreshPhoneStatus();},2000);

$('#phone-copy').onclick=async()=>{const link=$('#phone-url');if(!link.hasAttribute('href'))return;try{await navigator.clipboard.writeText(link.href);$('#phone-connection').textContent='Odkaz zkopírován. Přeneste jej do telefonu nebo použijte sdílenou schránku.';}catch{$('#phone-connection').textContent='Označte a zkopírujte odkaz nad tlačítkem.';}};

const outlineCanvas=document.createElement('canvas');outlineCanvas.width=160;outlineCanvas.height=120;
const outlineContext=outlineCanvas.getContext('2d',{willReadFrequently:true});
function measureOutline(source){
 if(!outlineDetector)return null;
 const width=source.videoWidth||source.width,height=source.videoHeight||source.height;
 if(!width||!height)return null;
 outlineContext.drawImage(source,0,0,160,120);
 const result=outlineDetector.sample(outlineContext.getImageData(0,0,160,120).data,160,120,performance.now());
 return result.bounds?{...result.bounds,sourceWidth:width,sourceHeight:height}:null;
}
function paintOutline(){
 const el=$('.plate-outline'),box=$('.camera-box');if(!el||!box)return;
 const freeze=step===2||(step===3&&captured)||step===4;
 const bounds=freeze?frozenBounds:liveBounds;
 const available=useCamera&&(config.camera.source==='mobile'?remoteFresh():stream?.getVideoTracks().some(t=>t.readyState==='live'));
 el.hidden=!bounds||!available;if(el.hidden)return;
 const rect=projectPlateBounds(bounds,bounds.sourceWidth,bounds.sourceHeight,box.clientWidth,box.clientHeight);
 if(!rect){el.hidden=true;return;}
 Object.assign(el.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});
}
