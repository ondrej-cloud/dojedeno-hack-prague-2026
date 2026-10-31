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
   function draw(){context.fillStyle='#303030';context.fillRect(0,0,480,360);if(present){context.fillStyle='#dadada';context.beginPath();context.ellipse(170,155,90,80,0,0,Math.PI*2);context.fill();}}
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

  await show(true);await waitStep(2);await page.waitForTimeout(1800);
  const box=await page.locator('.camera-box').boundingBox();
  const ring=await page.locator('.plate-outline').boundingBox();
  assert(ring,'outline visible');assert(Math.abs(ring.width-ring.height)<.01,'outline must be circular even for unequal detected dimensions');
  for(const [key,expected] of Object.entries({x:box.x+144,y:box.y+63,width:324,height:324}))assert(Math.abs(ring[key]-expected)<9,`${key}: ${ring[key]} vs ${expected}`);
  await page.screenshot({path:path.join(root,'screenshots/outline-offcenter.png')});
  assert.deepEqual(errors,[]);console.log('PASS off-center outline stays circular and centered on the detected object');
 } finally {if(browser)await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
