/**
 * Typing Thalaiva — Firebase Integration, Firestore Adapter, RBAC,
 * Migration, Rate Limiting & Security Rules Verification Suite
 *
 * Note: Uses an in-memory transactional Firestore & Firebase Auth token verifier
 * to test backend/adapter logic deterministically without requiring live network
 * Firebase Console credentials.
 */

const fs = require('fs');
const os = require('os');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createServer } = require('./backend/server');
const { FirestoreDatabase } = require('./backend/firestoreDb');
const { runMigration } = require('./backend/migrate_to_firestore');
const { seed } = require('./backend/seed');
const { redactObject } = require('./backend/middleware/rateLimiter');

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

/**
 * In-memory Cloud Firestore emulator supporting collections, doc refs, batch, and atomic transactions.
 */
function createInMemoryFirestore() {
  const store = new Map();

  function getColMap(name) {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name);
  }

  function makeColRef(name) {
    return {
      async get() {
        const col = getColMap(name);
        const docs = Array.from(col.entries()).map(([id, data]) => ({
          id,
          exists: true,
          data: () => structuredClone(data)
        }));
        return {
          size: docs.length,
          forEach: (cb) => docs.forEach(cb)
        };
      },
      doc(docId) {
        return {
          __col: name,
          __id: String(docId)
        };
      }
    };
  }

  return {
    _dump(name) {
      return Array.from(getColMap(name).values()).map(v => structuredClone(v));
    },
    collection: makeColRef,
    batch() {
      const ops = [];
      return {
        set(docRef, data, opts = {}) {
          ops.push({ type: 'set', docRef, data: structuredClone(data), merge: Boolean(opts.merge) });
        },
        delete(docRef) {
          ops.push({ type: 'delete', docRef });
        },
        async commit() {
          for (const op of ops) {
            const col = getColMap(op.docRef.__col);
            if (op.type === 'delete') {
              col.delete(op.docRef.__id);
            } else if (op.merge && col.has(op.docRef.__id)) {
              col.set(op.docRef.__id, { ...col.get(op.docRef.__id), ...op.data });
            } else {
              col.set(op.docRef.__id, op.data);
            }
          }
        }
      };
    },
    async runTransaction(fn) {
      const stagedOps = [];
      const tx = {
        async get(colRef) {
          return colRef.get();
        },
        set(docRef, data) {
          stagedOps.push({ type: 'set', docRef, data: structuredClone(data) });
        },
        delete(docRef) {
          stagedOps.push({ type: 'delete', docRef });
        }
      };
      const result = await fn(tx);
      for (const op of stagedOps) {
        const col = getColMap(op.docRef.__col);
        if (op.type === 'delete') col.delete(op.docRef.__id);
        else col.set(op.docRef.__id, op.data);
      }
      return result;
    }
  };
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
  return { status: res.status, headers: res.headers, data: json };
}

