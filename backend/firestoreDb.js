const { createDefaultCourses, createEmptyDbState } = require('./db');
const { generateId, hashPassword, normalizeEmail } = require('./security');

const ARRAY_COLLECTIONS = [
  'courses',
  'coupons',
  'couponRedemptions',
  'purchases',
  'enrollments',
  'examSchedules',
  'examAttempts',
  'notifications',
  'auditLogs',
  'passwordResets'
];

function encodeDocId(raw) {
  return String(raw).replace(/[/#?\[\]]/g, '_');
}

function stableEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Cloud Firestore Persistence Adapter matching the AtomicDatabase contract.
 * Maps relational collections:
 *   students, admins, courses, coupons, couponRedemptions, purchases,
 *   enrollments, examSchedules, examAttempts, notifications, auditLogs,
 *   passwordResets, idempotencyKeys
 */
class FirestoreDatabase {
  constructor(firestore, { seedDefaultCourses = true } = {}) {
    if (!firestore) {
      throw new Error('FirestoreDatabase requires an initialized Firestore instance.');
    }
    this.firestore = firestore;
    this.seedDefaultCourses = seedDefaultCourses;
    this._state = createEmptyDbState();
    this._queue = Promise.resolve();
    this._initialized = false;
  }

  async _fetchAllFromFirestore(tx = null) {
    const readCollection = async (name) => {
      const colRef = this.firestore.collection(name);
      const snap = tx ? await tx.get(colRef) : await colRef.get();
      const docs = [];
      snap.forEach((doc) => {
        docs.push({ id: doc.id, ...doc.data() });
      });
      return docs;
    };

    const [
      students,
      admins,
      courses,
      coupons,
      couponRedemptions,
      purchases,
      enrollments,
      examSchedules,
      examAttempts,
      notifications,
      auditLogs,
      passwordResets,
      idempDocs
    ] = await Promise.all([
      readCollection('students'),
      readCollection('admins'),
      readCollection('courses'),
      readCollection('coupons'),
      readCollection('couponRedemptions'),
      readCollection('purchases'),
      readCollection('enrollments'),
      readCollection('examSchedules'),
      readCollection('examAttempts'),
      readCollection('notifications'),
      readCollection('auditLogs'),
      readCollection('passwordResets'),
      readCollection('idempotencyKeys')
    ]);

    const idempotencyKeys = {};
    for (const row of idempDocs) {
      const keyName = row.originalKey || row.id;
      const { id, originalKey, ...rest } = row;
      idempotencyKeys[keyName] = rest;
    }

    const users = [
      ...students.map(u => ({ ...u, role: 'student' })),
      ...admins.map(u => ({ ...u, role: 'admin' }))
    ];

    const byCreatedDesc = (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    auditLogs.sort(byCreatedDesc);
    purchases.sort(byCreatedDesc);
    enrollments.sort(byCreatedDesc);
    notifications.sort(byCreatedDesc);

    return {
      meta: {
        schemaVersion: 2,
        driver: 'firestore',
        updatedAt: new Date().toISOString()
      },
      users,
      courses,
      coupons,
      couponRedemptions,
      purchases,
      enrollments,
      examSchedules,
      examAttempts,
      notifications,
      auditLogs,
      passwordResets,
      idempotencyKeys
    };
  }

  async init() {
    if (this._initialized) return;
    const state = await this._fetchAllFromFirestore();
    if (this.seedDefaultCourses && state.courses.length === 0) {
      const defaults = createDefaultCourses(new Date().toISOString());
      const batch = this.firestore.batch();
      for (const crs of defaults) {
        batch.set(this.firestore.collection('courses').doc(crs.id), crs);
      }
      await batch.commit();
      state.courses = defaults;
    }
    this._state = state;
    this._initialized = true;
  }

  read() {
    return structuredClone(this._state);
  }

  async refresh() {
    const fresh = await this._fetchAllFromFirestore();
    this._state = fresh;
    return this.read();
  }

  _diffCollectionWrites(colName, beforeList, afterList, tx) {
    const colRef = this.firestore.collection(colName);
    const beforeMap = new Map((beforeList || []).map(item => [String(item.id), item]));
    const afterMap = new Map((afterList || []).map(item => [String(item.id), item]));

    for (const [id, beforeItem] of beforeMap.entries()) {
      if (!afterMap.has(id)) {
        tx.delete(colRef.doc(encodeDocId(id)));
      }
    }
    for (const [id, afterItem] of afterMap.entries()) {
      const prev = beforeMap.get(id);
      if (!prev || !stableEqual(prev, afterItem)) {
        tx.set(colRef.doc(encodeDocId(id)), afterItem);
      }
    }
  }

  runTransaction(mutatorFn) {
    const exec = async () => {
      if (!this._initialized) {
        await this.init();
      }
      const { finalState, result } = await this.firestore.runTransaction(async (tx) => {
        const beforeState = await this._fetchAllFromFirestore(tx);
        const draft = structuredClone(beforeState);
        const res = await mutatorFn(draft);
        draft.meta = draft.meta || {};
        draft.meta.updatedAt = new Date().toISOString();

        // Split users into students and admins collections
        const beforeStudents = beforeState.users.filter(u => u.role !== 'admin');
        const afterStudents = draft.users.filter(u => u.role !== 'admin');
        const beforeAdmins = beforeState.users.filter(u => u.role === 'admin');
        const afterAdmins = draft.users.filter(u => u.role === 'admin');

        this._diffCollectionWrites('students', beforeStudents, afterStudents, tx);
        this._diffCollectionWrites('admins', beforeAdmins, afterAdmins, tx);

        for (const colName of ARRAY_COLLECTIONS) {
          this._diffCollectionWrites(colName, beforeState[colName], draft[colName], tx);
        }

        // Diff idempotencyKeys map
        const idempCol = this.firestore.collection('idempotencyKeys');
        const beforeKeys = beforeState.idempotencyKeys || {};
        const afterKeys = draft.idempotencyKeys || {};
        for (const key of Object.keys(beforeKeys)) {
          if (!Object.prototype.hasOwnProperty.call(afterKeys, key)) {
            tx.delete(idempCol.doc(encodeDocId(key)));
          }
        }
        for (const [key, val] of Object.entries(afterKeys)) {
          if (!beforeKeys[key] || !stableEqual(beforeKeys[key], val)) {
            tx.set(idempCol.doc(encodeDocId(key)), { ...val, originalKey: key });
          }
        }

        return { finalState: draft, result: res };
      });

      this._state = finalState;
      return result;
    };

    const next = this._queue.then(exec, exec);
    this._queue = next.catch(() => {});
    return next;
  }

  async ensureBootstrapAdmin({ email, password, name }) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) return null;
    await this.init();
    return this.runTransaction((db) => {
      const existing = db.users.find(u => u.email === cleanEmail);
      const nowIso = new Date().toISOString();
      if (existing) {
        if (existing.role !== 'admin') {
          existing.role = 'admin';
          existing.passwordHash = hashPassword(password);
          existing.updatedAt = nowIso;
        }
        return existing;
      }
      const adminUser = {
        id: generateId('adm'),
        role: 'admin',
        name: String(name || 'Institute Administrator').trim(),
        email: cleanEmail,
        emailVerified: true,
        googleUid: null,
        passwordHash: hashPassword(password),
        authProviders: ['password'],
        phone: '',
        regNumber: '',
        institute: 'Sri Kalaimagal Typewriting Institute',
        activeSessionId: null,
        status: 'active',
        createdAt: nowIso,
        updatedAt: nowIso
      };
      db.users.push(adminUser);
      return adminUser;
    });
  }
}

module.exports = {
  FirestoreDatabase,
  ARRAY_COLLECTIONS,
  encodeDocId
};
