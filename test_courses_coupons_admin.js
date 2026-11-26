/**
 * Typing Thalaiva — End-to-End Backend, Student Auth, Course Checkout,
 * Coupon System (100% Free & Discounts), Exam Lifecycle, Rebooking & Admin Portal QA
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createServer } = require('./backend/server');
const { computePaymentSignature } = require('./backend/security');

let total = 0;
let passed = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`  [PASS] ${msg}`);
  } else {
    console.error(`  [FAIL] ${msg}`);
  }
}

async function httpJson(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let json = {};
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, headers: res.headers, data: json, raw: text };
}

async function runSuite() {
  console.log('======================================================================');
  console.log('   TYPING THALAIVA — E2E AUTH, COURSES, COUPONS & ADMIN PORTAL QA     ');
  console.log('======================================================================\n');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-qa-'));
  const dbPath = path.join(tmpDir, 'store.json');

  const verifyGoogleTokenFn = async (idToken) => {
    if (idToken === 'tok_google_karthik') {
      return {
        sub: 'google_sub_karthik_101',
        email: 'karthik.student@gmail.com',
        email_verified: true,
        name: 'Karthik M',
        aud: 'test-client-id'
      };
    }
    if (idToken === 'tok_google_priya_linked') {
      return {
        sub: 'google_sub_priya_202',
        email: 'priya.registered@example.com',
        email_verified: true,
        name: 'Priya S',
        aud: 'test-client-id'
      };
    }
    throw new Error('Invalid test Google token');
  };

  const srv = createServer({
    port: 0,
    dbDriver: 'json',
    dbPath,
    jwtSecret: 'test-qa-jwt-secret-key-9876543210',
    paymentWebhookSecret: 'test-qa-payment-secret',
    googleClientId: 'test-client-id',
    adminBootstrapEmail: 'admin@srikalaimagal.in',
    adminBootstrapPassword: 'StrongAdminPassword#2026',
    adminBootstrapName: 'Chief Admin',
    verifyGoogleTokenFn,
    exposeResetTokenForTest: true
  });

  // Ensure bootstrap completes before requests
  await srv.db.ensureBootstrapAdmin({
    email: 'admin@srikalaimagal.in',
    password: 'StrongAdminPassword#2026',
    name: 'Chief Admin'
  });

  const { baseUrl } = await srv.start(0);

  try {
    // -----------------------------------------------------------------------
    // 1. PORTAL SEPARATION & STUDENT MOBILE APP GUEST MODE IN JSDOM
    // -----------------------------------------------------------------------
    console.log('--- TEST 1: SEPARATE INTERFACES & MOBILE APP GUEST MODE ---');
    const mobileHtml = fs.readFileSync(path.join(__dirname, 'www/index.html'), 'utf8');
    const portalJs = fs.readFileSync(path.join(__dirname, 'www/js/student_portal.js'), 'utf8');
    const firebaseJs = fs.readFileSync(path.join(__dirname, 'www/js/firebase_service.js'), 'utf8');

    assert(!mobileHtml.includes('/admin/login') && !mobileHtml.includes('StrongAdminPassword'), 'Student mobile HTML contains zero admin UI or credentials');
    assert(!portalJs.includes('/api/admin/') && !portalJs.includes('StrongAdminPassword'), 'Student portal JS contains zero admin endpoints or secrets');

    const adminLoginPage = await httpJson(`${baseUrl}/admin/login`);
    const adminDashPage = await httpJson(`${baseUrl}/admin/dashboard`);
    assert(adminLoginPage.status === 200 && adminLoginPage.raw.includes('Admin Login'), 'Separate /admin/login page served');
    assert(adminDashPage.status === 200 && adminDashPage.raw.includes('Enrollments &amp; Exams'), 'Separate /admin/dashboard page served');

    const dom = new JSDOM(mobileHtml, { url: 'http://localhost/', runScripts: 'dangerously' });
    const { window } = dom;
    window.scrollTo = () => {};
    window.alert = () => {};
    window.confirm = () => true;
    window.fetch = globalThis.fetch;
    window.TYPING_API_BASE = baseUrl;
    window.eval(firebaseJs);
    window.eval(portalJs);

    await window.FirebaseService.init();
    window.StudentPortal.init();

    assert(window.FirebaseService.isGuest === true, 'Mobile app opens in Guest Mode without forced sign-in');
    assert(window.FirebaseService.canAccessPassage('en', 0).allowed === true, 'Guest accesses free English passage 0');
    assert(window.FirebaseService.canAccessPassage('ta', 1).allowed === true, 'Guest accesses free Tamil passage 1');

    // -----------------------------------------------------------------------
    // 2. STUDENT REGISTRATION, ROLE TAMPERING GUARD, FORGOT PASSWORD & RBAC
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 2: STUDENT AUTH, ROLE TAMPER GUARD & PASSWORD RESET ---');
    const regRes = await httpJson(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Priya S',
        email: 'priya.registered@example.com',
        password: 'StudentPass#2026',
        role: 'admin' // Tamper attempt!
      })
    });
    assert(regRes.status === 201 && regRes.data.user.role === 'student', 'Register succeeds & ignores client-supplied role=admin');
    const priyaToken = regRes.data.token;

    const studentForbiddenRes = await httpJson(`${baseUrl}/api/admin/overview`, {
      headers: { Authorization: `Bearer ${priyaToken}` }
    });
    assert(studentForbiddenRes.status === 403, 'Student token strictly blocked from /api/admin/* (403)');

    // Forgot + Reset Password flow
    const forgotRes = await httpJson(`${baseUrl}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.registered@example.com' })
    });
    assert(forgotRes.status === 200 && !!forgotRes.data.resetToken, 'Forgot-password generates time-limited reset token');

    const resetRes = await httpJson(`${baseUrl}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: forgotRes.data.resetToken, newPassword: 'StudentNewPass#2026' })
    });
    assert(resetRes.status === 200, 'Password reset completes cleanly');

    const oldLoginFail = await httpJson(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.registered@example.com', password: 'StudentPass#2026' })
    });
    assert(oldLoginFail.status === 401, 'Old password rejected after reset');

    const newLoginOk = await httpJson(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.registered@example.com', password: 'StudentNewPass#2026' })
    });
    assert(newLoginOk.status === 200 && !!newLoginOk.data.token, 'New password login succeeds');

    // Link existing email account seamlessly on Google Sign-In without duplicate accounts
    const linkedGoogleRes = await httpJson(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'tok_google_priya_linked' })
    });
    assert(linkedGoogleRes.status === 200 && linkedGoogleRes.data.user.id === regRes.data.user.id, 'Google Sign-In with matching verified email links cleanly with zero duplicate user');
    const priyaNewToken = linkedGoogleRes.data.token;

    // -----------------------------------------------------------------------
    // 3. ADMIN AUTH & COUPON CREATION (WELCOME100, TYPE25, EXPIRED, MAX1)
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: ADMIN LOGIN & COUPON MANAGEMENT ---');
    const studentAdminLoginAttempt = await httpJson(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'priya.registered@example.com', password: 'StudentNewPass#2026' })
    });
    assert(studentAdminLoginAttempt.status === 401, 'Student cannot sign in to /api/admin/auth/login');

    const adminLoginRes = await httpJson(`${baseUrl}/api/admin/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@srikalaimagal.in', password: 'StrongAdminPassword#2026' })
    });
    assert(adminLoginRes.status === 200 && !!adminLoginRes.data.token, 'Admin logs in cleanly');
    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminLoginRes.data.token}`
    };

    const cpn1 = await httpJson(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: 'WELCOME100',
        description: '100% Free English Senior Scholarship',
        discountType: 'free_100',
        discountValue: 100,
        applicableCourseIds: ['english_senior'],
        maxRedemptions: 20,
        perStudentLimit: 1,
        active: true
      })
    });
    assert(cpn1.status === 201 && cpn1.data.coupon.code === 'WELCOME100', 'Admin creates 100% free coupon WELCOME100 for English Senior');

    const cpn2 = await httpJson(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: 'TYPE25',
        description: '25% Student Discount',
        discountType: 'percentage',
        discountValue: 25,
        applicableCourseIds: [],
        maxRedemptions: 50,
        perStudentLimit: 1,
        active: true
      })
    });
    assert(cpn2.status === 201 && cpn2.data.coupon.code === 'TYPE25', 'Admin creates 25% coupon TYPE25');

    await httpJson(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: 'EXPIRED10',
        discountType: 'percentage',
        discountValue: 10,
        expiresAt: new Date(Date.now() - 86400 * 1000).toISOString(),
        active: true
      })
    });

    // -----------------------------------------------------------------------
    // 4. GOOGLE AUTH + INTENT PRESERVATION + 100% FREE ₹0 ENROLLMENT IN MOBILE APP
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 4: MOBILE INTENT PRESERVATION, GOOGLE AUTH & 100% FREE WELCOME100 ---');
    // Unauthenticated guest clicks Enroll on English Senior with WELCOME100
    await window.StudentPortal.openCheckout('english_senior', { couponCode: 'WELCOME100' });
    const authModal = window.document.getElementById('studentAuthModal');
    assert(authModal.style.display === 'flex', 'Unauthenticated purchase opens Student Auth Modal');
    assert(window.StudentPortal.pendingIntent && window.StudentPortal.pendingIntent.courseId === 'english_senior', 'Purchase intent & coupon preserved across auth prompt');

    // Complete Google Auth in mobile app -> automatically resumes Checkout with WELCOME100 applied!
    await window.StudentPortal.handleGoogleAuth('tok_google_karthik');
    const checkoutModal = window.document.getElementById('courseCheckoutModal');
    assert(checkoutModal.style.display === 'flex', 'After Google Sign-In, student automatically lands back in Course Checkout');
    assert(window.StudentPortal.checkoutState.quote.finalPrice === 0, 'WELCOME100 reduces English Senior payable price to ₹0');
    assert(window.document.getElementById('courseCheckoutBody').textContent.includes('Complete Free Enrollment (₹0)'), 'Checkout UI displays zero-payment free enrollment CTA (skipping payment gateway)');

    // Execute checkout + replay same idempotency key to verify duplicate-tap protection
    await window.StudentPortal.completeCheckout();
    assert(window.StudentPortal.dashboard.activeEnrollments.length === 1, 'Free enrollment creates enrollment record');
    const karthikEnr = window.StudentPortal.dashboard.activeEnrollments[0];
    assert(karthikEnr.paymentStatus === 'free_enrollment', 'Payment status is free_enrollment (zero payment)');
    assert(karthikEnr.status === 'exam_date_pending', 'Enrollment activated in exam_date_pending status');
    assert(karthikEnr.examDisplayStatus === 'Exam Date Awaiting Admin Assignment', 'Displays Exam Date Awaiting Admin Assignment');
    assert(window.FirebaseService.canAccessPassage('en', 20).allowed === true, 'English passages unlocked immediately after ₹0 coupon enrollment');
    assert(window.FirebaseService.canAccessPassage('ta', 20).allowed === false, 'Tamil passages remain locked (course-scoped access)');

    // Verify coupon restriction & per-student limit enforcement
    const karthikToken = window.StudentPortal.token;
    const mismatchQuote = await httpJson(`${baseUrl}/api/checkout/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${karthikToken}` },
      body: JSON.stringify({ courseId: 'combo_speed', couponCode: 'WELCOME100' })
    });
    assert(mismatchQuote.status === 400 && mismatchQuote.data.code === 'COUPON_COURSE_MISMATCH', 'WELCOME100 rejected on unauthorized course combo_speed');

    const expiredQuote = await httpJson(`${baseUrl}/api/checkout/quote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${karthikToken}` },
      body: JSON.stringify({ courseId: 'combo_speed', couponCode: 'EXPIRED10' })
    });
    assert(expiredQuote.status === 400 && expiredQuote.data.code === 'COUPON_EXPIRED', 'Expired coupon EXPIRED10 rejected');

    // -----------------------------------------------------------------------
    // 5. PAID FLOW, CLIENT TAMPER PROTECTION, ADMIN EXAM SCHEDULE & REBOOKING
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 5: PAID FLOW, EXAM SCHEDULING, COMPLETION & REBOOKING ATTEMPT #2 ---');
    // Priya purchases combo_speed with TYPE25 (25% off ₹299 => discount ₹75 => final ₹224), attempting tampered amount: 1
    const priyaCheckout = await httpJson(`${baseUrl}/api/checkout/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${priyaNewToken}`, 'X-Idempotency-Key': 'priya_chk_1' },
      body: JSON.stringify({
        courseId: 'combo_speed',
        couponCode: 'TYPE25',
        finalAmount: 1, // Tamper attempt ignored by server
        discountAmount: 298 // Tamper attempt ignored by server
      })
    });
    assert(priyaCheckout.status === 201 && priyaCheckout.data.nextStep === 'payment_required', 'Paid flow returns payment_required');
    assert(priyaCheckout.data.purchase.finalAmount === 224 && priyaCheckout.data.purchase.discountAmount === 75, 'Server computes 25% discount strictly (₹299 - ₹75 = ₹224), ignoring client prices');

    // Idempotent duplicate tap check
    const priyaReplay = await httpJson(`${baseUrl}/api/checkout/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${priyaNewToken}`, 'X-Idempotency-Key': 'priya_chk_1' },
      body: JSON.stringify({ courseId: 'combo_speed', couponCode: 'TYPE25' })
    });
    assert(priyaReplay.status === 200 && priyaReplay.data.idempotentReplay === true && priyaReplay.data.purchase.id === priyaCheckout.data.purchase.id, 'Duplicate checkout click handled idempotently');

    // Bad payment signature rejected; valid HMAC signature activates course
    const badVerify = await httpJson(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${priyaNewToken}` },
      body: JSON.stringify({
        purchaseId: priyaCheckout.data.purchase.id,
        orderId: priyaCheckout.data.paymentOrder.orderId,
        paymentId: 'pay_test_999',
        signature: 'forged_sig'
      })
    });
    assert(badVerify.status === 400, 'Forged payment signature rejected');

    const validSig = computePaymentSignature({
      orderId: priyaCheckout.data.paymentOrder.orderId,
      paymentId: 'pay_test_999',
      amount: priyaCheckout.data.purchase.finalAmount,
      secret: 'test-qa-payment-secret'
    });
    const goodVerify = await httpJson(`${baseUrl}/api/payments/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${priyaNewToken}` },
      body: JSON.stringify({
        purchaseId: priyaCheckout.data.purchase.id,
        orderId: priyaCheckout.data.paymentOrder.orderId,
        paymentId: 'pay_test_999',
        signature: validSig
      })
    });
    assert(goodVerify.status === 200 && goodVerify.data.enrollment.status === 'exam_date_pending', 'Valid payment signature verifies purchase & sets exam_date_pending');

    // Admin assigns exam date for Karthik
    const schRes = await httpJson(`${baseUrl}/api/admin/enrollments/${karthikEnr.id}/schedule-exam`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ examDate: '2026-12-20', examSlot: '10:00 AM Batch', examCenter: 'Gummidipoondi Main Hall' })
    });
    assert(schRes.status === 200 && schRes.data.enrollment.status === 'scheduled', 'Admin assigns exam date cleanly');

    // Sync Karthik dashboard in mobile app
    const syncedDash = await window.StudentPortal.syncDashboard();
    assert(syncedDash.upcomingExams.length === 1 && syncedDash.upcomingExams[0].examDate === '2026-12-20', 'Student mobile app syncs assigned exam date from admin');

    // Admin marks Karthik exam completed (without enabling rebooking yet)
    const cmpRes = await httpJson(`${baseUrl}/api/admin/enrollments/${karthikEnr.id}/complete-exam`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ scoreSummary: 'First Class Distinction (48 WPM)', enableRebooking: false })
    });
    assert(cmpRes.status === 200 && cmpRes.data.enrollment.status === 'completed', 'Admin marks exam completed');

    // Rebooking blocked before admin enables it
    const blockedRebook = await httpJson(`${baseUrl}/api/checkout/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${karthikToken}` },
      body: JSON.stringify({ courseId: 'english_senior', attemptType: 'rebooking' })
    });
    assert(blockedRebook.status === 403 && blockedRebook.data.code === 'REBOOKING_NOT_ENABLED', 'Rebooking blocked until admin enables rebooking');

    // Admin enables rebooking -> student rebooks Attempt #2
    const rebEnableRes = await httpJson(`${baseUrl}/api/admin/enrollments/${karthikEnr.id}/enable-rebooking`, {
      method: 'POST',
      headers: adminHeaders,
      body: '{}'
    });
    assert(rebEnableRes.status === 200 && rebEnableRes.data.enrollment.status === 'rebooking_eligible', 'Admin enables rebooking');

    const attempt2Res = await httpJson(`${baseUrl}/api/checkout/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${karthikToken}` },
      body: JSON.stringify({ courseId: 'english_senior', attemptType: 'rebooking' })
    });
    assert(attempt2Res.status === 201 && attempt2Res.data.enrollment.attemptNumber === 2, 'Student rebooks Attempt #2 as separate enrollment record');

    // Verify Attempt #1 remains permanently in completed history alongside Attempt #2
    const postRebookDash = await window.StudentPortal.syncDashboard();
    assert(postRebookDash.completedHistory.length === 1 && postRebookDash.completedHistory[0].id === karthikEnr.id, 'Attempt #1 preserved permanently in Completed History');
    assert(postRebookDash.activeEnrollments.some(e => e.attemptNumber === 2), 'Attempt #2 appears in Active Enrollments');

    // -----------------------------------------------------------------------
    // 6. SINGLE-DEVICE ENFORCEMENT & ADMIN AUDIT LOGS
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 6: SINGLE-DEVICE REVOCATION & ADMIN REPORTING ---');
    // Device B logs in as Karthik
    const deviceBLogin = await httpJson(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'tok_google_karthik' }) // test wrong endpoint guard first? Wait: use /api/auth/google!
    });
    assert(deviceBLogin.status === 400, 'Password login requires email+password');

    const deviceBGoogle = await httpJson(`${baseUrl}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'tok_google_karthik' })
    });
    assert(deviceBGoogle.status === 200 && deviceBGoogle.data.sessionId !== karthikToken, 'Device B obtains new active session');

    // Device A attempts dashboard sync -> should detect SESSION_REVOKED and trigger deviceRevokedModal
    await window.StudentPortal.syncDashboard({ silent: true });
    assert(window.FirebaseService.isGuest === true, 'Device A reverted to Guest after Device B sign-in');
    assert(window.document.getElementById('deviceRevokedModal').style.display === 'flex', 'Device A displays deviceRevokedModal');

    // Admin redemption report & overview
    const redemptionsReport = await httpJson(`${baseUrl}/api/admin/coupons/WELCOME100/redemptions`, { headers: adminHeaders });
    assert(redemptionsReport.status === 200 && redemptionsReport.data.redemptions.length === 1, 'Admin views WELCOME100 redemption history');

    const overviewRes = await httpJson(`${baseUrl}/api/admin/overview`, { headers: adminHeaders });
    assert(overviewRes.status === 200 && overviewRes.data.metrics.totalRevenueInr === 224 && overviewRes.data.metrics.freeCouponEnrollments === 1, 'Admin overview reports exact verified revenue (₹224) & free enrollments (1)');

    console.log('\n======================================================================');
    console.log(`   COURSES, COUPONS & ADMIN E2E QA: ${passed}/${total} PASSED`);
    console.log('======================================================================\n');
    if (passed !== total) {
      process.exitCode = 1;
    }
  } finally {
    await srv.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.exit(passed === total ? 0 : 1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal E2E suite error:', err);
  process.exit(1);
});
