const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const { getConfig } = require('./config');
const { AtomicDatabase } = require('./db');
const {
  generateId,
  normalizeEmail,
  isValidEmail,
  roundInr,
  hashPassword,
  verifyPassword,
  hashToken,
  signJwt,
  verifyJwt,
  verifyGoogleIdToken,
  sanitizeUser
} = require('./security');
const { evaluateCouponQuote, createAppError, resolveCourseAlias } = require('./services/couponService');
const {
  addAuditLog,
  addNotification,
  computeStudentEntitlement,
  enrichEnrollment,
  createCheckoutOrEnroll,
  verifyStudentPayment
} = require('./services/enrollmentService');

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const result = {};
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    const key = part.slice(0, eq).trim();
    const val = part.slice(eq + 1).trim();
    try {
      result[key] = decodeURIComponent(val);
    } catch {
      result[key] = val;
    }
  }
  return result;
}

function readJsonBody(req, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0;
    let raw = '';
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(createAppError('Request payload too large.', 413, 'PAYLOAD_TOO_LARGE'));
        req.destroy();
        return;
      }
      raw += chunk;
    });
    req.on('end', () => {
      if (!raw.trim()) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(createAppError('Invalid JSON request body.', 400, 'INVALID_JSON'));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const body = JSON.stringify(payload);
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...extraHeaders
  });
  res.end(body);
}

function getClientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  if (fwd) return String(fwd).split(',')[0].trim();
  return req.socket ? req.socket.remoteAddress || '' : '';
}

function serveStaticFile(res, filePath, contentType) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
    return;
  }
  const buf = fs.readFileSync(filePath);
  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });
  res.end(buf);
}

