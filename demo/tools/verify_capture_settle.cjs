'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const p=await browser.newPage(),errors=[];let calls=0;p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/config.json',r=>{const c=JSON.parse(fs.readFileSync(path.join(__dirname,'../config.json')));c.camera={source:'local'};return r.fulfill({json:c});});
 await p.addInitScript(()=>{const c=document.createElement('canvas');c.width=512;c.height=384;const x=c.getContext('2d');let plate=false,changing=false,n=0;
 function draw(){x.fillStyle='#303030';x.fillRect(0,0,512,384);if(plate){x.fillStyle='#ddd';x.beginPath();x.arc(256,170,105,0,Math.PI*2);x.fill();x.fillStyle='#3333aa';x.fillRect(220,300,64,28);x.fillStyle=changing&&Math.floor(n/2)%2?'#fff':'#3333aa';x.fillRect(240,308,8,8);}n++;}
 draw();setInterval(draw,100);window.cameraTest=(a,b)=>{plate=a;changing=b;draw()};navigator.mediaDevices.getUserMedia=async()=>c.captureStream(10);navigator.mediaDevices.enumerateDevices=async()=>[];});
 await p.route('**/api/analyze',r=>{calls++;const ref=r.request().postDataJSON().phase==='reference';return r.fulfill({json:{result:{plateDetected:true,dishName:'Test',confidence:'high',massEstimateConfidence:'medium',components:[{name:'Jídlo',estimatedMassShare:1}],scaleReading:{visible:true,grams:ref?416:266,confidence:'high'},comparableToReference:!ref}}});});
 await p.goto(process.env.DEMO_URL||'http://127.0.0.1:8094');await p.waitForFunction(()=>window.demo&&document.querySelector('video').readyState>=2);await p.waitForTimeout(2400);
 await p.evaluate(()=>cameraTest(true,true));await p.waitForTimeout(6500);assert.equal(calls,0,'Moving display cannot trigger first capture');assert.equal(await p.evaluate(()=>step),1);
 await p.evaluate(()=>cameraTest(true,false));await p.waitForFunction(()=>step===2&&liveAnalysis.ready('reference'),null,{timeout:8000});assert.equal(calls,1);
 await p.evaluate(()=>cameraTest(false,false));await p.waitForFunction(()=>step===3);await p.evaluate(()=>cameraTest(true,true));await p.waitForTimeout(6500);assert.equal(calls,1,'Returning plate bypass must also wait for display stability');assert.equal(await p.evaluate(()=>captured),false);
 await p.evaluate(()=>cameraTest(true,false));await p.waitForFunction(()=>step===4,null,{timeout:8000});assert.equal(calls,2);assert.deepEqual(errors,[]);
 console.log('PASS both automatic captures wait through moving LCD digits, then capture once after settling; no paid API.');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
