/**
 * Typing Thalaiva — Safe, Idempotent Migration Utility (store.json -> Cloud Firestore)
 *
 * - Never deletes or overwrites backend/data/store.json.
 * - Creates a timestamped backup snapshot before running live writes.
 * - Excludes test/mock accounts by default (override with --include-test).
 * - Uses original document IDs & set(..., { merge: true }) so re-runs do not duplicate records.
 *
 * Usage:
 *   node backend/migrate_to_firestore.js --dry-run
 *   node backend/migrate_to_firestore.js
 *   node backend/migrate_to_firestore.js --include-test
 */
const fs = require('fs');
const path = require('path');
const { getConfig } = require('./config');
const { createDefaultCourses } = require('./db');
const { createFirebaseAdminManager } = require('./firebaseAdmin');
const { encodeDocId } = require('./firestoreDb');

const TEST_EMAIL_PATTERNS = [
  /^test_/i,
  /@example\.com$/i,
  /^student@srikalaimagal\.in$/i,
  /mock/i
];

function isTestUserRecord(user) {
  if (!user) return true;
  if (TEST_EMAIL_PATTERNS.some(rx => rx.test(String(user.email || '')))) return true;
  if (String(user.id || '').startsWith('test_')) return true;
  return false;
}

function buildMigrationPlan(rawState, { includeTest = false } = {}) {
  const state = rawState || {};
  const allUsers = Array.isArray(state.users) ? state.users : [];

  const migratedStudents = [];
  const migratedAdmins = [];
  const skippedTestUsers = [];
  const allowedUserIds = new Set();

  for (const user of allUsers) {
    if (!includeTest && user.role !== 'admin' && isTestUserRecord(user)) {
      skippedTestUsers.push({ id: user.id, email: user.email });
      continue;
    }
    allowedUserIds.add(user.id);
    if (user.role === 'admin') migratedAdmins.push(user);
    else migratedStudents.push(user);
  }

  const belongsToMigratedUser = (rec) => !rec.userId || allowedUserIds.has(rec.userId);

  const courses = (Array.isArray(state.courses) && state.courses.length)
    ? state.courses
    : createDefaultCourses(new Date().toISOString());
  const coupons = Array.isArray(state.coupons) ? state.coupons : [];
  const purchases = (Array.isArray(state.purchases) ? state.purchases : []).filter(belongsToMigratedUser);
  const enrollments = (Array.isArray(state.enrollments) ? state.enrollments : []).filter(belongsToMigratedUser);
  const couponRedemptions = (Array.isArray(state.couponRedemptions) ? state.couponRedemptions : []).filter(belongsToMigratedUser);
  const notifications = (Array.isArray(state.notifications) ? state.notifications : []).filter(belongsToMigratedUser);
  const auditLogs = Array.isArray(state.auditLogs) ? state.auditLogs : [];

  // Derive normalized examSchedules & examAttempts if missing from older store.json snapshots
  const existingSchedules = (Array.isArray(state.examSchedules) ? state.examSchedules : []).filter(belongsToMigratedUser);
  const existingAttempts = (Array.isArray(state.examAttempts) ? state.examAttempts : []).filter(belongsToMigratedUser);

  const scheduleByEnr = new Set(existingSchedules.map(s => s.enrollmentId));
  const attemptByEnr = new Set(existingAttempts.map(a => a.enrollmentId));

  const examSchedules = [...existingSchedules];
  const examAttempts = [...existingAttempts];

  for (const enr of enrollments) {
    if (!attemptByEnr.has(enr.id)) {
      examAttempts.push({
        id: `att_${enr.id}`,
        enrollmentId: enr.id,
        userId: enr.userId,
        studentId: enr.userId,
        courseId: enr.courseId,
        courseTitle: enr.courseTitle,
        attemptNumber: enr.attemptNumber || 1,
        parentEnrollmentId: enr.parentEnrollmentId || null,
        status: enr.status,
        scoreSummary: enr.scoreSummary || null,
        examRemarks: enr.examRemarks || null,
        rebookingAllowed: Boolean(enr.rebookingAllowed),
        completedAt: enr.completedAt || null,
        createdAt: enr.createdAt,
        updatedAt: enr.updatedAt || enr.createdAt
      });
    }
    if (enr.examDate && !scheduleByEnr.has(enr.id)) {
      examSchedules.push({
        id: `sch_${enr.id}`,
        enrollmentId: enr.id,
        userId: enr.userId,
        studentId: enr.userId,
        courseId: enr.courseId,
        courseTitle: enr.courseTitle,
        attemptNumber: enr.attemptNumber || 1,
        examDate: enr.examDate,
        examSlot: enr.examSlot || '10:00 AM Batch',
        examCenter: enr.examCenter || 'Sri Kalaimagal Typewriting Institute',
        examRemarks: enr.examRemarks || null,
        status: enr.status === 'completed' || enr.status === 'rebooking_eligible' ? 'completed' : 'scheduled',
        createdAt: enr.createdAt,
        updatedAt: enr.updatedAt || enr.createdAt
      });
    }
  }

  return {
    skippedTestUsers,
    collections: {
      students: migratedStudents,
      admins: migratedAdmins,
      courses,
      coupons,
      couponRedemptions,
      purchases,
      enrollments,
      examSchedules,
      examAttempts,
      notifications,
      auditLogs
    }
  };
}

