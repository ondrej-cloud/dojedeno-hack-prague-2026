'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/config.json',r=>{const c=JSON.parse(fs.readFileSync(path.join(root,'config.json')));c.camera={source:'local',labelContains:''};c.analysis={mode:'claude',quantityMode:'relative'};return r.fulfill({json:c});});
 await page.addInitScript(()=>{const c=document.createElement('canvas');c.width=480;c.height=360;const x=c.getContext('2d');let present=false;function draw(){x.fillStyle='#303030';x.fillRect(0,0,480,360);if(present){x.fillStyle='white';x.beginPath();x.arc(240,180,100,0,Math.PI*2);x.fill();}}draw();setInterval(draw,100);window.synthetic=v=>{present=v;draw();};navigator.mediaDevices.getUserMedia=async()=>c.captureStream(10);navigator.mediaDevices.enumerateDevices=async()=>[];});
 const requests=[];let responseMode='ok',delay=400;
 await page.route('**/api/analyze',async route=>{const body=route.request().postDataJSON();requests.push(body);await new Promise(r=>setTimeout(r,delay));if(responseMode==='error')return route.fulfill({status:503,json:{error:'Chybí API klíč.'}});const reference=body.phase==='reference';return route.fulfill({json:{model:'claude-test',usage:{input_tokens:100,output_tokens:80},result:{plateDetected:true,dishName:'Bramborová kaše s rybou',components:[{name:'Bramborová kaše',amountDescription:'malá porce',estimatedGrams:null},{name:'Rybí filé',amountDescription:'jeden kus',estimatedGrams:null}],estimatedTotalGrams:null,remainingPercent:25,comparableToReference:!reference,confidence:'high',notes:'Test čtení displeje.',scaleReading:{visible:true,grams:responseMode==='unreadable'?null:reference?320:80,confidence:responseMode==='unreadable'?'low':'high'}}}});});
 await page.goto('http://127.0.0.1:8080');await page.waitForFunction(()=>window.demo);await page.waitForTimeout(2800);
 await page.evaluate(()=>synthetic(true));await page.waitForFunction(()=>demo.getState().step===2);await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('320 g'));
 assert.equal(requests.length,1);assert(!await page.locator('#results').innerText().then(t=>t.includes('400 g')));
 await page.waitForTimeout(4000);await page.evaluate(()=>synthetic(false));await page.waitForFunction(()=>demo.getState().step===3);await page.evaluate(()=>synthetic(true));await page.waitForFunction(()=>demo.getState().step===4);
 const text=await page.locator('#results').innerText();assert.match(text,/80 g/);assert.match(text,/75 %/);assert.match(text,/Bramborová kaše/);assert(!text.includes('150 g'));assert.equal(requests.length,2);assert(requests[1].reference.image);assert.equal(requests[1].reference.result.scaleReading.grams,320);
 await page.waitForTimeout(800);await page.screenshot({path:path.join(root,'screenshots/claude-result-mocked.png')});
 // Error path never falls back to configured plate data.
 responseMode='error';await page.keyboard.press('2');await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('Chybí API klíč'));
 assert(!await page.locator('#results').innerText().then(t=>t.includes('400')));
 responseMode='unreadable';await page.locator('[data-new-analysis]').click();await page.waitForFunction(()=>document.querySelector('#results').textContent.includes('není spolehlivě čitelný'));assert.equal(await page.locator('#weight').innerText(),'—');
 // Reset invalidates an in-flight reply.
 responseMode='ok';delay=1500;await page.locator('[data-new-analysis]').click();await page.keyboard.press('r');await page.waitForTimeout(1900);assert.equal(await page.evaluate(()=>demo.getState().step),1);assert.match(await page.locator('#results').innerText(),/Čekám na talíř/);
 assert.deepEqual(errors,[]);console.log('PASS Claude UI: two calls, real response values, OCR scale-derived percentage, reference image, error/unreadable without fake fallback, reset cancels stale result.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
