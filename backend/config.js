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

  return {
    nodeEnv,
    port: Number(overrides.port ?? process.env.PORT ?? 4000),
    jwtSecret,
    tokenTtlSeconds: Number(overrides.tokenTtlSeconds ?? process.env.TOKEN_TTL_SECONDS ?? 60 * 60 * 24 * 7),
    dbPath: path.resolve(overrides.dbPath || process.env.DB_PATH || path.join(__dirname, 'data', 'store.json')),
    googleClientId: overrides.googleClientId ?? process.env.GOOGLE_CLIENT_ID ?? '',
    allowedOrigins: (overrides.allowedOrigins || process.env.ALLOWED_ORIGINS || 'http://localhost:4000,http://localhost:3000,https://localhost,http://localhost,capacitor://localhost')
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
    paymentWebhookSecret: overrides.paymentWebhookSecret ?? process.env.PAYMENT_WEBHOOK_SECRET ?? 'dev-payment-hmac-secret',
    adminBootstrapEmail: overrides.adminBootstrapEmail ?? process.env.ADMIN_BOOTSTRAP_EMAIL ?? '',
    adminBootstrapPassword: overrides.adminBootstrapPassword ?? process.env.ADMIN_BOOTSTRAP_PASSWORD ?? '',
    adminBootstrapName: overrides.adminBootstrapName ?? process.env.ADMIN_BOOTSTRAP_NAME ?? 'Institute Administrator'
  };
}

module.exports = { getConfig, loadDotEnv };
