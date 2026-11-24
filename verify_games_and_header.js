const { chromium } = require('playwright');
const path = require('path');
const url = require('url');
const fs = require('fs');

const outDir = path.resolve(__dirname, 'verified_shots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();

  // Test mobile 360x740 (typical mobile viewport)
  const page = await browser.newPage({ viewport: { width: 360, height: 740 } });
  const fileUrl = url.pathToFileURL(path.resolve(__dirname, 'www/index.html')).href;
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(600);

  // 1. Mobile Header
  await page.screenshot({ path: path.join(outDir, '1_mobile_header_single_line.png') });
  console.log("Captured: 1_mobile_header_single_line.png");

  // Check that h1 is on single line: height should be around 16-22px, not > 30px
  const h1Box = await page.locator('.brand-text h1').boundingBox();
  console.log(`Brand H1 bounding box: width=${h1Box.width}, height=${h1Box.height}`);

  // 2. Games Hub on Mobile
  await page.evaluate(() => window.GamesEngine && window.GamesEngine.openHub());
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, '2_mobile_games_hub.png') });
  console.log("Captured: 2_mobile_games_hub.png");

  // 3. Bubble Word Challenge on Mobile
  await page.evaluate(() => {
    window.GamesEngine.start('bubble', 'en', 'qwerty');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '3_mobile_bubble_game.png') });
  console.log("Captured: 3_mobile_bubble_game.png");

  // 4. Falling Words Challenge on Mobile
  await page.evaluate(() => {
    window.GamesEngine.start('falling', 'en', 'qwerty');
  });
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, '4_mobile_falling_game.png') });
  console.log("Captured: 4_mobile_falling_game.png");

  // 5. Desktop Bubble Word Challenge
  const pageDesk = await browser.newPage({ viewport: { width: 1200, height: 800 } });
  await pageDesk.goto(fileUrl, { waitUntil: 'domcontentloaded' });
  await pageDesk.waitForTimeout(600);
  await pageDesk.evaluate(() => {
    window.GamesEngine.start('bubble', 'en', 'qwerty');
  });
  await pageDesk.waitForTimeout(500);
  await pageDesk.screenshot({ path: path.join(outDir, '5_desktop_bubble_game.png') });
  console.log("Captured: 5_desktop_bubble_game.png");

  // 6. Desktop Falling Words Challenge
  await pageDesk.evaluate(() => {
    window.GamesEngine.start('falling', 'en', 'qwerty');
  });
  await pageDesk.waitForTimeout(500);
  await pageDesk.screenshot({ path: path.join(outDir, '6_desktop_falling_game.png') });
  console.log("Captured: 6_desktop_falling_game.png");

  await browser.close();
  console.log("All verification screenshots captured successfully!");
  process.exit(0);
})();
