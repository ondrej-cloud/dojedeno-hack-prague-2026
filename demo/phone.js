'use strict';
const video=document.querySelector('video'), canvas=document.querySelector('canvas');
const start=document.querySelector('#start'), stop=document.querySelector('#stop'), status=document.querySelector('#status');
const token=new URLSearchParams(location.hash.slice(1)).get('token');
const hostedDemo=location.protocol==='https:'&&location.hostname.endsWith('.netlify.app');
let stream=null, running=false, generation=0, wakeLock=null, controller=null;
function message(text,error=false){status.textContent=text;status.classList.toggle('error',error);}
function shutdown(){running=false;generation++;controller?.abort();stream?.getTracks().forEach(t=>t.stop());stream=null;video.srcObject=null;wakeLock?.release().catch(()=>{});wakeLock=null;start.disabled=false;start.hidden=false;stop.hidden=true;}
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
// Send only the newest camera frame. One in-flight upload prevents a delayed
// network from building an old-frame queue; timing includes the HTTP roundtrip.
async function transmit(g){
 let failures=0;
 const context=canvas.getContext('2d');
 while(running&&g===generation){
  const began=performance.now();
  try{
   if(video.readyState<2){await delay(100);continue;}
   const scale=Math.min(1,1280/Math.max(video.videoWidth,video.videoHeight));
   const width=Math.round(video.videoWidth*scale),height=Math.round(video.videoHeight*scale);
   if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
   context.drawImage(video,0,0,width,height);
   const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',.82));
   if(!running||g!==generation)return;
   if(!blob||blob.size>1024*1024)throw Error('Snímek je příliš velký.');
   const request=new AbortController();controller=request;
   const timer=setTimeout(()=>request.abort(),5000);
   let response;
   try{response=await (window.phoneApiFetch||fetch)('/api/frame?token='+encodeURIComponent(token),{method:'POST',body:blob,headers:{'Content-Type':'image/jpeg'},signal:request.signal,cache:'no-store'});}
   finally{clearTimeout(timer);if(controller===request)controller=null;}
   if(!running||g!==generation)return;
   if(response.status===401||response.status===403){shutdown();message('Odkaz už není platný. Otevřete nový QR kód z prezentace.',true);return;}
   if(!response.ok)throw Error('Server nepřijal snímek.');
   failures=0;
   message('● Kamera připojena · obraz běží do prezentace');
   await delay(Math.max(0,125-(performance.now()-began)));
  }catch(error){
   if(!running||g!==generation)return;
   failures++;
   message('Spojení se přerušilo · automaticky obnovuji přenos…',true);
   await delay(Math.min(3000,300*failures));
  }
 }
}
start.onclick=async()=>{if(!token&&!hostedDemo){message('Chybí párovací kód. Otevřete celý odkaz z Macu včetně #token=…',true);return;}if(!isSecureContext||!navigator.mediaDevices?.getUserMedia){message('Kamera vyžaduje důvěryhodné HTTPS. Viz návod PHONE.md na Macu.',true);return;}start.disabled=true;message('Povolte přístup ke kameře…');const g=++generation;try{const media=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280},height:{ideal:960}}});if(g!==generation){media.getTracks().forEach(t=>t.stop());return;}stream=media;video.srcObject=stream;await video.play();if(g!==generation)return;running=true;start.hidden=true;stop.hidden=false;try{wakeLock=await navigator.wakeLock?.request('screen');}catch{}if(g!==generation){wakeLock?.release().catch(()=>{});return;}transmit(g);}catch(error){if(g!==generation)return;shutdown();message(error.name==='NotAllowedError'?'Přístup ke kameře byl odmítnut. Povolte kameru pro tuto stránku; ověřte důvěru certifikátu.':'Kameru se nepodařilo spustit. Zavřete jiné aplikace s kamerou a zkuste to znovu.',true);}};
stop.onclick=()=>{shutdown();message('Přenos zastaven.');};
addEventListener('pagehide',shutdown);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&running){shutdown();message('Přenos pozastaven po opuštění stránky. Zapněte kameru znovu.');}});
if(!token&&!hostedDemo)message('Otevřete párovací odkaz z Macu včetně #token=…',true);
