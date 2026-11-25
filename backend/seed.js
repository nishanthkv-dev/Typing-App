const { getConfig } = require('./config');
const { AtomicDatabase } = require('./db');
const { FirestoreDatabase } = require('./firestoreDb');
const { createFirebaseAdminManager } = require('./firebaseAdmin');
const { generateId } = require('./security');

async function seed(options = {}) {
  const config = getConfig(options);
  const firebaseAdmin = createFirebaseAdminManager(config, {
    firestoreClient: options.firestoreInstance
  });

  let db = options.db || null;
  let driver = 'json';

  if (!db) {
    if (config.dbDriver === 'firestore') {
      const firestore = firebaseAdmin.getFirestore();
      if (!firestore) {
        throw new Error(
          firebaseAdmin.getInitError() ||
          'DB_DRIVER=firestore requires FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON.'
        );
      }
      db = new FirestoreDatabase(firestore);
      await db.init();
      driver = 'firestore';
    } else {
      db = new AtomicDatabase(config.dbPath);
      driver = 'json';
    }
  } else if (typeof db.init === 'function') {
    await db.init();
    driver = db instanceof FirestoreDatabase ? 'firestore' : 'json';
  }

  let adminId = null;
  if (config.adminBootstrapEmail && config.adminBootstrapPassword) {
    const admin = await db.ensureBootstrapAdmin({
      email: config.adminBootstrapEmail,
      password: config.adminBootstrapPassword,
      name: config.adminBootstrapName
    });
    adminId = admin ? admin.id : null;
    console.log(`[Seed] Admin ensured (${driver}): ${config.adminBootstrapEmail}`);
  } else {
    console.log('[Seed] Skipped email/password admin creation (set ADMIN_BOOTSTRAP_EMAIL & ADMIN_BOOTSTRAP_PASSWORD in .env, or use ADMIN_ALLOWED_EMAILS with Google Sign-In)');
  }

  // Idempotent coupon seeding: only creates WELCOME100 / TYPE25 if missing
  await db.runTransaction((draft) => {
    const nowIso = new Date().toISOString();
    const oneYearLater = new Date(Date.now() + 365 * 86400 * 1000).toISOString();

    if (!draft.coupons.find(c => c.code === 'WELCOME100')) {
      draft.coupons.push({
        id: 'cpn_welcome100',
        code: 'WELCOME100',
        description: '100% Free Scholarship Launch Offer for English Senior Typewriting',
        discountType: 'free_100',
        discountValue: 100,
        applicableCourseIds: ['english_senior'],
        startsAt: nowIso,
        expiresAt: oneYearLater,
        maxRedemptions: 20,
        perStudentLimit: 1,
        minPurchaseAmount: 0,
        active: true,
        redemptionCount: 0,
        createdByAdminId: adminId,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }

    if (!draft.coupons.find(c => c.code === 'TYPE25')) {
      draft.coupons.push({
        id: 'cpn_type25',
        code: 'TYPE25',
        description: '25% Student Discount Across All Typing & COA Courses',
        discountType: 'percentage',
        discountValue: 25,
        applicableCourseIds: [],
        startsAt: nowIso,
        expiresAt: oneYearLater,
        maxRedemptions: 100,
        perStudentLimit: 1,
        minPurchaseAmount: 0,
        active: true,
        redemptionCount: 0,
        createdByAdminId: adminId,
        createdAt: nowIso,
        updatedAt: nowIso
      });
    }
  });

  const targetDesc = driver === 'firestore'
    ? `Cloud Firestore (project: ${config.firebaseProjectId || 'configured'})`
    : `Local JSON (${config.dbPath})`;
  console.log(`[Seed] Completed idempotently -> ${targetDesc}`);
  return { driver, adminId };
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[Seed] Failed:', err.message || err);
    process.exit(1);
  });
}

module.exports = { seed };
