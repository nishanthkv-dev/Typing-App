const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 12/13/14 mobile viewport
    deviceScaleFactor: 2
  });
  const page = await context.newPage();
  
  const fileUrl = 'file://' + path.resolve(__dirname, 'www/index.html').replace(/\\/g, '/');
  await page.goto(fileUrl, { waitUntil: 'load' });
  await page.waitForTimeout(1000);

  // 1. Capture Mobile Home with Passage Selector showing [FREE] and [PRO]
  await page.screenshot({
    path: path.join(__dirname, 'screenshot_1_guest_passage_selector.png'),
    fullPage: false
  });

  // 2. Open Biryani Upgrade Modal
  await page.evaluate(() => {
    window.openBiryaniUpgradeModal('ta', 5);
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(__dirname, 'screenshot_2_biryani_upgrade_modal.png'),
    fullPage: false
  });

  // 3. Open Single-Device Revoked Modal
  await page.evaluate(() => {
    window.closeBiryaniUpgradeModal();
    const m = document.getElementById('deviceRevokedModal');
    if (m) m.style.display = 'flex';
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(__dirname, 'screenshot_3_device_revoked_modal.png'),
    fullPage: false
  });

  // 4. Open Profile tab with Account Access Card
  await page.evaluate(() => {
    const m = document.getElementById('deviceRevokedModal');
    if (m) m.style.display = 'none';
    if (typeof window.switchTab === 'function') {
      window.switchTab('profile');
    }
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(__dirname, 'screenshot_4_profile_account_access_card.png'),
    fullPage: false
  });

  console.log('All screenshots captured successfully.');
  await browser.close();
  process.exit(0);
})();
