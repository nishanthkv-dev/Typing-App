const crypto = require('crypto');

const SANDBOX_BASE_URL = 'https://api-preprod.phonepe.com/apis/pg-sandbox';
const PROD_BASE_URL = 'https://api.phonepe.com/apis/hermes';

function getPhonePeBaseUrl(config) {
  if (config.phonepeBaseUrl) return String(config.phonepeBaseUrl).replace(/\/$/, '');
  return config.phonepeEnv === 'production' ? PROD_BASE_URL : SANDBOX_BASE_URL;
}

function computeXVerify(payloadStr, saltKey, saltIndex = '1') {
  const hash = crypto.createHash('sha256').update(String(payloadStr) + String(saltKey)).digest('hex');
  return `${hash}###${saltIndex}`;
}

function verifyPhonePeWebhookSignature(rawBodyBase64, xVerifyHeader, saltKey, saltIndex = '1') {
  if (!rawBodyBase64 || !xVerifyHeader || !saltKey) return false;
  const expected = computeXVerify(rawBodyBase64, saltKey, saltIndex);
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(xVerifyHeader).trim()));
  } catch (_) {
    return false;
  }
}

async function initiatePhonePePayment({
  config,
  merchantOrderId,
  amountPaise,
  studentId,
  studentPhone,
  redirectUrl,
  callbackUrl,
  fetchImpl = global.fetch
}) {
  if (!config.phonepeMerchantId || !config.phonepeSaltKey) {
    return {
      configured: false,
      blocked: true,
      code: 'PHONEPE_SANDBOX_CREDENTIALS_MISSING',
      error: 'PhonePe sandbox credentials (PHONEPE_MERCHANT_ID / PHONEPE_SALT_KEY) are not configured.'
    };
  }
  const baseUrl = getPhonePeBaseUrl(config);
  const payloadObj = {
    merchantId: config.phonepeMerchantId,
    merchantTransactionId: merchantOrderId,
    merchantUserId: studentId,
    amount: Math.round(Number(amountPaise)),
    redirectUrl: redirectUrl || `${config.appPublicUrl || 'http://localhost:4000'}/api/payments/phonepe/redirect`,
    redirectMode: 'REDIRECT',
    callbackUrl: callbackUrl || `${config.appPublicUrl || 'http://localhost:4000'}/api/payments/phonepe/webhook`,
    mobileNumber: studentPhone || undefined,
    paymentInstrument: { type: 'PAY_PAGE' }
  };
  const base64Payload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64');
  const xVerify = computeXVerify(`${base64Payload}/pg/v1/pay`, config.phonepeSaltKey, config.phonepeSaltIndex || '1');

  const resp = await fetchImpl(`${baseUrl}/pg/v1/pay`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify
    },
    body: JSON.stringify({ request: base64Payload })
  });
  const data = await resp.json();
  const redirectTarget = data && data.data && data.data.instrumentResponse && data.data.instrumentResponse.redirectInfo
    ? data.data.instrumentResponse.redirectInfo.url
    : null;
  return {
    configured: true,
    blocked: false,
    ok: Boolean(data && data.success),
    code: data && data.code,
    redirectUrl: redirectTarget,
    raw: data
  };
}

async function checkPhonePeOrderStatus({ config, merchantOrderId, fetchImpl = global.fetch }) {
  if (!config.phonepeMerchantId || !config.phonepeSaltKey) {
    return {
      configured: false,
      blocked: true,
      code: 'PHONEPE_SANDBOX_CREDENTIALS_MISSING'
    };
  }
  const baseUrl = getPhonePeBaseUrl(config);
  const statusPath = `/pg/v1/status/${config.phonepeMerchantId}/${merchantOrderId}`;
  const xVerify = computeXVerify(statusPath, config.phonepeSaltKey, config.phonepeSaltIndex || '1');
  const resp = await fetchImpl(`${baseUrl}${statusPath}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-VERIFY': xVerify,
      'X-MERCHANT-ID': config.phonepeMerchantId
    }
  });
  const data = await resp.json();
  const stateCode = String((data && data.code) || (data && data.data && data.data.state) || '').toUpperCase();
  const mappedStatus = stateCode === 'PAYMENT_SUCCESS' || stateCode === 'COMPLETED'
    ? 'PAID'
    : (stateCode === 'PAYMENT_PENDING' || stateCode === 'PENDING' ? 'PENDING' : 'FAILED');
  return {
    configured: true,
    blocked: false,
    status: mappedStatus,
    gatewayTxnId: data && data.data && data.data.transactionId ? data.data.transactionId : null,
    amountPaise: data && data.data && data.data.amount ? Number(data.data.amount) : null,
    code: stateCode,
    raw: data
  };
}

module.exports = {
  computeXVerify,
  verifyPhonePeWebhookSignature,
  initiatePhonePePayment,
  checkPhonePeOrderStatus
};
