const assert = require('assert');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { createServer } = require('./backend/server');
const { computeXVerify } = require('./backend/services/phonepeService');

const tmpDb = path.join(__dirname, 'backend', 'data', `test_gate_${Date.now()}.json`);

async function reqJson(baseUrl, method, p, body, headers = {}) {
  const res = await fetch(`${baseUrl}${p}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...headers },
    body: body !== undefined ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

(async () => {
  let phonepeMockState = { code: 'PAYMENT_SUCCESS', transactionId: 'PP_MOCK_TXN_1' };
  const mockPhonePeFetch = async (url, opts) => {
    if (String(url).includes('/pg/v1/pay')) {
      return { json: async () => ({ success: true, code: 'PAYMENT_INITIATED', data: { instrumentResponse: { redirectInfo: { url: 'https://sandbox.phonepe/pay/123' } } } }) };
    }
    return { json: async () => ({ success: true, code: phonepeMockState.code, data: { state: phonepeMockState.code, transactionId: phonepeMockState.transactionId, amount: 29900 } }) };
  };

  const app = createServer({
    dbDriver: 'json',
    dbPath: tmpDb,
    port: 0,
    host: '127.0.0.1',
    nodeEnv: 'test',
    phonepeMerchantId: 'TESTMERCHANT',
    phonepeSaltKey: 'test-salt-key-123',
    phonepeSaltIndex: '1',
    phonepeFetch: mockPhonePeFetch,
    adminBootstrapEmail: 'admin@test.local',
    adminBootstrapPassword: 'StrongAdminPass!123'
  });

  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${app.server.address().port}`;
  let browser;
  try {
    // 1. Backend Auth, City, Progress 410, Exams, Expiry, PhonePe
    const reg = await reqJson(baseUrl, 'POST', '/api/auth/register', { name: 'Gate Student', email: 'gate@test.local', password: 'StrongStudent!123', phone: '9876543210' });
    assert.strictEqual(reg.status, 201, 'Student registered');
    const stuToken = reg.data.token;
    const stuHeaders = { Authorization: `Bearer ${stuToken}` };

    const admLogin = await reqJson(baseUrl, 'POST', '/api/admin/auth/login', { email: 'admin@test.local', password: 'StrongAdminPass!123' });
    assert.strictEqual(admLogin.status, 200, 'Admin logged in');
    const admHeaders = { Authorization: `Bearer ${admLogin.data.token}` };

    // Student cannot hit admin API
    const unauthAdm = await reqJson(baseUrl, 'GET', '/api/admin/overview', undefined, stuHeaders);
    assert.ok(unauthAdm.status === 401 || unauthAdm.status === 403, 'Student blocked from admin API');

    // Progress endpoint disabled (410 Gone - local-only)
    const progPost = await reqJson(baseUrl, 'POST', '/api/student/progress', { entry: { netWpm: 40 } }, stuHeaders);
    assert.strictEqual(progPost.status, 410, 'POST /api/student/progress returns 410 Gone');

    // Profile city validation + persistence
    const badCity = await reqJson(baseUrl, 'PUT', '/api/student/profile', { city: 'A'.repeat(65) }, stuHeaders);
    assert.strictEqual(badCity.status, 400, 'City > 60 chars rejected');
    const okCity = await reqJson(baseUrl, 'PUT', '/api/student/profile', { city: '  Chennai  ' }, stuHeaders);
    assert.strictEqual(okCity.status, 200);
    assert.strictEqual(okCity.data.user.city, 'Chennai', 'City trimmed & saved');

    // Central Exams CRUD + Upcoming
    const exAdd = await reqJson(baseUrl, 'POST', '/api/admin/exams', { name: 'DoTE Nov 2027', date: '2027-11-15', registrationDeadline: '2027-10-01' }, admHeaders);
    assert.strictEqual(exAdd.status, 201, 'Admin created central exam');
    const exUpc = await reqJson(baseUrl, 'GET', '/api/exams/upcoming');
    assert.strictEqual(exUpc.status, 200);
    assert.strictEqual(exUpc.data.nextExam.name, 'DoTE Nov 2027', 'Upcoming exam returned for Premium Pass');

    // PhonePe initiation + webhook + status + expiry enforcement
    const ppInit = await reqJson(baseUrl, 'POST', '/api/payments/phonepe/initiate', { courseId: 'combo_speed' }, stuHeaders);
    assert.strictEqual(ppInit.status, 201, 'PhonePe order initiated');
    const orderId = ppInit.data.merchantOrderId;

    // Pending/Failed must not count toward revenue
    const ovBefore = await reqJson(baseUrl, 'GET', '/api/admin/overview', undefined, admHeaders);
    assert.strictEqual(ovBefore.data.metrics.totalRevenueInr, 0, 'Pending payment excluded from revenue');

    // Signed webhook PAYMENT_SUCCESS
    const whPayload = Buffer.from(JSON.stringify({ code: 'PAYMENT_SUCCESS', data: { merchantTransactionId: orderId, transactionId: 'PP_TXN_OK' } }), 'utf8').toString('base64');
    const xVerify = computeXVerify(whPayload, 'test-salt-key-123', '1');
    const whRes = await reqJson(baseUrl, 'POST', '/api/payments/phonepe/webhook', { response: whPayload }, { 'x-verify': xVerify });
    assert.strictEqual(whRes.status, 200);
    assert.strictEqual(whRes.data.status, 'PAID');

    // Duplicate webhook idempotency
    const whDup = await reqJson(baseUrl, 'POST', '/api/payments/phonepe/webhook', { response: whPayload }, { 'x-verify': xVerify });
    assert.strictEqual(whDup.status, 200);

    const ovAfter = await reqJson(baseUrl, 'GET', '/api/admin/overview', undefined, admHeaders);
    assert.ok(ovAfter.data.metrics.totalRevenueInr > 0, 'Verified PhonePe payment counted in revenue');

    // Expiry enforcement
    const enrId = ppInit.data.enrollment.id;
    const expRes = await reqJson(baseUrl, 'PUT', `/api/admin/enrollments/${enrId}/expiry`, { expiresAt: '2020-01-01', reason: 'QA expiry test' }, admHeaders);
    assert.strictEqual(expRes.status, 200);
    const dashAfterExp = await reqJson(baseUrl, 'GET', '/api/student/dashboard', undefined, stuHeaders);
    assert.strictEqual(dashAfterExp.data.entitlement.maxPassages, 2, 'Expired enrollment loses premium access backend-side');

    // 2. Playwright UI + Network-Capture Gate
    try { browser = await chromium.launch({ headless: true }); }
    catch { browser = await chromium.launch({ headless: true, channel: 'msedge' }); }
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const outgoingRequests = [];
    page.on('request', r => {
      if (r.url().startsWith('http')) outgoingRequests.push({ url: r.url(), method: r.method(), postData: r.postData() || '' });
    });

    await page.goto('file:///d:/Users/Nishanth/Desktop/mobile%20app/www/index.html', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);

    // Check 5m duration removed & default is 2m
    const durCheck = await page.evaluate(() => ({
      has300: !!document.querySelector('input[name="tl"][value="300"]'),
      checkedVal: (document.querySelector('input[name="tl"]:checked') || {}).value
    }));
    assert.strictEqual(durCheck.has300, false, '5m (300s) test option removed');
    assert.strictEqual(durCheck.checkedVal, '120', 'Default duration is 2m (120s)');

    // Check Reverse minimal UI hides stats, title, progress, subtitle
    await page.evaluate(() => { window.switchTab('practice'); window.openPracticeReverse(); });
    await page.waitForTimeout(100);
    const revUi = await page.evaluate(() => {
      const cs = (id) => getComputedStyle(document.getElementById(id)).display;
      const statsCs = getComputedStyle(document.querySelector('#screen-practice .drill-stats-row')).display;
      return {
        statsCs,
        titleCs: cs('pracLessonTitle'),
        pctCs: cs('pracProgressPct'),
        subCs: cs('pracSub')
      };
    });
    assert.strictEqual(revUi.statsCs, 'none', 'Reverse UI hides stats row');
    assert.strictEqual(revUi.titleCs, 'none', 'Reverse UI hides exercise name');
    assert.strictEqual(revUi.pctCs, 'none', 'Reverse UI hides progress %');
    assert.strictEqual(revUi.subCs, 'none', 'Reverse UI hides drill subtitle');

    // Check Back navigation returns cleanly to Drill Home
    await page.evaluate(() => window.__ttHandleBack(false));
    assert.strictEqual(await page.evaluate(() => document.querySelector('.tab-content.active').id), 'tab-practice', 'Back from Reverse returns to Drill Home');

    // Check Network-Capture: saveResult + setStudentAvatar send ZERO HTTP payloads
    await page.evaluate(async () => {
      window.setStudentAvatar('data:image/jpeg;base64,/9j/4AAQSkZJRg==', true);
      await window.saveResult({ netWpm: 42, grossWpm: 45, accuracy: 96, errors: 1, marks: 98, passed: true }, 'test', 'test', 'parallel');
    });
    const leaked = outgoingRequests.filter(r => r.url.includes('progress') || r.postData.includes('student_avatar') || r.postData.includes('netWpm'));
    assert.strictEqual(leaked.length, 0, 'Zero report/photo payloads sent over network');

    console.log('ALL_MASTER_PROMPT_GATE_CHECKS_PASSED');
  } finally {
    if (browser) await browser.close();
    app.server.close();
    try { fs.unlinkSync(tmpDb); } catch (_) {}
  }
})().catch(err => {
  console.error('MASTER_GATE_FAILED:', err);
  process.exit(1);
});