async function runSuite() {
  console.log('======================================================================');
  console.log('   TYPING THALAIVA — FIREBASE, FIRESTORE, MIGRATION & SECURITY QA    ');
  console.log('======================================================================\n');

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tt-fb-qa-'));
  const firestore = createInMemoryFirestore();
  const firestoreDb = new FirestoreDatabase(firestore);

  const verifyFirebaseTokenFn = async (idToken) => {
    if (idToken === 'fb_student_token_1') {
      return {
        uid: 'fb_uid_anitha_01',
        email: 'anitha.learner@gmail.com',
        email_verified: true,
        name: 'Anitha R',
        picture: 'https://lh3.googleusercontent.com/avatar',
        firebase: { sign_in_provider: 'google.com', identities: { 'google.com': ['g_sub_anitha'] } }
      };
    }
    if (idToken === 'fb_admin_token_ok') {
      return {
        uid: 'fb_uid_admin_01',
        email: 'chiefadmin@srikalaimagal.in',
        email_verified: true,
        name: 'Chief Admin',
        firebase: { sign_in_provider: 'google.com' }
      };
    }
    throw new Error('Invalid Firebase ID Token');
  };

  const srv = createServer({
    port: 0,
    dbDriver: 'firestore',
    db: firestoreDb,
    firestoreInstance: firestore,
    firebaseWebApiKey: 'AIzaTestWebKeyOnly123456',
    firebaseProjectId: 'typing-thalaiva-test',
    jwtSecret: 'firebase-test-jwt-secret-0123456789',
    adminAllowedEmails: 'chiefadmin@srikalaimagal.in',
    rateLimitAuthMax: 15,
    verifyFirebaseTokenFn
  });

  const { baseUrl } = await srv.start(0);

  try {
    // -----------------------------------------------------------------------
    // 1. HEALTH & PUBLIC CONFIG
    // -----------------------------------------------------------------------
    console.log('--- TEST 1: FIRESTORE DRIVER & PUBLIC CONFIG ENDPOINT ---');
    const health = await httpJson(`${baseUrl}/api/health`);
    assert(health.status === 200 && health.data.dbDriver === 'firestore', 'Backend health reports dbDriver=firestore');
    assert(health.data.firebaseConfigured === true, 'Backend reports Firebase verification configured');

    const pubCfg = await httpJson(`${baseUrl}/api/public-config`);
    assert(pubCfg.status === 200 && pubCfg.data.firebaseWebConfig.projectId === 'typing-thalaiva-test', 'Public config serves client Firebase project info without admin secrets');
    assert(!JSON.stringify(pubCfg.data).includes('firebase-test-jwt-secret'), 'Public config exposes zero JWT or service-account secrets');
    assert(firestore._dump('courses').length === 6, 'Default 6 DoTE courses seeded into Firestore courses collection');

    // -----------------------------------------------------------------------
    // 2. FIREBASE STUDENT SIGN-IN & ADMIN RBAC SEPARATION
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 2: FIREBASE ID TOKEN STUDENT AUTH & ADMIN ALLOWLIST RBAC ---');
    const stuRes = await httpJson(`${baseUrl}/api/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'fb_student_token_1' })
    });
    assert(stuRes.status === 200 && stuRes.data.user.id === 'fb_uid_anitha_01', 'Firebase student login creates students/{uid} doc');
    assert(firestore._dump('students').some(s => s.id === 'fb_uid_anitha_01'), 'Student profile persisted in Firestore students collection');

    // Student tries to log into admin portal with their valid student Firebase token
    const stuAdminAttempt = await httpJson(`${baseUrl}/api/admin/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'fb_student_token_1' })
    });
    assert(stuAdminAttempt.status === 403 && stuAdminAttempt.data.code === 'ADMIN_UNAUTHORIZED', 'Non-admin student rejected from Admin Portal Firebase login (403)');

    // Authorized admin logs in
    const admRes = await httpJson(`${baseUrl}/api/admin/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'fb_admin_token_ok' })
    });
    assert(admRes.status === 200 && admRes.data.admin.role === 'admin', 'Allowlisted admin Google account authorized on Admin Portal');
    assert(firestore._dump('admins').some(a => a.id === 'fb_uid_admin_01'), 'Admin doc persisted in Firestore admins collection');

    const adminHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${admRes.data.token}`
    };
    const studentHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${stuRes.data.token}`
    };

    // -----------------------------------------------------------------------
    // 3. ALL 10 FIRESTORE COLLECTIONS POPULATED ACROSS LIFECYCLE
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 3: FULL 10-COLLECTION FIRESTORE LIFECYCLE ---');
    const cpn = await httpJson(`${baseUrl}/api/admin/coupons`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({
        code: 'FB100',
        discountType: 'free_100',
        applicableCourseIds: ['english_senior'],
        maxRedemptions: 10,
        perStudentLimit: 1
      })
    });
    assert(cpn.status === 201 && firestore._dump('coupons').length === 1, 'Coupon saved in Firestore coupons collection');

    const chk = await httpJson(`${baseUrl}/api/checkout/complete`, {
      method: 'POST',
      headers: { ...studentHeaders, 'X-Idempotency-Key': 'fb_chk_1' },
      body: JSON.stringify({ courseId: 'english_senior', couponCode: 'FB100' })
    });
    assert(chk.status === 201 && chk.data.nextStep === 'enrolled_free', '100% free coupon activates enrollment cleanly in Firestore');
    const enrId = chk.data.enrollment.id;

    await httpJson(`${baseUrl}/api/admin/enrollments/${enrId}/schedule-exam`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ examDate: '2026-12-28', examSlot: '02:00 PM Batch' })
    });
    await httpJson(`${baseUrl}/api/admin/enrollments/${enrId}/complete-exam`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ scoreSummary: '50 WPM Distinction', enableRebooking: true })
    });

    assert(firestore._dump('couponRedemptions').length === 1, 'Firestore couponRedemptions populated');
    assert(firestore._dump('purchases').length === 1, 'Firestore purchases populated');
    assert(firestore._dump('enrollments').length === 1, 'Firestore enrollments populated');
    assert(firestore._dump('examSchedules').length === 1, 'Firestore examSchedules populated');
    assert(firestore._dump('examAttempts').length === 1, 'Firestore examAttempts populated');
    assert(firestore._dump('notifications').length >= 3, 'Firestore notifications populated');
    assert(firestore._dump('auditLogs').length >= 5, 'Firestore auditLogs populated');

    // -----------------------------------------------------------------------
    // 4. MIGRATION UTILITY (IDEMPOTENT + BACKUP + TEST FILTERING)
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 4: IDEMPOTENT STORE.JSON -> FIRESTORE MIGRATION ---');
    const legacyStorePath = path.join(tmpDir, 'store.json');
    fs.writeFileSync(legacyStorePath, JSON.stringify({
      users: [
        { id: 'stu_real_1', role: 'student', name: 'Muthu K', email: 'muthu@realmail.in', status: 'active' },
        { id: 'test_student_123', role: 'student', name: 'Fake Test', email: 'fake@example.com', status: 'active' },
        { id: 'stu_mock_2', role: 'student', name: 'Mock', email: 'student@srikalaimagal.in', status: 'active' }
      ],
      courses: [],
      coupons: [{ id: 'cpn_mig_1', code: 'MIG25', discountType: 'percentage', discountValue: 25, active: true }],
      purchases: [
        { id: 'pur_real_1', userId: 'stu_real_1', courseId: 'combo_speed', finalAmount: 299, paymentStatus: 'verified' },
        { id: 'pur_fake_1', userId: 'test_student_123', courseId: 'combo_speed', finalAmount: 299, paymentStatus: 'verified' }
      ],
      enrollments: [
        { id: 'enr_real_1', userId: 'stu_real_1', courseId: 'combo_speed', courseTitle: 'Combo', attemptNumber: 1, status: 'scheduled', examDate: '2026-12-30' }
      ],
      couponRedemptions: [],
      notifications: [],
      auditLogs: []
    }, null, 2));

    const targetFs = createInMemoryFirestore();
    const dryReport = await runMigration({ dbPath: legacyStorePath, firestore: targetFs, dryRun: true });
    assert(dryReport.skippedTestUsers.length === 2, 'Dry-run skips mock/example test users by default');
    assert(dryReport.counts.students === 1 && dryReport.counts.purchases === 1, 'Dry-run excludes purchases belonging to skipped test users');

    const liveMig1 = await runMigration({ dbPath: legacyStorePath, firestore: targetFs, dryRun: false });
    assert(liveMig1.verified === true && fs.existsSync(liveMig1.backupPath), 'Live migration creates backup & verifies counts');
    assert(fs.existsSync(legacyStorePath), 'Original store.json preserved untouched');
    assert(targetFs._dump('examSchedules').length === 1 && targetFs._dump('examAttempts').length === 1, 'Migration derives examSchedules and examAttempts cleanly');

    // Re-run migration -> idempotent, zero duplicates
    const liveMig2 = await runMigration({ dbPath: legacyStorePath, firestore: targetFs, dryRun: false });
    assert(liveMig2.remoteCounts.students === 1 && liveMig2.remoteCounts.enrollments === 1, 'Repeated migration produces zero duplicate documents');

    // -----------------------------------------------------------------------
    // 5. NO MOCK GOOGLE LOGIN IN PRODUCTION CLIENT + FIRESTORE RULES + RATE LIMIT
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 5: CLIENT NO-MOCK GUARD, FIRESTORE RULES & RATE LIMITING ---');
    const html = fs.readFileSync(path.join(__dirname, 'www/index.html'), 'utf8');
    const fbJs = fs.readFileSync(path.join(__dirname, 'www/js/firebase_service.js'), 'utf8');
    assert(!html.includes('student@srikalaimagal.in'), 'Mock student email fallback removed from www/index.html');
    assert(!fbJs.includes('AIzaSyDummyApiKey'), 'Dummy hardcoded Firebase API key removed from firebase_service.js');

    const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously' });
    dom.window.scrollTo = () => {};
    dom.window.eval(fbJs);
    await dom.window.FirebaseService.init();

    let unconfiguredRejected = false;
    try {
      await dom.window.FirebaseService.signInWithGoogle();
    } catch (e) {
      unconfiguredRejected = e.message.includes('not configured');
    }
    assert(unconfiguredRejected, 'FirebaseService.signInWithGoogle() fails honestly without fake login when unconfigured');

    // Verify Firestore Rules & Indexes structure
    const rulesTxt = fs.readFileSync(path.join(__dirname, 'firestore.rules'), 'utf8');
    assert(!rulesTxt.includes('allow read, write: if true'), 'Firestore rules contain no open allow read, write: if true');
    assert(rulesTxt.includes('match /coupons/{couponId}') && rulesTxt.includes('allow read, write: if false;'), 'Coupons & sensitive collections strictly server-only in Firestore rules');
    assert(rulesTxt.includes('request.auth.token.admin == true'), 'Admin custom claim verified in Firestore rules');

    // Verify PII redaction & rate limit (trigger 429 after 15 requests)
    const redacted = redactObject({ email: 'a@b.com', idToken: 'secret_jwt', password: '123', nested: { authorization: 'Bearer x' } });
    assert(redacted.idToken === '[REDACTED]' && redacted.password === '[REDACTED]' && redacted.nested.authorization === '[REDACTED]', 'Logger redacts tokens and passwords');

    let hit429 = false;
    for (let i = 0; i < 20; i++) {
      const r = await httpJson(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'nobody@test.in', password: 'wrong' })
      });
      if (r.status === 429) {
        hit429 = true;
        break;
      }
    }
    assert(hit429, 'Auth endpoint enforces 429 rate limiting');

    // -----------------------------------------------------------------------
    // 6. CAPACITOR LOCALHOST API GUARD & IDEMPOTENT FIRESTORE SEED
    // -----------------------------------------------------------------------
    console.log('\n--- TEST 6: CAPACITOR LOCALHOST GUARD & IDEMPOTENT FIRESTORE SEED ---');
    const portalJs = fs.readFileSync(path.join(__dirname, 'www/js/student_portal.js'), 'utf8');
    const capDom = new JSDOM(html, { url: 'https://localhost/', runScripts: 'dangerously' });
    capDom.window.scrollTo = () => {};
    capDom.window.eval(fbJs);
    capDom.window.eval(portalJs);
    assert(capDom.window.StudentPortal.getApiBase() === '', 'Capacitor https://localhost origin does not assume local PC backend');
    capDom.window.StudentPortal.setApiBase('https://api.typingthalaiva.example.com/');
    assert(capDom.window.StudentPortal.getApiBase() === 'https://api.typingthalaiva.example.com', 'Explicit HTTPS backend URL saved & normalized cleanly');

    const seedFs = createInMemoryFirestore();
    const seedDb = new FirestoreDatabase(seedFs);
    await seed({ db: seedDb, adminBootstrapEmail: 'seedadmin@srikalaimagal.in', adminBootstrapPassword: 'SeedPassword#2026' });
    await seed({ db: seedDb, adminBootstrapEmail: 'seedadmin@srikalaimagal.in', adminBootstrapPassword: 'SeedPassword#2026' });
    assert(seedFs._dump('admins').length === 1, 'Repeated seed creates only 1 admin record');
    assert(seedFs._dump('coupons').filter(c => c.code === 'WELCOME100').length === 1, 'Repeated seed creates only 1 WELCOME100 coupon');
    assert(seedFs._dump('coupons').filter(c => c.code === 'TYPE25').length === 1, 'Repeated seed creates only 1 TYPE25 coupon');

    console.log('\n======================================================================');
    console.log(`   FIREBASE INTEGRATION & SECURITY QA: ${passed}/${total} PASSED`);
    console.log('======================================================================\n');
    if (passed !== total) process.exitCode = 1;
  } finally {
    await srv.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
    process.exit(passed === total ? 0 : 1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal Firebase QA error:', err);
  process.exit(1);
});
