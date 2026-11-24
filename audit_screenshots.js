const { chromium } = require('playwright');
const path = require('path');
const url = require('url');
const fs = require('fs');

const outDir = path.resolve(__dirname, 'audit_shots');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  
  // Test both mobile (360x740) and desktop (1280x800)
  const viewports = [
    { name: 'mobile', width: 375, height: 750 },
    { name: 'desktop', width: 1200, height: 800 }
  ];

  for (const vp of viewports) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    const fileUrl = url.pathToFileURL(path.resolve(__dirname, 'www/index.html')).href;
    await page.goto(fileUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(500);

    const tabs = ['speed', 'practice', 'progress', 'academy', 'profile'];
    for (const tab of tabs) {
      await page.evaluate((t) => window.switchTab && window.switchTab(t), tab);
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, `${vp.name}_tab_${tab}_light.png`), fullPage: false });
    }

    // Now test dark theme
    await page.evaluate(() => {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('app_theme', 'dark');
    });
    for (const tab of tabs) {
      await page.evaluate((t) => window.switchTab && window.switchTab(t), tab);
      await page.waitForTimeout(200);
      await page.screenshot({ path: path.join(outDir, `${vp.name}_tab_${tab}_dark.png`), fullPage: false });
    }

    // Test games hub
    await page.evaluate(() => {
      if (window.GamesEngine) window.GamesEngine.openHub();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `${vp.name}_games_hub.png`), fullPage: false });

    // Test Notification Modal
    await page.evaluate(() => {
      if (window.NotificationService) window.NotificationService.openCenter();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `${vp.name}_notif_modal.png`), fullPage: false });

    // Close modal
    await page.evaluate(() => {
      if (window.NotificationService) window.NotificationService.closeCenter();
    });

    // Test OTG Modal
    await page.evaluate(() => {
      if (window.OTGKeyboardService) window.OTGKeyboardService.showInfoModal();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `${vp.name}_otg_modal.png`), fullPage: false });

    await page.evaluate(() => {
      if (window.OTGKeyboardService) window.OTGKeyboardService.hideInfoModal();
    });

    // Test Practice Studio
    await page.evaluate(() => {
      if (window.openPractice) window.openPractice();
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `${vp.name}_practice_studio.png`), fullPage: false });
    await page.evaluate(() => {
      if (window.closePractice) window.closePractice();
    });

    // Test Active Test (Parallel Mode)
    await page.evaluate(() => {
      if (window.startTest) window.startTest('parallel');
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `${vp.name}_test_parallel.png`), fullPage: false });

    // Test Results screen
    await page.evaluate(() => {
      const ta = document.getElementById('typingArea');
      if (ta) ta.value = "Education is the most powerful weapon which you can use to change the world. It empowers individuals with knowledge, critical thinking, and skills.";
      if (window.submitTest) window.submitTest(false);
    });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, `${vp.name}_results_screen.png`), fullPage: false });

    await page.close();
  }

  await browser.close();
  console.log('Audit screenshots captured in audit_shots/');
})();
