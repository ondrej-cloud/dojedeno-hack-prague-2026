'use strict';
// All analysis replies are mocked: this suite never invokes a paid model.
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const base=process.env.DEMO_URL||'http://127.0.0.1:8092';
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:1920,height:1080}}),errors=[],requests=[];
  page.on('pageerror',error=>errors.push(error.message));
  // Block direct Anthropic access even if application configuration changes.
  await page.route('**/api.anthropic.com/**',route=>route.abort());
  await page.route('**/config.json',route=>{
   const config=JSON.parse(fs.readFileSync(path.join(root,'config.json'),'utf8'));
   config.camera={source:'local',labelContains:''};
   config.analysis={mode:'claude',quantityMode:'scale'};
   config.detection={...config.detection,enabled:false};
   return route.fulfill({json:config});
  });
  await page.addInitScript(()=>{
   const canvas=document.createElement('canvas');canvas.width=640;canvas.height=480;
   const context=canvas.getContext('2d');
   function draw(){context.fillStyle='#525a55';context.fillRect(0,0,640,480);context.fillStyle='#fff';context.beginPath();context.arc(320,210,125,0,Math.PI*2);context.fill();context.fillStyle='#edbd70';context.fillRect(260,170,110,70);}
   draw();setInterval(draw,100);
   navigator.mediaDevices.getUserMedia=async()=>canvas.captureStream(10);
   navigator.mediaDevices.enumerateDevices=async()=>[];
  });
  let gross=263,confidence='low';
  await page.route('**/api/analyze',async route=>{
   const payload=route.request().postDataJSON();requests.push(payload);
   return route.fulfill({json:{model:'mock-no-spend',usage:{input_tokens:0,output_tokens:0},result:{
    plateDetected:true,dishName:'Zelenina s přílohou',confidence:'medium',massEstimateConfidence:'medium',
    components:[{name:'Příloha',amountDescription:'větší část',estimatedMassShare:.75,estimatedGrams:gross===null?null:Math.round(gross*.75)},
     {name:'Zelenina',amountDescription:'menší část',estimatedMassShare:.25,estimatedGrams:gross===null?null:gross-Math.round(gross*.75)}],
    estimatedTotalGrams:null,remainingPercent:null,comparableToReference:payload.phase==='leftover',notes:'',
    scaleReading:{visible:true,grams:gross,confidence}
   }}});
  });
  await page.goto(base);
  await page.waitForFunction(()=>window.demo&&document.querySelector('video')?.readyState>=2);
  async function done(phase){await page.waitForFunction(p=>liveAnalysis.states[p]?.status==='done',phase);}
  async function retry(phase='reference'){
   const previous=requests.length;
   await page.locator(`[data-new-analysis="${phase}"]`).click();
   await page.waitForFunction(p=>liveAnalysis.states[p]?.status==='done',phase);
   assert.equal(requests.length,previous+1,'A new capture requests precisely one analysis');
  }
  async function beginReference(){
   await page.evaluate(()=>demo.go(1));
   await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
   await page.evaluate(()=>demo.go(2));await done('reference');
  }
  await page.evaluate(()=>demo.go(2));await done('reference');
  assert.equal(await page.locator('#weight').innerText(),'≈ 47','Low-confidence numeric OCR yields net food weight marked as estimated');
  assert.equal(await page.evaluate(()=>liveAnalysis.ready('reference')),true);
  assert.match(await page.locator('#results').innerText(),/≈\s*35\s*g/);
  assert.match(await page.locator('#results').innerText(),/≈\s*12\s*g/);
  assert.match(await page.locator('#results').innerText(),/odhad|nejist/i,'Uncertain reading is disclosed');
  assert(requests[0].scaleImage,'Same-frame display detail accompanies capture');

  gross=null;await retry();
  assert.equal(await page.locator('#weight').innerText(),'—');
  assert.equal(await page.evaluate(()=>liveAnalysis.ready('reference')),false);
  const countBeforeManual=requests.length;
  const form=page.locator('[data-confirm-weight="reference"]'),input=form.locator('[name="grossGrams"]');
  await input.fill('');await input.pressSequentially('263');
  await input.press('ArrowLeft');await input.press('ArrowRight');
  assert.equal(await page.evaluate(()=>demo.getState().step),2,'Typing digits and arrows never navigates slides');
  await form.evaluate(element=>element.requestSubmit());
  await page.waitForFunction(()=>document.querySelector('#weight').textContent==='47');
  assert.equal(requests.length,countBeforeManual,'Manual correction reuses recognized ingredients without API call');
  assert.equal(await page.evaluate(()=>liveAnalysis.ready('reference')),true);
  assert.match(await page.locator('#results').innerText(),/ručn|potvrzen/i);

  await retry();
  assert.equal(await page.locator('#weight').innerText(),'—','New capture clears previous manual gross');
  assert.equal(await page.evaluate(()=>liveAnalysis.ready('reference')),false);
  gross=215;confidence='high';await retry();
  assert.equal(await page.locator('#weight').innerText(),'—','Below-tare reading is invalid, not a fake zero');
  assert.equal(await page.evaluate(()=>liveAnalysis.ready('reference')),false);
  gross=216;await retry();
  assert.equal(await page.locator('#weight').innerText(),'0');
  assert.equal(await page.evaluate(()=>liveAnalysis.ready('reference')),false,'Empty plate cannot establish a full reference');

  await page.locator('#weight-settings-button').click();
  await page.locator('#plate-tare').fill('0');await page.locator('#plate-tare').dispatchEvent('change');
  await page.waitForFunction(()=>document.querySelector('#weight').textContent==='216');
  assert.equal(await page.evaluate(()=>demo.getState().step),2);
  await page.locator('#plate-tare').fill('216');await page.locator('#plate-tare').dispatchEvent('change');
  await page.locator('#subtract-plate').uncheck();
  await page.waitForFunction(()=>document.querySelector('#weight').textContent==='216');
  await page.locator('#subtract-plate').check();
  await page.waitForFunction(()=>document.querySelector('#weight').textContent==='0');
  await page.locator('#weight-settings-button').click();

  gross=416;await beginReference();
  assert.equal(await page.locator('#weight').innerText(),'200');
  gross=266;await page.evaluate(()=>demo.go(3));
  await page.waitForFunction(()=>document.querySelector('video')?.readyState>=2);
  await page.evaluate(()=>demo.next());await done('leftover');
  await page.evaluate(()=>demo.go(4));
  const result=await page.locator('#results').innerText();
  assert.match(result,/75\s*%/,'Eaten percentage uses net 200g ->50g');
  assert.match(result,/50\s*g/);assert.match(result,/≈\s*38\s*g/);assert.match(result,/≈\s*12\s*g/);
  assert.equal(requests.at(-1).reference.result.scaleReading.grams,416,'Reference OCR retained unchanged for comparison');
  gross=216;await retry('leftover');
  assert.equal(await page.evaluate(()=>liveAnalysis.ready('leftover')),true,'Zero food mass is a valid leftover result');
  assert.match(await page.locator('#results').innerText(),/100\s*%/);
  await page.screenshot({path:process.env.WEIGHT_SCREENSHOT||'/tmp/dojedeno-weight-flow.png'});
  assert.deepEqual(errors,[]);
  console.log(`PASS browser weight flow: ${requests.length} mocked calls; uncertain OCR, manual recovery, tare settings, keyboard isolation, net allocations and 75%/100% eaten. No paid API calls.`);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
