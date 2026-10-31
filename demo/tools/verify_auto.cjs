/* Browser QA: no camera hardware needed. Run against the local demo server. */
'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=process.env.DEMO_URL||'http://127.0.0.1:8080';
(async()=>{
 let browser;
 try {
  browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await page.route('**/config.json',route=>{
   const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
   config.analysis={mode:'demo'};config.camera={...config.camera,source:'local',labelContains:''};
   return route.fulfill({contentType:'application/json',body:JSON.stringify(config)});
  });
  await page.addInitScript(()=>{
   const canvas=document.createElement('canvas');canvas.width=480;canvas.height=360;
   const context=canvas.getContext('2d');
   let present=false;
   function draw(){context.fillStyle='#303030';context.fillRect(0,0,480,360);if(present){context.fillStyle='#dadada';context.beginPath();context.ellipse(240,180,90,80,0,0,Math.PI*2);context.fill();}}
   draw();setInterval(draw,100);
   const streams=[];
   window.synthetic={
    show(value){present=value;draw();},
    drop(){for(const stream of streams)for(const track of stream.getTracks()){track.stop();track.dispatchEvent(new Event('ended'));}}
   };
   navigator.mediaDevices.getUserMedia=async()=>{const stream=canvas.captureStream(10);streams.push(stream);return stream;};
   navigator.mediaDevices.enumerateDevices=async()=>[];
  });
  await page.goto(base);
  await page.waitForFunction(()=>window.demo&&document.querySelector('video')?.readyState>=2);
  await page.waitForTimeout(3000);
  const state=()=>page.evaluate(()=>demo.getState());
  const show=present=>page.evaluate(v=>synthetic.show(v),present);
  const waitStep=step=>page.waitForFunction(n=>demo.getState().step===n,step,{timeout:12000});
  assert.equal((await state()).step,1);
  // First stable plate arrives; holding it must not produce a second event.
  await show(true);await waitStep(2);await page.waitForTimeout(4500);
  assert.equal((await state()).step,2,'held reference plate must not advance to the returning plate');
  await show(false);await waitStep(3);await page.waitForTimeout(1200);
  assert.equal((await state()).captured,false,'empty returning station waits for a fresh arrival');
  // Second arrival records weight and advances to the result without a keypress.
  await show(true);await page.waitForFunction(()=>demo.getState().step===3&&demo.getState().captured,null,{timeout:12000});
  await waitStep(4);await page.waitForTimeout(1500);
  assert.match(await page.locator('#results').innerText(),/150 g/);
  assert.match(await page.locator('#results').innerText(),/63/);
  await page.screenshot({path:path.join(root,'screenshots/auto-result.png')});
  // Summary scenes remain presenter-controlled regardless of objects below camera.
  await page.keyboard.press('5');
  await show(false);await page.waitForTimeout(1500);await show(true);await page.waitForTimeout(2500);
  assert.equal((await state()).step,5);
  // Manual navigation to the returning-plate step pauses auto.
  await page.keyboard.press('3');await show(false);await page.waitForTimeout(3000);
  await show(true);await page.waitForTimeout(2200);
  assert.equal((await state()).step,3,'manual navigation pauses auto');
  assert.equal((await state()).captured,false,'manual mode does not capture on arrival');
  // Reset is safe during detection and returns to a fresh first-step sequence.
  await show(false);await page.keyboard.press('r');await page.waitForTimeout(3000);
  assert.equal((await state()).step,1);
  // A explicitly pauses/resumes; B restarts empty-station calibration.
  await page.keyboard.press('a');assert.equal((await state()).autoEnabled,false);
  await show(true);await page.waitForTimeout(2000);assert.equal((await state()).step,1);
  await show(false);await page.keyboard.press('a');await page.waitForTimeout(3000);
  assert.equal((await state()).autoEnabled,true);
  await page.keyboard.press('b');assert.equal((await state()).detectorState,'calibrating');
  await page.waitForTimeout(3000);
  // Camera loss must not create a phantom capture or an unhandled exception.
  await page.evaluate(()=>synthetic.drop());await page.waitForTimeout(1500);
  assert.equal((await state()).step,1);
  await page.keyboard.press('2');await page.waitForTimeout(1800);
  assert.match(await page.locator('#results').innerText(),/Plná porce/,'manual fallback remains usable after camera loss');
  assert.deepEqual(errors,[]);
  console.log('PASS: real synthetic image changes trigger two automatic captures, holding does not duplicate, removal rearms, summaries remain manual, manual override/reset and camera loss work.');
 } finally {if(browser)await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
