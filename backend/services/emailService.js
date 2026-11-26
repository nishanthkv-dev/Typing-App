const https = require('https');

/**
 * Transactional email dispatcher for backend password resets.
 * Uses Resend HTTPS API when RESEND_API_KEY is configured.
 * Note: When Firebase Web Auth is active in the client, Firebase's built-in
 * sendPasswordResetEmail() handles email delivery directly.
 */
function sendViaResend({ apiKey, from, to, subject, html }) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({ from, to: [to], subject, html });
    const req = https.request(
      {
        hostname: 'api.resend.com',
        path: '/emails',
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload)
        }
      },
      (res) => {
        let body = '';
        res.on('data', chunk => { body += chunk; });
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve({ sent: true, provider: 'resend' });
          } else {
            reject(new Error(`Resend API error (${res.statusCode}): ${body}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function sendPasswordResetEmail({ config, to, resetToken }) {
  if (!config || !config.resendApiKey) {
    return { sent: false, reason: 'no_email_provider_configured' };
  }
  const resetLink = config.appPublicUrl
    ? `${config.appPublicUrl.replace(/\/$/, '')}/?resetToken=${encodeURIComponent(resetToken)}`
    : null;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:20px;border:1px solid #e2e8f0;border-radius:12px;">
      <h2 style="margin:0 0 12px;color:#1e293b;">Typing Thalaiva — Password Reset</h2>
      <p style="color:#475569;font-size:14px;line-height:1.5;">
        We received a request to reset your Typing Thalaiva student password. This token expires in <strong>15 minutes</strong>.
      </p>
      ${resetLink ? `<p><a href="${resetLink}" style="display:inline-block;padding:10px 18px;background:#2563eb;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Reset Password</a></p>` : ''}
      <p style="font-size:13px;color:#64748b;">Or enter this reset token in the app:</p>
      <div style="background:#f8fafc;padding:10px 14px;border-radius:8px;font-family:monospace;font-size:14px;font-weight:bold;color:#0f172a;">${resetToken}</div>
    </div>
  `;
  return sendViaResend({
    apiKey: config.resendApiKey,
    from: config.emailFrom || 'no-reply@srikalaimagal.in',
    to,
    subject: 'Typing Thalaiva — Password Reset Instructions',
    html
  });
}

module.exports = {
  sendPasswordResetEmail
};
