const { getConfig } = require('./config');
const { AtomicDatabase } = require('./db');
const { generateId } = require('./security');

async function seed() {
  const config = getConfig();
  const db = new AtomicDatabase(config.dbPath);

  let adminId = null;
  if (config.adminBootstrapEmail && config.adminBootstrapPassword) {
    const admin = await db.ensureBootstrapAdmin({
      email: config.adminBootstrapEmail,
      password: config.adminBootstrapPassword,
      name: config.adminBootstrapName
    });
    adminId = admin ? admin.id : null;
    console.log(`[Seed] Admin ensured: ${config.adminBootstrapEmail}`);
  } else {
    console.log('[Seed] Skipped admin creation (set ADMIN_BOOTSTRAP_EMAIL and ADMIN_BOOTSTRAP_PASSWORD in .env)');
  }

  // Seed default coupons (WELCOME100 & TYPE25) only if none exist yet
  await db.runTransaction((draft) => {
    const nowIso = new Date().toISOString();
    const oneYearLater = new Date(Date.now() + 365 * 86400 * 1000).toISOString();

    if (!draft.coupons.find(c => c.code === 'WELCOME100')) {
      draft.coupons.push({
        id: generateId('cpn'),
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
        id: generateId('cpn'),
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

  console.log(`[Seed] Database ready at ${config.dbPath}`);
}

if (require.main === module) {
  seed().catch((err) => {
    console.error('[Seed] Failed:', err);
    process.exit(1);
  });
}

module.exports = { seed };
