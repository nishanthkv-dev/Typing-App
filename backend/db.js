const fs = require('fs');
const path = require('path');
const { generateId, hashPassword, normalizeEmail } = require('./security');

function createDefaultCourses(nowIso) {
  return [
    {
      id: 'combo_speed',
      code: 'COMBO-DOTE',
      title: 'Combo Speed Pass (Tamil + English)',
      description: 'Full access to 50+ Tamil & 50+ English DoTE Junior & Senior examination model papers with anti-choke arcade drills.',
      language: 'both',
      level: 'combo',
      durationDays: 365,
      priceInr: 299,
      badge: 'MOST POPULAR',
      syllabusCount: 100,
      features: [
        '50+ Tamil Model Exam Papers',
        '50+ English Model Exam Papers',
        'DoTE Junior & Senior Speed Grading',
        'Anti-Choke Arcade Games & Scorecard Export'
      ],
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    {
      id: 'english_senior',
      code: 'ENG-SR-45',
      title: 'English Senior Typewriting',
      description: 'Complete DoTE English Senior (45 WPM) speed passages, business correspondence & statement formatting prep.',
      language: 'en',
      level: 'senior',
      durationDays: 365,
      priceInr: 199,
      badge: '45 WPM SENIOR',
      syllabusCount: 50,
      features: [
        '50 Official English Senior Model Papers',
        '10-Minute DoTE Stroke Deduction Scoring',
        'Weak-Key Speed Drills & PDF Scorecard'
      ],
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    {
      id: 'tamil_senior',
      code: 'TAM-SR-30',
      title: 'Tamil Senior Typewriting',
      description: 'Complete DoTE Tamil Senior (30 WPM) passages supporting both Tamil99 & Traditional Typewriter layouts.',
      language: 'ta',
      level: 'senior',
      durationDays: 365,
      priceInr: 199,
      badge: 'TAMIL SENIOR',
      syllabusCount: 50,
      features: [
        '50 Official Tamil Senior Model Papers',
        'Tamil99 & Traditional Typewriter Layouts',
        'OTG Physical Keyboard Exam Cockpit'
      ],
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    {
      id: 'english_junior',
      code: 'ENG-JR-30',
      title: 'English Junior Typewriting',
      description: 'Foundational DoTE English Junior (30 WPM) exam readiness course with accuracy drills & timed speed tests.',
      language: 'en',
      level: 'junior',
      durationDays: 365,
      priceInr: 149,
      badge: '30 WPM JUNIOR',
      syllabusCount: 50,
      features: [
        '30 WPM Junior Speed Training Passages',
        'Keyboard Row & Accuracy Drills',
        'Official Marking Rules Feedback'
      ],
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    {
      id: 'tamil_junior',
      code: 'TAM-JR-25',
      title: 'Tamil Junior Typewriting',
      description: 'DoTE Tamil Junior (25 WPM) beginner-to-exam preparation across Tamil99 and Typewriter keyboards.',
      language: 'ta',
      level: 'junior',
      durationDays: 365,
      priceInr: 149,
      badge: 'TAMIL JUNIOR',
      syllabusCount: 50,
      features: [
        '25 WPM Tamil Junior Speed Passages',
        'Uyir, Mei & Uyirmei Skill Drills',
        'Official DoTE Exam Timer & Feedback'
      ],
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    {
      id: 'coa_exam',
      code: 'COA-DOTE',
      title: 'COA (Computer on Office Automation)',
      description: 'Practical speed typing & documentation drill track tailored for Tamil Nadu DoTE COA exam candidates.',
      language: 'both',
      level: 'coa',
      durationDays: 365,
      priceInr: 249,
      badge: 'GOVT COA PREP',
      syllabusCount: 60,
      features: [
        'Bilingual English & Tamil Speed Practice',
        'COA Practical Documentation Accuracy Training',
        'All Arcade Drills & Analytics Unlocked'
      ],
      active: true,
      createdAt: nowIso,
      updatedAt: nowIso
    }
  ];
}

function createEmptyDbState() {
  const nowIso = new Date().toISOString();
  return {
    meta: {
      schemaVersion: 1,
      createdAt: nowIso,
      updatedAt: nowIso
    },
    users: [],
    passwordResets: [],
    courses: createDefaultCourses(nowIso),
    coupons: [],
    couponRedemptions: [],
    purchases: [],
    enrollments: [],
    exams: [],
    examSchedules: [],
    examAttempts: [],
    practiceHistory: [],
    notifications: [],
    auditLogs: [],
    idempotencyKeys: {}
  };
}

class AtomicDatabase {
  constructor(dbPath) {
    this.dbPath = dbPath;
    this._queue = Promise.resolve();
    this._state = this._loadFromDisk();
  }

  _ensureDir() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  _loadFromDisk() {
    this._ensureDir();
    if (!fs.existsSync(this.dbPath)) {
      const initial = createEmptyDbState();
      this._persistSync(initial);
      return initial;
    }
    const raw = fs.readFileSync(this.dbPath, 'utf8');
    const parsed = JSON.parse(raw);
    const defaults = createEmptyDbState();
    return {
      ...defaults,
      ...parsed,
      exams: Array.isArray(parsed.exams) ? parsed.exams : [],
      examSchedules: Array.isArray(parsed.examSchedules) ? parsed.examSchedules : [],
      examAttempts: Array.isArray(parsed.examAttempts) ? parsed.examAttempts : [],
      practiceHistory: Array.isArray(parsed.practiceHistory) ? parsed.practiceHistory : [],
      courses: Array.isArray(parsed.courses) && parsed.courses.length > 0 ? parsed.courses : defaults.courses
    };
  }

  _persistSync(state) {
    this._ensureDir();
    const tmpPath = `${this.dbPath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.dbPath);
  }

  read() {
    return structuredClone(this._state);
  }

  runTransaction(mutatorFn) {
    const run = async () => {
      const draft = structuredClone(this._state);
      const result = await mutatorFn(draft);
      draft.meta = draft.meta || {};
      draft.meta.updatedAt = new Date().toISOString();
      this._persistSync(draft);
      this._state = draft;
      return result;
    };
    const next = this._queue.then(run, run);
    this._queue = next.catch(() => {});
    return next;
  }

  async ensureBootstrapAdmin({ email, password, name }) {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail || !password) return null;
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
  AtomicDatabase,
  createDefaultCourses,
  createEmptyDbState
};
