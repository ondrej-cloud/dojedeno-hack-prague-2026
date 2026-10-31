/* Local Chrome/Playwright check. Blocks API calls; does not use the phone camera. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const url = pathToFileURL(path.resolve(__dirname, '../index.html')).href;
(async () => {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.route('**/api/**', r => r.fulfill({ status: 204 }));
    await page.goto(url);
    await page.waitForFunction(() => !!window.deck);
    await page.waitForTimeout(800);
    assert.equal(await page.locator('#s-uvod.uvod-pripraven').count(), 1, 'starts paused');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => deck.krok), 0, 'first arrow plays the film');
    assert.equal(await page.locator('#s-uvod.uvod-pripraven').count(), 0);
    await page.waitForFunction(() => document.querySelector('.kino-kos-presun'), {}, { timeout: 20000, polling: 50 });
    assert.equal(await page.evaluate(() => deck.krok), 1, 'film automatically advances to title');
    await page.waitForTimeout(800);
    if (process.env.SCREENSHOT_DIR) await page.screenshot({ path: path.join(process.env.SCREENSHOT_DIR, 'intro-transition.png') });
    await page.waitForTimeout(1400);
    assert.equal(await page.locator('.kino-kos-presun').count(), 0, 'transition cleans up');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => deck.slajd), 1);
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#s-uvod.uvod-pripraven').count(), 1, 'return rewinds and pauses');
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(500);
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#s-uvod.uvod-pripraven').count(), 1, 'left during film rewinds');
    await page.waitForTimeout(500);
    assert.equal(await page.evaluate(() => deck.krok), 0);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => deck.krok), 1, 'second arrow skips film');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url);
    await page.waitForFunction(() => !!window.deck);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => deck.krok === 1);
    assert.equal(await page.locator('.kino-kos-presun').count(), 0, 'reduced motion has no travelling bucket');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.addInitScript(() => {
      const getContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function(type, ...args) {
        return /webgl/.test(type) ? null : getContext.call(this, type, ...args);
      };
    });
    await page.goto(url);
    await page.waitForFunction(() => !!window.deck);
    assert.equal(await page.locator('#s-uvod.kino').count(), 0);
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => deck.krok === 1, {}, { timeout: 8000 });
    await page.keyboard.press('ArrowLeft');
    assert.equal(await page.locator('#s-uvod.uvod-pripraven').count(), 1, '2D fallback also rewinds');
    assert.deepEqual(errors, []);
    console.log('PASS: play, automatic transition, rewind, replay, skip, reduced motion and 2D fallback. No page errors.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