async function runMigration({
  dbPath,
  firestore,
  dryRun = false,
  includeTest = false
} = {}) {
  const resolvedDbPath = path.resolve(dbPath || getConfig().dbPath);
  if (!fs.existsSync(resolvedDbPath)) {
    return {
      sourceExists: false,
      sourcePath: resolvedDbPath,
      dryRun,
      backupPath: null,
      skippedTestUsers: [],
      counts: {},
      verified: true
    };
  }

  const rawJson = fs.readFileSync(resolvedDbPath, 'utf8');
  const parsed = JSON.parse(rawJson);
  const plan = buildMigrationPlan(parsed, { includeTest });

  let backupPath = null;
  if (!dryRun) {
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    backupPath = `${resolvedDbPath}.backup.${stamp}.json`;
    fs.writeFileSync(backupPath, rawJson, 'utf8');

    if (!firestore) {
      throw new Error('Firestore client is required for live migration.');
    }

    // Batch write (max 400 ops per Firestore batch)
    let batch = firestore.batch();
    let opCount = 0;

    for (const [colName, docs] of Object.entries(plan.collections)) {
      const colRef = firestore.collection(colName);
      for (const doc of docs) {
        const docId = encodeDocId(doc.id);
        batch.set(colRef.doc(docId), { ...doc, id: doc.id }, { merge: true });
        opCount++;
        if (opCount >= 400) {
          await batch.commit();
          batch = firestore.batch();
          opCount = 0;
        }
      }
    }
    if (opCount > 0) {
      await batch.commit();
    }
  }

  const counts = {};
  const remoteCounts = {};
  let verified = true;

  for (const [colName, docs] of Object.entries(plan.collections)) {
    counts[colName] = docs.length;
    if (!dryRun && firestore) {
      const snap = await firestore.collection(colName).get();
      remoteCounts[colName] = snap.size;
      if (snap.size < docs.length) {
        verified = false;
      }
    }
  }

  return {
    sourceExists: true,
    sourcePath: resolvedDbPath,
    dryRun,
    backupPath,
    skippedTestUsers: plan.skippedTestUsers,
    counts,
    remoteCounts,
    verified
  };
}

if (require.main === module) {
  (async () => {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const includeTest = args.includes('--include-test');
    const config = getConfig();
    const adminMgr = createFirebaseAdminManager(config);
    const firestore = dryRun ? null : adminMgr.getFirestore();

    if (!dryRun && !firestore) {
      console.error('Migration blocked: Firebase Admin SDK credentials are not configured.');
      console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON in .env, or run with --dry-run.');
      process.exit(1);
    }

    const report = await runMigration({
      dbPath: config.dbPath,
      firestore,
      dryRun,
      includeTest
    });
    console.log(JSON.stringify(report, null, 2));
  })().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}

module.exports = {
  isTestUserRecord,
  buildMigrationPlan,
  runMigration
};
