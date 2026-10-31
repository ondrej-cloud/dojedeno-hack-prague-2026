/* QA only: run with PLAYWRIGHT_MODULE pointing to an installed playwright package. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
(async()=>{
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
const page=await browser.newPage({viewport:{width:1920,height:1080}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const external=[];page.on('request',r=>{if(!r.url().startsWith('http://127.0.0.1:8080/'))external.push(r.url())});
await page.addInitScript(()=>{navigator.mediaDevices.getUserMedia=async()=>{throw new DOMException('Permission denied','NotAllowedError')};});
await page.route('**/config.json',r=>{const c=JSON.parse(fs.readFileSync(path.join(root,'config.json')));c.analysis={mode:'demo'};c.camera.source='local';c.detection.enabled=false;return r.fulfill({json:c});});await page.goto('http://127.0.0.1:8080');await page.waitForFunction(()=>window.demo);
const data=await page.evaluate(()=>demo.getData());assert(Math.abs(data.totals.kg-1400)<1e-6);
const month=JSON.parse(fs.readFileSync(path.join(root,'data/month.json')));const config=JSON.parse(fs.readFileSync(path.join(root,'config.json')));
for(const d of month.days){assert(Math.abs(d.dishes.reduce((n,x)=>n+x.plateKg,0)-d.plateKg)<1e-6);assert(Math.abs(d.dishes.reduce((n,x)=>n+x.unservedKg,0)-d.unservedKg)<1e-6);assert(Math.abs(Object.values(d.components).reduce((a,b)=>a+b,0)-d.plateKg)<1e-6);}
assert.equal(config.day.dishes.reduce((s,d)=>s+d.kg,0),config.day.plateKg+config.day.unservedKg+config.day.prepKg);
const overflow=[];
for(let s=1;s<=8;s++){await page.keyboard.press(String(s));if(s===3)await page.keyboard.press('ArrowRight');await page.waitForTimeout(2900);assert.equal(await page.locator('#progress').innerText(),`${s} / 8`);
const screen=(await page.locator('#scene').innerText()).replace(/\u00a0/g,' ');
assert(!/CO₂|CO2|120 000|−20 %/.test(screen),'stale claims removed');
if(s===4)assert.match(screen,/13,90 Kč/);
if(s===5){assert.match(screen,/70 kg/);assert.match(screen,/3 145 Kč/);assert.match(screen,/75 porcí/);}
if(s===6){assert.match(screen,/672 kg/);assert.match(screen,/62 160 Kč/);assert.match(screen,/1 505 porcí/);const rows=await page.locator('.ranking-row .name').allTextContents();assert.match(rows[0],/Špenát/);assert.match(rows[1],/Koprov/);}
if(s===7){assert.match(screen,/35 porcí méně/);assert.match(screen,/60 000 Kč/);assert.match(screen,/Příklad, ne slib/);assert.match(screen,/47 %/);}
await page.screenshot({path:path.join(root,`screenshots/step-${s}.png`)});const items=await page.evaluate(()=>[...document.querySelectorAll('main .panel,main .summary,main .note,main .under-camera')].filter(e=>{const r=e.getBoundingClientRect();return r.bottom>997||r.right>1849}).map(e=>e.className));if(items.length)overflow.push({s,items});}
for(let s=7;s>=1;s--){await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('#progress').innerText(),`${s} / 8`);}
await page.keyboard.press('2');await page.keyboard.press('r');await page.waitForTimeout(1800);assert.match(await page.locator('#results').innerText(),/Čekám na talíř/);
for(const key of ['PageDown','Space'])await page.keyboard.press(key);assert.equal((await page.evaluate(()=>demo.getState())).step,3);await page.keyboard.press('PageDown');assert.equal((await page.evaluate(()=>demo.getState())).captured,true);await page.keyboard.press('PageDown');assert.equal((await page.evaluate(()=>demo.getState())).step,4);
await page.keyboard.press('h');assert.equal(await page.locator('#help').isVisible(),true);await page.keyboard.press('h');await page.keyboard.press('c');await page.keyboard.press('c');await page.keyboard.press('r');
await page.setViewportSize({width:1280,height:720});await page.keyboard.press('6');await page.waitForTimeout(1800);await page.screenshot({path:path.join(root,'screenshots/step-6-720p.png')});
assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.deepEqual(overflow,[]);
// A second browser context tests the successful camera path with synthetic media.
await browser.close();
const cameraBrowser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--use-fake-device-for-media-stream','--use-fake-ui-for-media-stream']});
const cameraPage=await cameraBrowser.newPage();cameraPage.on('pageerror',e=>errors.push(e.message));await cameraPage.route('**/config.json',r=>{const c=JSON.parse(fs.readFileSync(path.join(root,'config.json')));c.analysis={mode:'demo'};c.camera.source='local';c.detection.enabled=false;return r.fulfill({json:c});});await cameraPage.goto('http://127.0.0.1:8080');await cameraPage.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await cameraPage.keyboard.press('2');await cameraPage.waitForTimeout(1700);assert.equal(await cameraPage.locator('canvas.snapshot').isVisible(),true);await cameraPage.keyboard.press('6');await cameraPage.keyboard.press('2');await cameraPage.waitForFunction(()=>!document.querySelector('canvas.snapshot').hidden);await cameraPage.keyboard.press('4');await cameraPage.waitForFunction(()=>!document.querySelector('canvas.snapshot').hidden);await cameraPage.keyboard.press('3');await cameraPage.waitForFunction(()=>document.querySelector('video')?.readyState>=2);await cameraPage.keyboard.press('ArrowRight');await cameraPage.waitForTimeout(2200);assert.equal(await cameraPage.locator('#weight-status').innerText(),'ustáleno ✓');assert.equal(await cameraPage.locator('#weight').innerText(),'+150');await cameraPage.keyboard.press('c');assert.equal(await cameraPage.locator('video').isVisible(),false);assert.deepEqual(errors,[]);await cameraBrowser.close();
console.log('PASS: 8 steps, reverse, jumps, reset/timer cancellation, clicker, help, 720p, data sums, denied and successful camera, no external requests or console errors.');
})().catch(e=>{console.error(e);process.exit(1)});
