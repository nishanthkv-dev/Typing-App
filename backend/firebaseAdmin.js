const fs = require('fs');
const path = require('path');

let adminSdk = null;
try {
  adminSdk = require('firebase-admin');
} catch {
  adminSdk = null;
}

function parseServiceAccountFromConfig(config) {
  if (config.firebaseServiceAccountJson) {
    const raw = String(config.firebaseServiceAccountJson).trim();
    if (raw.startsWith('{')) {
      return JSON.parse(raw);
    }
    // Support base64-encoded JSON for PaaS environment variables
    const decoded = Buffer.from(raw, 'base64').toString('utf8');
    return JSON.parse(decoded);
  }
  if (config.firebaseServiceAccountPath) {
    const resolved = path.resolve(config.firebaseServiceAccountPath);
    if (fs.existsSync(resolved)) {
      return JSON.parse(fs.readFileSync(resolved, 'utf8'));
    }
  }
  return null;
}

function createFirebaseAdminManager(config = {}, overrides = {}) {
  let app = overrides.firebaseApp || null;
  let authClient = overrides.authClient || null;
  let firestoreClient = overrides.firestoreClient || null;
  let initError = null;
  let initialized = false;

  function init() {
    if (initialized) return { configured: isConfigured(), initError };
    initialized = true;

    if (authClient || firestoreClient || app) {
      return { configured: true, initError: null };
    }
    if (!adminSdk) {
      initError = 'firebase-admin package is not installed.';
      return { configured: false, initError };
    }

    try {
      const appName = overrides.appName || `typing-thalaiva-${config.firebaseProjectId || 'default'}`;
      const existing = adminSdk.apps.find(a => a && a.name === appName);
      if (existing) {
        app = existing;
      } else {
        const serviceAccount = parseServiceAccountFromConfig(config);
        const appOpts = {};
        if (serviceAccount) {
          appOpts.credential = adminSdk.credential.cert(serviceAccount);
          appOpts.projectId = config.firebaseProjectId || serviceAccount.project_id;
        } else if (process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST) {
          appOpts.projectId = config.firebaseProjectId || 'typing-thalaiva-emulator';
        } else if (process.env.GOOGLE_CLOUD_PROJECT || process.env.K_SERVICE) {
          // Managed Google Cloud runtime (Cloud Run / App Engine / Cloud Functions) ADC
          appOpts.credential = adminSdk.credential.applicationDefault();
          if (config.firebaseProjectId) appOpts.projectId = config.firebaseProjectId;
        } else {
          initError = 'Firebase Admin credentials are not configured (set FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON).';
          return { configured: false, initError };
        }
        app = adminSdk.initializeApp(appOpts, appName);
      }

      authClient = app.auth();
      firestoreClient = app.firestore();
      try {
        firestoreClient.settings({ ignoreUndefinedProperties: true });
      } catch {
        // Ignore if settings already applied
      }
      return { configured: true, initError: null };
    } catch (err) {
      initError = err.message;
      app = null;
      authClient = null;
      firestoreClient = null;
      return { configured: false, initError };
    }
  }

  function isConfigured() {
    if (!initialized) init();
    return Boolean(authClient || firestoreClient);
  }

  function getAuth() {
    if (!initialized) init();
    return authClient;
  }

  function getFirestore() {
    if (!initialized) init();
    return firestoreClient;
  }

  async function verifyFirebaseIdToken(idToken, { checkRevoked = true } = {}) {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Firebase ID token is required.');
    }
    const auth = getAuth();
    if (!auth) {
      throw new Error(initError || 'Firebase Admin Auth is not configured on this server.');
    }
    return auth.verifyIdToken(idToken, checkRevoked);
  }

  async function setUserClaims(uid, claims) {
    const auth = getAuth();
    if (!auth || !uid) return false;
    await auth.setCustomUserClaims(uid, claims);
    return true;
  }

  return {
    init,
    isConfigured,
    getInitError: () => initError,
    getApp: () => app,
    getAuth,
    getFirestore,
    verifyFirebaseIdToken,
    setUserClaims
  };
}

module.exports = {
  createFirebaseAdminManager,
  parseServiceAccountFromConfig
};
