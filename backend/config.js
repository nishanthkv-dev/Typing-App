const fs = require('fs');
const path = require('path');

/**
 * Lightweight zero-dependency .env parser for local & CI runtime.
 */
function loadDotEnv(envFilePath) {
  if (!fs.existsSync(envFilePath)) return;
  const raw = fs.readFileSync(envFilePath, 'utf8');
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadDotEnv(path.resolve(__dirname, '..', '.env'));

function getConfig(overrides = {}) {
  const nodeEnv = overrides.nodeEnv || process.env.NODE_ENV || 'development';
  const jwtSecret = overrides.jwtSecret || process.env.JWT_SECRET || (
    nodeEnv === 'production' ? '' : 'dev-only-insecure-secret-change-in-production'
  );
  if (nodeEnv === 'production' && !jwtSecret) {
    throw new Error('FATAL: JWT_SECRET environment variable must be set in production.');
  }

  const firebaseProjectId = overrides.firebaseProjectId ?? process.env.FIREBASE_PROJECT_ID ?? '';
  const firebaseServiceAccountPath = overrides.firebaseServiceAccountPath ?? process.env.FIREBASE_SERVICE_ACCOUNT_PATH ?? process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '';
  const firebaseServiceAccountJson = overrides.firebaseServiceAccountJson ?? process.env.FIREBASE_SERVICE_ACCOUNT_JSON ?? '';
  const hasFirebaseCreds = Boolean(firebaseServiceAccountJson || firebaseServiceAccountPath || overrides.firestoreInstance || process.env.FIRESTORE_EMULATOR_HOST);

  const dbDriver = overrides.dbDriver || process.env.DB_DRIVER || (hasFirebaseCreds ? 'firestore' : 'json');

  const firebaseWebConfig = {
    apiKey: overrides.firebaseWebApiKey ?? process.env.FIREBASE_WEB_API_KEY ?? '',
    authDomain: overrides.firebaseAuthDomain ?? process.env.FIREBASE_AUTH_DOMAIN ?? (firebaseProjectId ? `${firebaseProjectId}.firebaseapp.com` : ''),
    projectId: firebaseProjectId,
    storageBucket: overrides.firebaseStorageBucket ?? process.env.FIREBASE_STORAGE_BUCKET ?? (firebaseProjectId ? `${firebaseProjectId}.appspot.com` : ''),
    messagingSenderId: overrides.firebaseMessagingSenderId ?? process.env.FIREBASE_MESSAGING_SENDER_ID ?? '',
    appId: overrides.firebaseAppId ?? process.env.FIREBASE_APP_ID ?? '',
    measurementId: overrides.firebaseMeasurementId ?? process.env.FIREBASE_MEASUREMENT_ID ?? '',
    googleWebClientId: overrides.googleClientId ?? process.env.GOOGLE_CLIENT_ID ?? ''
  };

  const adminAllowedEmails = (overrides.adminAllowedEmails ?? process.env.ADMIN_ALLOWED_EMAILS ?? overrides.adminBootstrapEmail ?? process.env.ADMIN_BOOTSTRAP_EMAIL ?? '')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean);

  return {
    nodeEnv,
    port: Number(overrides.port ?? process.env.PORT ?? 4000),
    host: overrides.host ?? process.env.HOST ?? '127.0.0.1',
    jwtSecret,
    tokenTtlSeconds: Number(overrides.tokenTtlSeconds ?? process.env.TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7),
    dbDriver,
    dbPath: path.resolve(overrides.dbPath || process.env.DB_PATH || path.join(__dirname, 'data', 'store.json')),
    googleClientId: overrides.googleClientId ?? process.env.GOOGLE_CLIENT_ID ?? '',
    firebaseProjectId,
    firebaseServiceAccountPath,
    firebaseServiceAccountJson,
    firebaseWebConfig,
    adminAllowedEmails,
    allowedOrigins: (overrides.allowedOrigins || process.env.ALLOWED_ORIGINS || 'http://localhost:4000,http://localhost:3000,https://localhost,http://localhost,capacitor://localhost')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    paymentWebhookSecret: overrides.paymentWebhookSecret ?? process.env.PAYMENT_WEBHOOK_SECRET ?? 'dev-payment-hmac-secret',
    adminBootstrapEmail: overrides.adminBootstrapEmail ?? process.env.ADMIN_BOOTSTRAP_EMAIL ?? '',
    adminBootstrapPassword: overrides.adminBootstrapPassword ?? process.env.ADMIN_BOOTSTRAP_PASSWORD ?? '',
    adminBootstrapName: overrides.adminBootstrapName ?? process.env.ADMIN_BOOTSTRAP_NAME ?? 'Institute Administrator',
    rateLimitWindowMs: Number(overrides.rateLimitWindowMs ?? process.env.RATE_LIMIT_WINDOW_MS ?? 15 * 60 * 1000),
    rateLimitAuthMax: Number(overrides.rateLimitAuthMax ?? process.env.RATE_LIMIT_AUTH_MAX ?? 25),
    rateLimitCheckoutMax: Number(overrides.rateLimitCheckoutMax ?? process.env.RATE_LIMIT_CHECKOUT_MAX ?? 40)
  };
}

module.exports = { getConfig, loadDotEnv };
