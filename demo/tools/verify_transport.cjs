'use strict';
// Browser transport regression: local fake camera and mocked 60 ms network,
// no actual phone frames and no Claude API requests.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const context=await browser.newContext();
  let latest=null,serial=0,uploads=0,uploadActive=0,uploadMax=0,downloads=0,downloadActive=0,downloadMax=0,failUpload=false,failDownload=false,unauthorized=false;
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  await context.route('https://transport.test/**',async route=>{
   const req=route.request(),name=new URL(req.url()).pathname;
   if(name==='/api/frame'){
    if(req.method()==='POST'){
     uploadActive++;uploadMax=Math.max(uploadMax,uploadActive);
     try{await pause(60);if(unauthorized)return await route.fulfill({status:401});if(failUpload){failUpload=false;return await route.fulfill({status:503});}
      latest=req.postDataBuffer();serial++;uploads++;return await route.fulfill({status:204});
     }finally{uploadActive--;}
    }
    downloadActive++;downloadMax=Math.max(downloadMax,downloadActive);
    try{await pause(60);downloads++;if(failDownload){failDownload=false;return await route.fulfill({status:502});}
     return await route.fulfill(latest?{status:200,body:latest,contentType:'image/jpeg',headers:{'X-Frame-Id':String(serial)}}:{status:204});
    }finally{downloadActive--;}
   }
   if(name==='/api/status')return route.fulfill({json:{connected:true,phoneUrl:'https://transport.test/phone.html#token=test'}});
   if(name==='/api/analyze')throw Error('Transport test must never analyze');
   if(name==='/config.json'){const c=JSON.parse(fs.readFileSync(path.join(root,'config.json')));c.camera={source:'mobile'};c.analysis={mode:'demo'};c.detection={enabled:false};return route.fulfill({json:c});}
   const file=path.join(root,name==='/'?'index.html':name.slice(1));
   if(!file.startsWith(root)||!fs.existsSync(file))return route.fulfill({status:404});
   const ext=path.extname(file),type={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.jpg':'image/jpeg','.png':'image/png'}[ext]||'application/octet-stream';
   return route.fulfill({body:fs.readFileSync(file),contentType:type});
  });
  const phone=await context.newPage(),desktop=await context.newPage(),errors=[];
  for(const page of [phone,desktop])page.on('pageerror',e=>errors.push(e.message));
  await phone.addInitScript(()=>{
   const c=document.createElement('canvas');c.width=1280;c.height=960;const x=c.getContext('2d');let n=0;
   function draw(){x.fillStyle='#ddd';x.fillRect(0,0,c.width,c.height);x.fillStyle='#152';x.fillRect((n++*20)%1200,300,80,300);}draw();setInterval(draw,35);
   navigator.mediaDevices.getUserMedia=async()=>c.captureStream(30);
  });
  await desktop.goto('https://transport.test/');await desktop.waitForFunction(()=>window.demo);
  await phone.goto('https://transport.test/phone.html#token=test');await phone.locator('#start').click();
  await desktop.waitForFunction(()=>remoteSerial>=1);
  const started=uploads,received=await desktop.evaluate(()=>remoteSerial),time=Date.now();
  await pause(3200);
  const sent=uploads-started,shown=await desktop.evaluate(()=>remoteSerial)-received;
  assert(sent>=16,`Only ${sent} uploads in 3.2s`);assert(shown>=12,`Only ${shown} shown frames in 3.2s`);
  assert.equal(uploadMax,1);assert.equal(downloadMax,1);
  assert.deepEqual(await desktop.evaluate(()=>[remoteFrame.width,remoteFrame.height]),[1280,960]);
  const before=uploads;failUpload=true;failDownload=true;
  await pause(1500);assert(uploads>before+3,'Phone failed to resume after transient error');
  assert.equal(await phone.locator('#start').isVisible(),false);
  assert(await desktop.evaluate(()=>remoteFresh()),'Desktop failed to recover');
  unauthorized=true;await phone.waitForFunction(()=>document.querySelector('#status').textContent.includes('Odkaz už není platný'));
  assert.equal(await phone.locator('#start').isVisible(),true);
  const stopped=uploads;await pause(350);assert.equal(uploads,stopped);
  assert.deepEqual(errors,[]);
  console.log(`PASS transport: ${sent} uploads / ${shown} displayed frames in ${((Date.now()-time-1850)/1000).toFixed(1)}s sampling window; 1280×960 preserved, one request in flight, transient recovery, invalid token stops. Mock 60ms requests; not a real-network FPS guarantee.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
