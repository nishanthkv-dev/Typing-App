const { createAppError } = require('../services/couponService');

/**
 * In-memory sliding-window rate limiter for auth & checkout endpoints.
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 30 } = {}) {
  const hits = new Map();

  function check(key) {
    const now = Date.now();
    const cutoff = now - windowMs;
    const list = (hits.get(key) || []).filter(ts => ts > cutoff);
    if (list.length >= max) {
      const retryAfterSec = Math.max(1, Math.ceil((list[0] + windowMs - now) / 1000));
      const err = createAppError(
        `Too many requests. Please try again in ${retryAfterSec} seconds.`,
        429,
        'RATE_LIMITED'
      );
      err.retryAfterSec = retryAfterSec;
      throw err;
    }
    list.push(now);
    hits.set(key, list);

    // Opportunistic map cleanup to bound memory
    if (hits.size > 5000) {
      for (const [k, timestamps] of hits.entries()) {
        if (!timestamps.some(ts => ts > cutoff)) {
          hits.delete(k);
        }
      }
    }
  }

  return { check };
}

const SENSITIVE_KEY_PATTERN = /(password|token|secret|authorization|cookie|private_key|serviceaccount)/i;

function redactObject(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 4) return obj;
  if (Array.isArray(obj)) return obj.map(item => redactObject(item, depth + 1));
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (SENSITIVE_KEY_PATTERN.test(k)) {
      out[k] = '[REDACTED]';
    } else if (v && typeof v === 'object') {
      out[k] = redactObject(v, depth + 1);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function logSafe(level, event, details = {}) {
  const entry = {
    ts: new Date().toISOString(),
    level,
    event,
    ...redactObject(details)
  };
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

module.exports = {
  createRateLimiter,
  redactObject,
  logSafe
};