function createServer(options = {}) {
  const config = getConfig(options);
  const db = options.db || new AtomicDatabase(config.dbPath);
  const verifyGoogleTokenFn = options.verifyGoogleTokenFn || null;
  const onPasswordResetToken = options.onPasswordResetToken || null;
  const exposeResetTokenForTest = Boolean(options.exposeResetTokenForTest);
  const adminDir = path.resolve(__dirname, '..', 'admin');

  if (config.adminBootstrapEmail && config.adminBootstrapPassword) {
    // Synchronous-safe queued bootstrap on startup
    db.ensureBootstrapAdmin({
      email: config.adminBootstrapEmail,
      password: config.adminBootstrapPassword,
      name: config.adminBootstrapName
    }).catch(err => console.error('[BootstrapAdmin]', err.message));
  }

  function applySecurityAndCorsHeaders(req, res) {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    const origin = req.headers.origin;
    if (origin && (config.allowedOrigins.includes('*') || config.allowedOrigins.includes(origin) || origin.startsWith('http://localhost') || origin.startsWith('https://localhost') || origin.startsWith('capacitor://'))) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Idempotency-Key');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.setHeader('Vary', 'Origin');
    }
  }

  function authenticate(req, { preferredCookie = 'tt_student_token', checkSingleDevice = true } = {}) {
    const authHeader = req.headers.authorization || '';
    let token = '';
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    } else {
      const cookies = parseCookies(req);
      token = cookies[preferredCookie] || cookies.tt_admin_token || cookies.tt_student_token || '';
    }
    if (!token) {
      throw createAppError('Authentication required.', 401, 'UNAUTHORIZED');
    }
    const claims = verifyJwt(token, config.jwtSecret);
    if (!claims || !claims.sub) {
      throw createAppError('Invalid or expired session token.', 401, 'INVALID_TOKEN');
    }
    const state = db.read();
    const user = state.users.find(u => u.id === claims.sub);
    if (!user || user.status !== 'active') {
      throw createAppError('Account not found or inactive.', 401, 'ACCOUNT_INACTIVE');
    }
    if (checkSingleDevice && user.role === 'student') {
      if (!user.activeSessionId || claims.sessionId !== user.activeSessionId) {
        throw createAppError(
          'Your account has been logged in on another device. Please sign in again to continue.',
          401,
          'SESSION_REVOKED'
        );
      }
    }
    return { user, claims };
  }

  function optionalStudentAuth(req) {
    try {
      const { user } = authenticate(req, { preferredCookie: 'tt_student_token', checkSingleDevice: true });
      return user;
    } catch {
      return null;
    }
  }

  function requireStudent(req) {
    const { user } = authenticate(req, { preferredCookie: 'tt_student_token', checkSingleDevice: true });
    if (user.role !== 'student') {
      throw createAppError('Student access required.', 403, 'FORBIDDEN_ROLE');
    }
    return user;
  }

  function requireAdmin(req) {
    const { user } = authenticate(req, { preferredCookie: 'tt_admin_token', checkSingleDevice: false });
    if (user.role !== 'admin') {
      throw createAppError('Administrator privileges required.', 403, 'ADMIN_REQUIRED');
    }
    return user;
  }

  function buildStudentDashboard(state, user) {
    const userEnrollments = state.enrollments
      .filter(e => e.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(enr => {
        const purchase = state.purchases.find(p => p.id === enr.purchaseId) || null;
        return enrichEnrollment(enr, purchase);
      });

    const activeEnrollments = userEnrollments.filter(e =>
      ['free_enrollment', 'payment_verified', 'active', 'exam_date_pending', 'scheduled', 'payment_pending'].includes(e.status)
    );
    const completedHistory = userEnrollments.filter(e =>
      e.status === 'completed' || e.status === 'rebooking_eligible'
    );
    const rebookingEligibleCourses = userEnrollments.filter(e =>
      e.status === 'rebooking_eligible' || e.rebookingAllowed === true
    );
    const upcomingExams = userEnrollments.filter(e => e.examDate && e.status === 'scheduled');
    const purchases = state.purchases
      .filter(p => p.userId === user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const notifications = state.notifications
      .filter(n => n.userId === user.id)
      .slice(0, 30);

    return {
      user: sanitizeUser(user),
      entitlement: computeStudentEntitlement(state, user.id),
      activeEnrollments,
      upcomingExams,
      completedHistory,
      rebookingEligibleCourses,
      allEnrollments: userEnrollments,
      purchases,
      notifications
    };
  }

  async function handleRequest(req, res) {
    applySecurityAndCorsHeaders(req, res);

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;
    const method = req.method.toUpperCase();
    const ipAddress = getClientIp(req);

    // -----------------------------------------------------------------------
    // SEPARATE WEB ADMIN PORTAL PAGES (/admin, /admin/login, /admin/dashboard)
    // -----------------------------------------------------------------------
    if (method === 'GET' && (pathname === '/admin' || pathname === '/admin/' || pathname === '/admin/dashboard')) {
      return serveStaticFile(res, path.join(adminDir, 'dashboard.html'), 'text/html; charset=utf-8');
    }
    if (method === 'GET' && pathname === '/admin/login') {
      return serveStaticFile(res, path.join(adminDir, 'login.html'), 'text/html; charset=utf-8');
    }
    if (method === 'GET' && pathname === '/admin/styles.css') {
      return serveStaticFile(res, path.join(adminDir, 'styles.css'), 'text/css; charset=utf-8');
    }
    if (method === 'GET' && pathname === '/admin/app.js') {
      return serveStaticFile(res, path.join(adminDir, 'app.js'), 'application/javascript; charset=utf-8');
    }

    try {
      // ---------------------------------------------------------------------
      // HEALTH & PUBLIC CATALOG
      // ---------------------------------------------------------------------
      if (method === 'GET' && pathname === '/api/health') {
        return sendJson(res, 200, { ok: true, service: 'typing-thalaiva-api', timestamp: new Date().toISOString() });
      }

      if (method === 'GET' && pathname === '/api/courses') {
        const state = db.read();
        const courses = state.courses.filter(c => c.active);
        return sendJson(res, 200, { courses });
      }

      // ---------------------------------------------------------------------
      // STUDENT AUTHENTICATION (/api/auth/*)
      // ---------------------------------------------------------------------
      if (method === 'POST' && pathname === '/api/auth/register') {
        const body = await readJsonBody(req);
        const name = String(body.name || '').trim();
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        const phone = String(body.phone || '').trim();
        const regNumber = String(body.regNumber || '').trim();
        const institute = String(body.institute || '').trim();

        if (!name || name.length < 2) {
          throw createAppError('Full student name is required.', 400, 'INVALID_NAME');
        }
        if (!isValidEmail(email)) {
          throw createAppError('Valid email address is required.', 400, 'INVALID_EMAIL');
        }
        if (password.length < 6) {
          throw createAppError('Password must be at least 6 characters.', 400, 'WEAK_PASSWORD');
        }

        const result = await db.runTransaction((draft) => {
          const existing = draft.users.find(u => u.email === email);
          if (existing) {
            throw createAppError('An account with this email already exists. Please log in instead.', 409, 'EMAIL_EXISTS');
          }
          const nowIso = new Date().toISOString();
          const sessionId = `sess_${generateId('dev')}`;
          const student = {
            id: generateId('stu'),
            role: 'student', // Hardcoded role: students cannot self-assign admin role
            name,
            email,
            emailVerified: false,
            googleUid: null,
            passwordHash: hashPassword(password),
            authProviders: ['password'],
            phone,
            regNumber,
            institute,
            activeSessionId: sessionId,
            status: 'active',
            createdAt: nowIso,
            updatedAt: nowIso
          };
          draft.users.push(student);
          addAuditLog(draft, {
            actor: student,
            action: 'STUDENT_REGISTERED',
            entityType: 'user',
            entityId: student.id,
            details: { provider: 'password' },
            ipAddress
          });
          return {
            user: student,
            sessionId,
            entitlement: computeStudentEntitlement(draft, student.id)
          };
        });

        const token = signJwt({
          sub: result.user.id,
          role: 'student',
          sessionId: result.sessionId
        }, config.jwtSecret, config.tokenTtlSeconds);

        return sendJson(res, 201, {
          token,
          sessionId: result.sessionId,
          user: sanitizeUser(result.user),
          entitlement: result.entitlement
        });
      }

      if (method === 'POST' && pathname === '/api/auth/login') {
        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        if (!isValidEmail(email) || !password) {
          throw createAppError('Email and password are required.', 400, 'MISSING_CREDENTIALS');
        }

        const result = await db.runTransaction((draft) => {
          const user = draft.users.find(u => u.email === email);
          if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
            throw createAppError('Invalid email or password.', 401, 'INVALID_CREDENTIALS');
          }
          if (user.role !== 'student') {
            throw createAppError('Please use the separate Admin Portal for administrator sign-in.', 403, 'USE_ADMIN_PORTAL');
          }
          if (user.status !== 'active') {
            throw createAppError('This account is disabled. Contact support.', 403, 'ACCOUNT_DISABLED');
          }
          const sessionId = `sess_${generateId('dev')}`;
          user.activeSessionId = sessionId;
          user.updatedAt = new Date().toISOString();

          addAuditLog(draft, {
            actor: user,
            action: 'STUDENT_LOGIN_PASSWORD',
            entityType: 'user',
            entityId: user.id,
            details: { sessionId },
            ipAddress
          });

          return {
            user,
            sessionId,
            entitlement: computeStudentEntitlement(draft, user.id)
          };
        });

        const token = signJwt({
          sub: result.user.id,
          role: 'student',
          sessionId: result.sessionId
        }, config.jwtSecret, config.tokenTtlSeconds);

        return sendJson(res, 200, {
          token,
          sessionId: result.sessionId,
          user: sanitizeUser(result.user),
          entitlement: result.entitlement
        });
      }

      if (method === 'POST' && pathname === '/api/auth/google') {
        const body = await readJsonBody(req);
        const googleProfile = await verifyGoogleIdToken(body.idToken, {
          expectedClientId: config.googleClientId,
          verifyGoogleTokenFn
        });

        const result = await db.runTransaction((draft) => {
          const nowIso = new Date().toISOString();
          const sessionId = `sess_${generateId('dev')}`;

          // Match first by verified Google UID, then by verified email (link accounts seamlessly without duplicates)
          let user = draft.users.find(u => u.googleUid === googleProfile.googleUid);
          if (!user) {
            user = draft.users.find(u => u.email === googleProfile.email);
          }

          if (user && user.role !== 'student') {
            throw createAppError('Administrator accounts cannot authenticate via student Google login.', 403, 'USE_ADMIN_PORTAL');
          }

          if (user) {
            if (user.status !== 'active') {
              throw createAppError('This account is disabled.', 403, 'ACCOUNT_DISABLED');
            }
            user.googleUid = googleProfile.googleUid;
            user.emailVerified = true;
            if (!user.authProviders.includes('google')) {
              user.authProviders.push('google');
            }
            if (!user.name && googleProfile.name) {
              user.name = googleProfile.name;
            }
            user.activeSessionId = sessionId;
            user.updatedAt = nowIso;
          } else {
            user = {
              id: generateId('stu'),
              role: 'student',
              name: googleProfile.name,
              email: googleProfile.email,
              emailVerified: true,
              googleUid: googleProfile.googleUid,
              passwordHash: null,
              authProviders: ['google'],
              phone: '',
              regNumber: '',
              institute: '',
              activeSessionId: sessionId,
              status: 'active',
              createdAt: nowIso,
              updatedAt: nowIso
            };
            draft.users.push(user);
          }

          addAuditLog(draft, {
            actor: user,
            action: 'STUDENT_LOGIN_GOOGLE',
            entityType: 'user',
            entityId: user.id,
            details: { googleUid: googleProfile.googleUid, sessionId },
            ipAddress
          });

          return {
            user,
            sessionId,
            entitlement: computeStudentEntitlement(draft, user.id)
          };
        });

        const token = signJwt({
          sub: result.user.id,
          role: 'student',
          sessionId: result.sessionId
        }, config.jwtSecret, config.tokenTtlSeconds);

        return sendJson(res, 200, {
          token,
          sessionId: result.sessionId,
          user: sanitizeUser(result.user),
          entitlement: result.entitlement
        });
      }

      if (method === 'POST' && pathname === '/api/auth/forgot-password') {
        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        if (!isValidEmail(email)) {
          throw createAppError('Valid email address is required.', 400, 'INVALID_EMAIL');
        }

        const resetInfo = await db.runTransaction((draft) => {
          const user = draft.users.find(u => u.email === email && u.role === 'student');
          if (!user) return null;
          const rawToken = generateId('rst') + generateId('tok');
          const now = Date.now();
          draft.passwordResets.push({
            id: generateId('pr'),
            userId: user.id,
            email: user.email,
            tokenHash: hashToken(rawToken),
            expiresAt: new Date(now + 15 * 60 * 1000).toISOString(),
            usedAt: null,
            createdAt: new Date(now).toISOString()
          });
          addAuditLog(draft, {
            actor: user,
            action: 'STUDENT_PASSWORD_RESET_REQUESTED',
            entityType: 'user',
            entityId: user.id,
            ipAddress
          });
          return { rawToken, email: user.email, userId: user.id };
        });

        if (resetInfo && typeof onPasswordResetToken === 'function') {
          onPasswordResetToken(resetInfo);
        }

        const responsePayload = {
          ok: true,
          message: 'If an account matches that email, password reset instructions have been generated.'
        };
        if (exposeResetTokenForTest && resetInfo) {
          responsePayload.resetToken = resetInfo.rawToken;
        }
        return sendJson(res, 200, responsePayload);
      }

      if (method === 'POST' && pathname === '/api/auth/reset-password') {
        const body = await readJsonBody(req);
        const token = String(body.token || '').trim();
        const newPassword = String(body.newPassword || '');
        if (!token || newPassword.length < 6) {
          throw createAppError('Valid reset token and new password (min 6 chars) are required.', 400, 'INVALID_RESET_PAYLOAD');
        }

        await db.runTransaction((draft) => {
          const tokenHash = hashToken(token);
          const resetRow = draft.passwordResets.find(r => r.tokenHash === tokenHash && !r.usedAt);
          if (!resetRow || new Date(resetRow.expiresAt).getTime() < Date.now()) {
            throw createAppError('Reset token is invalid or has expired.', 400, 'RESET_TOKEN_INVALID');
          }
          const user = draft.users.find(u => u.id === resetRow.userId);
          if (!user) {
            throw createAppError('Associated user account no longer exists.', 404, 'USER_NOT_FOUND');
          }
          user.passwordHash = hashPassword(newPassword);
          if (!user.authProviders.includes('password')) {
            user.authProviders.push('password');
          }
          user.activeSessionId = null; // Force clean re-login across devices
          user.updatedAt = new Date().toISOString();
          resetRow.usedAt = new Date().toISOString();

          addAuditLog(draft, {
            actor: user,
            action: 'STUDENT_PASSWORD_RESET_COMPLETED',
            entityType: 'user',
            entityId: user.id,
            ipAddress
          });
        });

        return sendJson(res, 200, { ok: true, message: 'Password updated successfully. Please sign in.' });
      }

      if (method === 'POST' && pathname === '/api/auth/logout') {
        try {
          const { user } = authenticate(req, { preferredCookie: 'tt_student_token', checkSingleDevice: false });
          await db.runTransaction((draft) => {
            const target = draft.users.find(u => u.id === user.id);
            if (target) {
              target.activeSessionId = null;
              target.updatedAt = new Date().toISOString();
            }
          });
        } catch {
          // Idempotent logout
        }
        return sendJson(res, 200, { ok: true });
      }

      if (method === 'GET' && pathname === '/api/auth/me') {
        const { user } = authenticate(req, { preferredCookie: 'tt_student_token', checkSingleDevice: true });
        const state = db.read();
        return sendJson(res, 200, {
          user: sanitizeUser(user),
          entitlement: computeStudentEntitlement(state, user.id)
        });
      }

      // ---------------------------------------------------------------------
      // STUDENT PROFILE, QUOTES, CHECKOUT, PAYMENTS, DASHBOARD
      // ---------------------------------------------------------------------
      if (method === 'PUT' && pathname === '/api/student/profile') {
        const student = requireStudent(req);
        const body = await readJsonBody(req);
        const updated = await db.runTransaction((draft) => {
          const user = draft.users.find(u => u.id === student.id);
          if (body.name !== undefined && String(body.name).trim()) {
            user.name = String(body.name).trim().slice(0, 60);
          }
          if (body.phone !== undefined) user.phone = String(body.phone).trim().slice(0, 20);
          if (body.regNumber !== undefined) user.regNumber = String(body.regNumber).trim().slice(0, 40);
          if (body.institute !== undefined) user.institute = String(body.institute).trim().slice(0, 100);
          user.updatedAt = new Date().toISOString();
          return sanitizeUser(user);
        });
        return sendJson(res, 200, { user: updated });
      }

      if (method === 'DELETE' && pathname === '/api/student/account') {
        const student = requireStudent(req);
        await db.runTransaction((draft) => {
          draft.users = draft.users.filter(u => u.id !== student.id);
          draft.notifications = draft.notifications.filter(n => n.userId !== student.id);
          addAuditLog(draft, {
            actor: student,
            action: 'STUDENT_ACCOUNT_DELETED',
            entityType: 'user',
            entityId: student.id,
            ipAddress
          });
        });
        return sendJson(res, 200, { ok: true });
      }

      if (method === 'POST' && pathname === '/api/checkout/quote') {
        const maybeStudent = optionalStudentAuth(req);
        const body = await readJsonBody(req);
        const state = db.read();
        const quote = evaluateCouponQuote({
          db: state,
          userId: maybeStudent ? maybeStudent.id : null,
          courseId: body.courseId,
          couponCode: body.couponCode
        });
        return sendJson(res, 200, {
          course: quote.course,
          couponApplied: quote.couponApplied,
          couponCode: quote.couponCode,
          couponDescription: quote.coupon ? quote.coupon.description : null,
          originalPrice: quote.originalPrice,
          discountAmount: quote.discountAmount,
          finalPrice: quote.finalPrice,
          isFreeEnrollment: quote.isFreeEnrollment,
          breakdownLabel: quote.breakdownLabel
        });
      }

      if (method === 'POST' && pathname === '/api/checkout/complete') {
        const student = requireStudent(req);
        const body = await readJsonBody(req);
        const idempotencyKey = req.headers['x-idempotency-key'] || body.idempotencyKey || '';
        const result = await createCheckoutOrEnroll({
          db,
          user: student,
          courseId: body.courseId,
          couponCode: body.couponCode || '',
          attemptType: body.attemptType || 'initial',
          paymentMethod: body.paymentMethod || 'razorpay',
          idempotencyKey: String(idempotencyKey),
          ipAddress,
          config
        });
        return sendJson(res, result.idempotentReplay ? 200 : 201, result);
      }

      if (method === 'POST' && pathname === '/api/payments/verify') {
        const student = requireStudent(req);
        const body = await readJsonBody(req);
        const result = await verifyStudentPayment({
          db,
          user: student,
          purchaseId: body.purchaseId,
          orderId: body.orderId,
          paymentId: body.paymentId,
          signature: body.signature,
          ipAddress,
          config
        });
        return sendJson(res, 200, result);
      }

      if (method === 'GET' && pathname === '/api/student/dashboard') {
        const student = requireStudent(req);
        const state = db.read();
        return sendJson(res, 200, buildStudentDashboard(state, student));
      }

      if (method === 'POST' && pathname === '/api/student/notifications/read') {
        const student = requireStudent(req);
        await db.runTransaction((draft) => {
          for (const n of draft.notifications) {
            if (n.userId === student.id) n.read = true;
          }
        });
        return sendJson(res, 200, { ok: true });
      }

      // ---------------------------------------------------------------------
      // ADMIN PORTAL AUTHENTICATION (/api/admin/auth/*)
      // ---------------------------------------------------------------------
      if (method === 'POST' && pathname === '/api/admin/auth/login') {
        const body = await readJsonBody(req);
        const email = normalizeEmail(body.email);
        const password = String(body.password || '');
        if (!isValidEmail(email) || !password) {
          throw createAppError('Admin email and password are required.', 400, 'MISSING_CREDENTIALS');
        }

        const adminUser = await db.runTransaction((draft) => {
          const user = draft.users.find(u => u.email === email && u.role === 'admin');
          if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
            throw createAppError('Invalid administrator credentials.', 401, 'INVALID_ADMIN_CREDENTIALS');
          }
          if (user.status !== 'active') {
            throw createAppError('Administrator account is disabled.', 403, 'ADMIN_DISABLED');
          }
          addAuditLog(draft, {
            actor: user,
            action: 'ADMIN_LOGIN',
            entityType: 'user',
            entityId: user.id,
            ipAddress
          });
          return user;
        });

        const token = signJwt({
          sub: adminUser.id,
          role: 'admin'
        }, config.jwtSecret, config.tokenTtlSeconds);

        const cookieFlags = `HttpOnly; Path=/; SameSite=Strict; Max-Age=${config.tokenTtlSeconds}${config.nodeEnv === 'production' ? '; Secure' : ''}`;
        return sendJson(
          res,
          200,
          { token, admin: sanitizeUser(adminUser) },
          { 'Set-Cookie': `tt_admin_token=${encodeURIComponent(token)}; ${cookieFlags}` }
        );
      }

      if (method === 'POST' && pathname === '/api/admin/auth/logout') {
        return sendJson(
          res,
          200,
          { ok: true },
          { 'Set-Cookie': 'tt_admin_token=; HttpOnly; Path=/; SameSite=Strict; Max-Age=0' }
        );
      }

      if (method === 'GET' && pathname === '/api/admin/auth/me') {
        const admin = requireAdmin(req);
        return sendJson(res, 200, { admin: sanitizeUser(admin) });
      }

      // ---------------------------------------------------------------------
      // ADMIN PORTAL PROTECTED APIs (/api/admin/* — STRICT RBAC: ADMIN ONLY)
      // ---------------------------------------------------------------------
      if (pathname.startsWith('/api/admin/')) {
        const admin = requireAdmin(req);

        // OVERVIEW
        if (method === 'GET' && pathname === '/api/admin/overview') {
          const state = db.read();
          const students = state.users.filter(u => u.role === 'student');
          const totalRevenueInr = state.purchases
            .filter(p => p.paymentStatus === 'verified')
            .reduce((sum, p) => sum + roundInr(p.finalAmount), 0);
          const totalDiscountInr = state.purchases
            .filter(p => p.paymentStatus === 'verified' || p.paymentStatus === 'free_enrollment')
            .reduce((sum, p) => sum + roundInr(p.discountAmount), 0);

          return sendJson(res, 200, {
            metrics: {
              totalStudents: students.length,
              totalCourses: state.courses.length,
              activeCourses: state.courses.filter(c => c.active).length,
              totalEnrollments: state.enrollments.length,
              activeEnrollments: state.enrollments.filter(e =>
                ['free_enrollment', 'payment_verified', 'active', 'exam_date_pending', 'scheduled'].includes(e.status)
              ).length,
              awaitingExamDate: state.enrollments.filter(e => e.status === 'exam_date_pending').length,
              scheduledExams: state.enrollments.filter(e => e.status === 'scheduled').length,
              completedExams: state.enrollments.filter(e => e.status === 'completed' || e.status === 'rebooking_eligible').length,
              pendingPayments: state.purchases.filter(p => p.paymentStatus === 'pending').length,
              freeCouponEnrollments: state.purchases.filter(p => p.paymentStatus === 'free_enrollment').length,
              activeCoupons: state.coupons.filter(c => c.active).length,
              couponRedemptionsCount: state.couponRedemptions.filter(r => r.status !== 'released').length,
              totalRevenueInr,
              totalDiscountInr
            },
            recentPurchases: state.purchases.slice(0, 8),
            recentAuditLogs: state.auditLogs.slice(0, 12)
          });
        }

        // STUDENTS
        if (method === 'GET' && pathname === '/api/admin/students') {
          const state = db.read();
          const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();
          const courseFilter = parsedUrl.searchParams.get('courseId') || '';
          const statusFilter = parsedUrl.searchParams.get('status') || '';

          let students = state.users
            .filter(u => u.role === 'student')
            .map(u => {
              const enrollments = state.enrollments
                .filter(e => e.userId === u.id)
                .map(e => enrichEnrollment(e, state.purchases.find(p => p.id === e.purchaseId) || null));
              const purchases = state.purchases.filter(p => p.userId === u.id);
              const couponsUsed = state.couponRedemptions
                .filter(r => r.userId === u.id && r.status !== 'released')
                .map(r => r.couponCode);
              return {
                ...sanitizeUser(u),
                enrollments,
                purchases,
                couponsUsed
              };
            });

          if (q) {
            students = students.filter(s =>
              s.name.toLowerCase().includes(q) ||
              s.email.toLowerCase().includes(q) ||
              (s.phone || '').toLowerCase().includes(q) ||
              (s.regNumber || '').toLowerCase().includes(q)
            );
          }
          if (courseFilter) {
            students = students.filter(s => s.enrollments.some(e => e.courseId === courseFilter));
          }
          if (statusFilter) {
            students = students.filter(s => s.enrollments.some(e => e.status === statusFilter));
          }

          return sendJson(res, 200, { students });
        }

        // COURSES CRUD
        if (method === 'GET' && pathname === '/api/admin/courses') {
          const state = db.read();
          return sendJson(res, 200, { courses: state.courses });
        }

        if (method === 'POST' && pathname === '/api/admin/courses') {
          const body = await readJsonBody(req);
          const title = String(body.title || '').trim();
          const code = String(body.code || '').trim().toUpperCase();
          const priceInr = roundInr(body.priceInr);
          if (!title || !code) {
            throw createAppError('Course title and code are required.', 400, 'INVALID_COURSE');
          }
          const created = await db.runTransaction((draft) => {
            const id = String(body.id || generateId('crs')).trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
            if (draft.courses.find(c => c.id === id || c.code === code)) {
              throw createAppError('Course ID or code already exists.', 409, 'COURSE_EXISTS');
            }
            const nowIso = new Date().toISOString();
            const course = {
              id,
              code,
              title,
              description: String(body.description || '').trim(),
              language: ['en', 'ta', 'both'].includes(body.language) ? body.language : 'both',
              level: ['junior', 'senior', 'coa', 'combo'].includes(body.level) ? body.level : 'senior',
              durationDays: Math.max(1, Number(body.durationDays || 365)),
              priceInr,
              badge: String(body.badge || '').trim() || 'COURSE',
              syllabusCount: Number(body.syllabusCount || 50),
              features: Array.isArray(body.features) ? body.features : [],
              active: body.active !== false,
              createdAt: nowIso,
              updatedAt: nowIso
            };
            draft.courses.push(course);
            addAuditLog(draft, {
              actor: admin,
              action: 'ADMIN_COURSE_CREATED',
              entityType: 'course',
              entityId: course.id,
              details: { code, title, priceInr },
              ipAddress
            });
            return course;
          });
          return sendJson(res, 201, { course: created });
        }

        const courseMatch = pathname.match(/^\/api\/admin\/courses\/([^/]+)$/);
        if (method === 'PUT' && courseMatch) {
          const courseId = decodeURIComponent(courseMatch[1]);
          const body = await readJsonBody(req);
          const updated = await db.runTransaction((draft) => {
            const course = draft.courses.find(c => c.id === courseId);
            if (!course) throw createAppError('Course not found.', 404, 'COURSE_NOT_FOUND');
            if (body.title !== undefined) course.title = String(body.title).trim();
            if (body.description !== undefined) course.description = String(body.description).trim();
            if (body.priceInr !== undefined) course.priceInr = roundInr(body.priceInr);
            if (body.durationDays !== undefined) course.durationDays = Math.max(1, Number(body.durationDays));
            if (body.active !== undefined) course.active = Boolean(body.active);
            if (body.badge !== undefined) course.badge = String(body.badge).trim();
            course.updatedAt = new Date().toISOString();
            addAuditLog(draft, {
              actor: admin,
              action: 'ADMIN_COURSE_UPDATED',
              entityType: 'course',
              entityId: course.id,
              details: body,
              ipAddress
            });
            return course;
          });
          return sendJson(res, 200, { course: updated });
        }

        // PURCHASES & PAYMENT VERIFICATION
        if (method === 'GET' && pathname === '/api/admin/purchases') {
          const state = db.read();
          const status = parsedUrl.searchParams.get('status') || '';
          const couponCode = (parsedUrl.searchParams.get('couponCode') || '').trim().toUpperCase();
          const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();

          let purchases = state.purchases.map(p => {
            const student = state.users.find(u => u.id === p.userId);
            const enrollment = state.enrollments.find(e => e.purchaseId === p.id);
            return {
              ...p,
              studentName: student ? student.name : p.userName,
              studentEmail: student ? student.email : p.userEmail,
              enrollmentStatus: enrollment ? enrollment.status : null,
              enrollmentId: enrollment ? enrollment.id : null
            };
          });

          if (status) purchases = purchases.filter(p => p.paymentStatus === status);
          if (couponCode) purchases = purchases.filter(p => p.couponCode === couponCode);
          if (q) {
            purchases = purchases.filter(p =>
              (p.studentName || '').toLowerCase().includes(q) ||
              (p.studentEmail || '').toLowerCase().includes(q) ||
              (p.courseTitle || '').toLowerCase().includes(q) ||
              (p.couponCode || '').toLowerCase().includes(q) ||
              (p.transactionRef || '').toLowerCase().includes(q)
            );
          }
          return sendJson(res, 200, { purchases });
        }

        const purchaseVerifyMatch = pathname.match(/^\/api\/admin\/purchases\/([^/]+)\/verify$/);
        if (method === 'POST' && purchaseVerifyMatch) {
          const purchaseId = decodeURIComponent(purchaseVerifyMatch[1]);
          const body = await readJsonBody(req);
          const actionStatus = body.status === 'failed' ? 'failed' : 'verified';

          const updated = await db.runTransaction((draft) => {
            const purchase = draft.purchases.find(p => p.id === purchaseId);
            if (!purchase) throw createAppError('Purchase not found.', 404, 'PURCHASE_NOT_FOUND');

            const nowIso = new Date().toISOString();
            const enrollment = draft.enrollments.find(e => e.purchaseId === purchase.id);

            if (actionStatus === 'failed') {
              purchase.paymentStatus = 'failed';
              if (enrollment) {
                enrollment.paymentStatus = 'failed';
                enrollment.status = 'cancelled';
                enrollment.updatedAt = nowIso;
              }
              const redemption = draft.couponRedemptions.find(r => r.purchaseId === purchase.id);
              if (redemption) {
                redemption.status = 'released';
                const coupon = draft.coupons.find(c => c.id === redemption.couponId);
                if (coupon) {
                  coupon.redemptionCount = draft.couponRedemptions.filter(
                    r => r.couponId === coupon.id && r.status !== 'released'
                  ).length;
                }
              }
            } else {
              purchase.paymentStatus = purchase.finalAmount === 0 ? 'free_enrollment' : 'verified';
              if (body.transactionRef) purchase.transactionRef = String(body.transactionRef).trim();
              purchase.verifiedAt = nowIso;
              purchase.verifiedByAdminId = admin.id;

              if (enrollment) {
                enrollment.paymentStatus = purchase.paymentStatus;
                if (enrollment.status === 'payment_pending') {
                  enrollment.status = 'exam_date_pending';
                  enrollment.activatedAt = nowIso;
                }
                enrollment.updatedAt = nowIso;
              }
              const redemption = draft.couponRedemptions.find(r => r.purchaseId === purchase.id);
              if (redemption) redemption.status = 'redeemed';

              addNotification(draft, {
                userId: purchase.userId,
                type: 'payment_verified',
                title: `Enrollment Activated: ${purchase.courseTitle}`,
                message: `Admin verified your payment. Your course access is now active; exam date will be assigned shortly.`,
                enrollmentId: enrollment ? enrollment.id : null
              });
            }

            addAuditLog(draft, {
              actor: admin,
              action: actionStatus === 'failed' ? 'ADMIN_PURCHASE_REJECTED' : 'ADMIN_PURCHASE_VERIFIED',
              entityType: 'purchase',
              entityId: purchase.id,
              details: { status: purchase.paymentStatus, transactionRef: purchase.transactionRef },
              ipAddress
            });

            return {
              purchase,
              enrollment: enrollment ? enrichEnrollment(enrollment, purchase) : null
            };
          });
          return sendJson(res, 200, updated);
        }

        // ENROLLMENTS LIFECYCLE
        if (method === 'GET' && pathname === '/api/admin/enrollments') {
          const state = db.read();
          const status = parsedUrl.searchParams.get('status') || '';
          const courseId = parsedUrl.searchParams.get('courseId') || '';
          const q = (parsedUrl.searchParams.get('q') || '').trim().toLowerCase();

          let enrollments = state.enrollments.map(enr => {
            const student = state.users.find(u => u.id === enr.userId);
            const purchase = state.purchases.find(p => p.id === enr.purchaseId) || null;
            return {
              ...enrichEnrollment(enr, purchase),
              studentName: student ? student.name : 'Unknown Student',
              studentEmail: student ? student.email : '',
              studentPhone: student ? student.phone : '',
              studentRegNumber: student ? student.regNumber : ''
            };
          });

          if (status) enrollments = enrollments.filter(e => e.status === status);
          if (courseId) enrollments = enrollments.filter(e => e.courseId === courseId);
          if (q) {
            enrollments = enrollments.filter(e =>
              e.studentName.toLowerCase().includes(q) ||
              e.studentEmail.toLowerCase().includes(q) ||
              e.courseTitle.toLowerCase().includes(q) ||
              e.id.toLowerCase().includes(q) ||
              (e.purchase && e.purchase.couponCode && e.purchase.couponCode.toLowerCase().includes(q))
            );
          }

          return sendJson(res, 200, { enrollments });
        }

        const enrActivateMatch = pathname.match(/^\/api\/admin\/enrollments\/([^/]+)\/activate$/);
        if (method === 'POST' && enrActivateMatch) {
          const enrollmentId = decodeURIComponent(enrActivateMatch[1]);
          const result = await db.runTransaction((draft) => {
            const enr = draft.enrollments.find(e => e.id === enrollmentId);
            if (!enr) throw createAppError('Enrollment not found.', 404, 'ENROLLMENT_NOT_FOUND');
            const nowIso = new Date().toISOString();
            enr.status = enr.examDate ? 'scheduled' : 'exam_date_pending';
            if (enr.paymentStatus === 'pending') enr.paymentStatus = 'verified';
            enr.activatedAt = enr.activatedAt || nowIso;
            enr.updatedAt = nowIso;
            const purchase = draft.purchases.find(p => p.id === enr.purchaseId);
            if (purchase && purchase.paymentStatus === 'pending') {
              purchase.paymentStatus = 'verified';
              purchase.verifiedAt = nowIso;
              purchase.verifiedByAdminId = admin.id;
            }
            addNotification(draft, {
              userId: enr.userId,
              type: 'enrollment_activated',
              title: `Course Activated: ${enr.courseTitle}`,
              message: `Your enrollment (Attempt #${enr.attemptNumber}) has been activated by the institute admin.`,
              enrollmentId: enr.id
            });
            addAuditLog(draft, {
              actor: admin,
              action: 'ADMIN_ENROLLMENT_ACTIVATED',
              entityType: 'enrollment',
              entityId: enr.id,
              ipAddress
            });
            return enrichEnrollment(enr, purchase);
          });
          return sendJson(res, 200, { enrollment: result });
        }

        const enrScheduleMatch = pathname.match(/^\/api\/admin\/enrollments\/([^/]+)\/schedule-exam$/);
        if (method === 'POST' && enrScheduleMatch) {
          const enrollmentId = decodeURIComponent(enrScheduleMatch[1]);
          const body = await readJsonBody(req);
          const examDate = String(body.examDate || '').trim();
          if (!examDate) {
            throw createAppError('Exam date is required (YYYY-MM-DD or readable schedule date).', 400, 'INVALID_EXAM_DATE');
          }

          const result = await db.runTransaction((draft) => {
            const enr = draft.enrollments.find(e => e.id === enrollmentId);
            if (!enr) throw createAppError('Enrollment not found.', 404, 'ENROLLMENT_NOT_FOUND');
            if (enr.status === 'cancelled') {
              throw createAppError('Cannot schedule an exam for a cancelled enrollment.', 400, 'ENROLLMENT_CANCELLED');
            }
            const wasScheduled = Boolean(enr.examDate);
            const nowIso = new Date().toISOString();
            enr.examDate = examDate;
            enr.examSlot = String(body.examSlot || '10:00 AM Batch').trim();
            enr.examCenter = String(body.examCenter || enr.examCenter || 'Sri Kalaimagal Typewriting Institute').trim();
            enr.examRemarks = body.examRemarks ? String(body.examRemarks).trim() : enr.examRemarks;
            if (enr.status !== 'completed' && enr.status !== 'rebooking_eligible') {
              enr.status = 'scheduled';
            }
            enr.updatedAt = nowIso;

            addNotification(draft, {
              userId: enr.userId,
              type: wasScheduled ? 'exam_rescheduled' : 'exam_scheduled',
              title: `${wasScheduled ? 'Exam Rescheduled' : 'Exam Date Assigned'}: ${enr.courseTitle}`,
              message: `Your exam (Attempt #${enr.attemptNumber}) is scheduled for ${enr.examDate} (${enr.examSlot}) at ${enr.examCenter}.`,
              enrollmentId: enr.id
            });
            addAuditLog(draft, {
              actor: admin,
              action: wasScheduled ? 'ADMIN_EXAM_RESCHEDULED' : 'ADMIN_EXAM_SCHEDULED',
              entityType: 'enrollment',
              entityId: enr.id,
              details: { examDate: enr.examDate, examSlot: enr.examSlot, examCenter: enr.examCenter },
              ipAddress
            });
            const purchase = draft.purchases.find(p => p.id === enr.purchaseId) || null;
            return enrichEnrollment(enr, purchase);
          });
          return sendJson(res, 200, { enrollment: result });
        }

        const enrCompleteMatch = pathname.match(/^\/api\/admin\/enrollments\/([^/]+)\/complete-exam$/);
        if (method === 'POST' && enrCompleteMatch) {
          const enrollmentId = decodeURIComponent(enrCompleteMatch[1]);
          const body = await readJsonBody(req);

          const result = await db.runTransaction((draft) => {
            const enr = draft.enrollments.find(e => e.id === enrollmentId);
            if (!enr) throw createAppError('Enrollment not found.', 404, 'ENROLLMENT_NOT_FOUND');
            const nowIso = new Date().toISOString();
            const enableRebooking = Boolean(body.enableRebooking);
            enr.status = enableRebooking ? 'rebooking_eligible' : 'completed';
            enr.rebookingAllowed = enableRebooking;
            enr.completedAt = enr.completedAt || nowIso;
            enr.scoreSummary = body.scoreSummary ? String(body.scoreSummary).trim() : (enr.scoreSummary || 'Completed');
            enr.examRemarks = body.examRemarks ? String(body.examRemarks).trim() : enr.examRemarks;
            enr.updatedAt = nowIso;

            addNotification(draft, {
              userId: enr.userId,
              type: 'exam_completed',
              title: `Examination Completed: ${enr.courseTitle}`,
              message: `Attempt #${enr.attemptNumber} has been marked completed (${enr.scoreSummary}).${enableRebooking ? ' Rebooking is now enabled if you wish to take another attempt.' : ''}`,
              enrollmentId: enr.id
            });
            addAuditLog(draft, {
              actor: admin,
              action: 'ADMIN_EXAM_COMPLETED',
              entityType: 'enrollment',
              entityId: enr.id,
              details: { scoreSummary: enr.scoreSummary, enableRebooking },
              ipAddress
            });
            const purchase = draft.purchases.find(p => p.id === enr.purchaseId) || null;
            return enrichEnrollment(enr, purchase);
          });
          return sendJson(res, 200, { enrollment: result });
        }

        const enrRebookMatch = pathname.match(/^\/api\/admin\/enrollments\/([^/]+)\/enable-rebooking$/);
        if (method === 'POST' && enrRebookMatch) {
          const enrollmentId = decodeURIComponent(enrRebookMatch[1]);
          const result = await db.runTransaction((draft) => {
            const enr = draft.enrollments.find(e => e.id === enrollmentId);
            if (!enr) throw createAppError('Enrollment not found.', 404, 'ENROLLMENT_NOT_FOUND');
            if (enr.status !== 'completed' && enr.status !== 'rebooking_eligible') {
              throw createAppError('Only a completed examination attempt can be unlocked for rebooking.', 400, 'NOT_COMPLETED_YET');
            }
            const nowIso = new Date().toISOString();
            enr.status = 'rebooking_eligible';
            enr.rebookingAllowed = true;
            enr.updatedAt = nowIso;

            addNotification(draft, {
              userId: enr.userId,
              type: 'rebooking_enabled',
              title: `Rebooking Enabled: ${enr.courseTitle}`,
              message: `You are now eligible to enroll for Attempt #${enr.attemptNumber + 1} of ${enr.courseTitle}.`,
              enrollmentId: enr.id
            });
            addAuditLog(draft, {
              actor: admin,
              action: 'ADMIN_REBOOKING_ENABLED',
              entityType: 'enrollment',
              entityId: enr.id,
              ipAddress
            });
            const purchase = draft.purchases.find(p => p.id === enr.purchaseId) || null;
            return enrichEnrollment(enr, purchase);
          });
          return sendJson(res, 200, { enrollment: result });
        }

        // COUPONS MANAGEMENT
        if (method === 'GET' && pathname === '/api/admin/coupons') {
          const state = db.read();
          const coupons = state.coupons.map(c => {
            const activeRedemptions = state.couponRedemptions.filter(
              r => r.couponId === c.id && r.status !== 'released'
            );
            return {
              ...c,
              redemptionCount: activeRedemptions.length,
              remainingRedemptions: c.maxRedemptions === null || c.maxRedemptions === undefined
                ? null
                : Math.max(0, Number(c.maxRedemptions) - activeRedemptions.length)
            };
          });
          return sendJson(res, 200, { coupons });
        }

        if (method === 'POST' && pathname === '/api/admin/coupons') {
          const body = await readJsonBody(req);
          const code = String(body.code || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
          const discountType = String(body.discountType || 'percentage');
          let discountValue = Number(body.discountValue ?? 0);

          if (!code || code.length < 3) {
            throw createAppError('Coupon code must be at least 3 alphanumeric characters.', 400, 'INVALID_COUPON_CODE');
          }
          if (!['percentage', 'fixed', 'free_100'].includes(discountType)) {
            throw createAppError('Discount type must be percentage, fixed, or free_100.', 400, 'INVALID_DISCOUNT_TYPE');
          }
          if (discountType === 'free_100') {
            discountValue = 100;
          } else if (discountType === 'percentage') {
            if (isNaN(discountValue) || discountValue <= 0 || discountValue > 100) {
              throw createAppError('Percentage discount must be between 1 and 100.', 400, 'INVALID_PERCENTAGE');
            }
          } else if (discountType === 'fixed') {
            if (isNaN(discountValue) || discountValue <= 0) {
              throw createAppError('Fixed discount amount must be positive.', 400, 'INVALID_FIXED_DISCOUNT');
            }
          }

          const created = await db.runTransaction((draft) => {
            if (draft.coupons.find(c => c.code === code)) {
              throw createAppError(`Coupon "${code}" already exists.`, 409, 'COUPON_EXISTS');
            }
            const nowIso = new Date().toISOString();
            const applicableCourseIds = Array.isArray(body.applicableCourseIds)
              ? body.applicableCourseIds.map(resolveCourseAlias).filter(Boolean)
              : [];

            const coupon = {
              id: generateId('cpn'),
              code,
              description: String(body.description || '').trim(),
              discountType,
              discountValue,
              applicableCourseIds,
              startsAt: body.startsAt || nowIso,
              expiresAt: body.expiresAt || null,
              maxRedemptions: (body.maxRedemptions === null || body.maxRedemptions === '' || body.maxRedemptions === undefined)
                ? null
                : Math.max(1, Number(body.maxRedemptions)),
              perStudentLimit: Math.max(1, Number(body.perStudentLimit || 1)),
              minPurchaseAmount: Math.max(0, roundInr(body.minPurchaseAmount || 0)),
              active: body.active !== false,
              redemptionCount: 0,
              createdByAdminId: admin.id,
              createdAt: nowIso,
              updatedAt: nowIso
            };
            draft.coupons.unshift(coupon);
            addAuditLog(draft, {
              actor: admin,
              action: 'ADMIN_COUPON_CREATED',
              entityType: 'coupon',
              entityId: coupon.id,
              details: {
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue,
                applicableCourseIds: coupon.applicableCourseIds,
                maxRedemptions: coupon.maxRedemptions
              },
              ipAddress
            });
            return coupon;
          });

          return sendJson(res, 201, { coupon: created });
        }

        const couponMatch = pathname.match(/^\/api\/admin\/coupons\/([^/]+)$/);
        if (method === 'PUT' && couponMatch) {
          const couponId = decodeURIComponent(couponMatch[1]);
          const body = await readJsonBody(req);
          const updated = await db.runTransaction((draft) => {
            const coupon = draft.coupons.find(c => c.id === couponId || c.code === couponId.toUpperCase());
            if (!coupon) throw createAppError('Coupon not found.', 404, 'COUPON_NOT_FOUND');
            if (body.description !== undefined) coupon.description = String(body.description).trim();
            if (body.active !== undefined) coupon.active = Boolean(body.active);
            if (body.expiresAt !== undefined) coupon.expiresAt = body.expiresAt || null;
            if (body.startsAt !== undefined) coupon.startsAt = body.startsAt || null;
            if (body.maxRedemptions !== undefined) {
              coupon.maxRedemptions = (body.maxRedemptions === null || body.maxRedemptions === '')
                ? null
                : Math.max(1, Number(body.maxRedemptions));
            }
            if (body.perStudentLimit !== undefined) coupon.perStudentLimit = Math.max(1, Number(body.perStudentLimit));
            if (body.minPurchaseAmount !== undefined) coupon.minPurchaseAmount = Math.max(0, roundInr(body.minPurchaseAmount));
            if (Array.isArray(body.applicableCourseIds)) {
              coupon.applicableCourseIds = body.applicableCourseIds.map(resolveCourseAlias).filter(Boolean);
            }
            coupon.updatedAt = new Date().toISOString();
            addAuditLog(draft, {
              actor: admin,
              action: 'ADMIN_COUPON_UPDATED',
              entityType: 'coupon',
              entityId: coupon.id,
              details: body,
              ipAddress
            });
            return coupon;
          });
          return sendJson(res, 200, { coupon: updated });
        }

        const couponRedeemMatch = pathname.match(/^\/api\/admin\/coupons\/([^/]+)\/redemptions$/);
        if (method === 'GET' && couponRedeemMatch) {
          const couponKey = decodeURIComponent(couponRedeemMatch[1]);
          const state = db.read();
          const coupon = state.coupons.find(c => c.id === couponKey || c.code === couponKey.toUpperCase());
          if (!coupon) throw createAppError('Coupon not found.', 404, 'COUPON_NOT_FOUND');
          const redemptions = state.couponRedemptions
            .filter(r => r.couponId === coupon.id)
            .map(r => {
              const student = state.users.find(u => u.id === r.userId);
              const course = state.courses.find(c => c.id === r.courseId);
              return {
                ...r,
                studentName: student ? student.name : 'Deleted Student',
                studentEmail: student ? student.email : '',
                courseTitle: course ? course.title : r.courseId
              };
            });
          return sendJson(res, 200, { coupon, redemptions });
        }

        // AUDIT LOGS
        if (method === 'GET' && pathname === '/api/admin/audit-logs') {
          const state = db.read();
          const limit = Math.min(200, Math.max(1, Number(parsedUrl.searchParams.get('limit') || 50)));
          return sendJson(res, 200, { logs: state.auditLogs.slice(0, limit) });
        }
      }

      return sendJson(res, 404, { error: 'Route not found.', code: 'NOT_FOUND' });
    } catch (err) {
      const status = err.statusCode || 500;
      if (status >= 500) {
        console.error('[API Error]', pathname, err);
      }
      return sendJson(res, status, {
        error: err.message || 'Internal server error.',
        code: err.code || 'INTERNAL_ERROR'
      });
    }
  }

  const server = http.createServer(handleRequest);

  return {
    server,
    db,
    config,
    start(portOverride) {
      const listenPort = portOverride !== undefined ? portOverride : config.port;
      const listenHost = options.host || process.env.HOST || '127.0.0.1';
      return new Promise((resolve) => {
        server.listen(listenPort, listenHost, () => {
          const addr = server.address();
          const publicHost = listenHost === '0.0.0.0' ? '127.0.0.1' : listenHost;
          resolve({ port: addr.port, baseUrl: `http://${publicHost}:${addr.port}` });
        });
      });
    },
    stop() {
      return new Promise((resolve) => server.close(() => resolve()));
    }
  };
}

if (require.main === module) {
  const srv = createServer();
  srv.start().then(({ port }) => {
    console.log(`Typing Thalaiva Backend & Admin Portal listening on http://127.0.0.1:${port}`);
    console.log(`Web Admin Portal: http://127.0.0.1:${port}/admin`);
  });
}

module.exports = { createServer };
