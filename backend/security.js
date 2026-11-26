const crypto = require('crypto');
const https = require('https');

function generateId(prefix = 'id') {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(email));
}

function roundInr(value) {
  return Math.max(0, Math.round(Number(value) || 0));
}

const COMMON_WEAK_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  'password',
  'password123',
  'qwerty123',
  '11111111',
  '00000000',
  'abcdefgh'
]);

function validateStrongPassword(password) {
  const pwd = String(password || '');
  if (pwd.length < 8) {
    return 'Password must be at least 8 characters long.';
  }
  if (COMMON_WEAK_PASSWORDS.has(pwd.toLowerCase())) {
    return 'Please choose a stronger password (avoid common sequences like 12345678 or password).';
  }
  return null;
}

function hashPassword(password) {
  const pwd = String(password || '');
  const weakErr = validateStrongPassword(pwd);
  if (weakErr) {
    throw new Error(weakErr);
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(pwd, salt, 64).toString('hex');
  return `scrypt$${salt}$${derived}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  const parts = storedHash.split('$');
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false;
  const [, salt, originalHex] = parts;
  const derived = crypto.scryptSync(String(password || ''), salt, 64);
  const original = Buffer.from(originalHex, 'hex');
  if (derived.length !== original.length) return false;
  return crypto.timingSafeEqual(derived, original);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token || '')).digest('hex');
}

function base64UrlEncode(input) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(String(input), 'utf8');
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function base64UrlDecode(str) {
  const padLen = (4 - (str.length % 4)) % 4;
  const normalized = str.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(padLen);
  return Buffer.from(normalized, 'base64').toString('utf8');
}

function signJwt(payload, secret, ttlSeconds = 60 * 60 * 24 * 7) {
  const nowSec = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: nowSec,
    exp: nowSec + ttlSeconds,
    jti: crypto.randomUUID()
  };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', secret).update(data).digest();
  return `${data}.${base64UrlEncode(sig)}`;
}

function verifyJwt(token, secret) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;
  const expectedSig = base64UrlEncode(
    crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest()
  );
  const a = Buffer.from(sig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try {
    const parsed = JSON.parse(base64UrlDecode(body));
    const nowSec = Math.floor(Date.now() / 1000);
    if (typeof parsed.exp === 'number' && parsed.exp < nowSec) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function computePaymentSignature({ orderId, paymentId, amount, secret }) {
  const payload = `${orderId}|${paymentId}|${roundInr(amount)}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

function verifyPaymentSignature({ orderId, paymentId, amount, signature, secret }) {
  if (!signature || !orderId || !paymentId) return false;
  const expected = computePaymentSignature({ orderId, paymentId, amount, secret });
  const a = Buffer.from(String(signature));
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function fetchJsonHttps(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body || '{}');
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(parsed);
          } else {
            reject(new Error(parsed.error_description || parsed.error || `HTTP ${res.statusCode}`));
          }
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

async function verifyGoogleIdToken(idToken, { expectedClientId = '', verifyGoogleTokenFn = null } = {}) {
  if (!idToken || typeof idToken !== 'string') {
    throw new Error('Google ID token is required.');
  }
  const claims = verifyGoogleTokenFn
    ? await verifyGoogleTokenFn(idToken)
    : await fetchJsonHttps(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`);

  if (!claims || !claims.sub || !claims.email) {
    throw new Error('Invalid Google token claims.');
  }
  const isVerified = claims.email_verified === true || claims.email_verified === 'true';
  if (!isVerified) {
    throw new Error('Google email address must be verified.');
  }
  if (expectedClientId && claims.aud && claims.aud !== expectedClientId) {
    throw new Error('Google token audience mismatch.');
  }
  return {
    googleUid: String(claims.sub),
    email: normalizeEmail(claims.email),
    emailVerified: true,
    name: String(claims.name || claims.email.split('@')[0]).trim(),
    picture: claims.picture ? String(claims.picture) : null
  };
}

function sanitizeUser(user) {
  if (!user) return null;
  const { passwordHash, ...safe } = user;
  return safe;
}

module.exports = {
  generateId,
  normalizeEmail,
  isValidEmail,
  roundInr,
  validateStrongPassword,
  hashPassword,
  verifyPassword,
  hashToken,
  signJwt,
  verifyJwt,
  computePaymentSignature,
  verifyPaymentSignature,
  verifyGoogleIdToken,
  sanitizeUser
};
