/**
 * Typing Thalaiva — Student Authentication, Course Catalog, Coupon Checkout,
 * Enrollments, Exam Schedule, Rebooking & Notifications Sync Client.
 * Note: Student-only client. Zero admin UI or credentials exist here.
 */
(function (global) {
  'use strict';

  const TOKEN_KEY = 'tt_student_jwt_v1';
  const PENDING_INTENT_KEY = 'tt_pending_checkout_v1';

  const FALLBACK_COURSES = [
    {
      id: 'combo_speed',
      code: 'COMBO-DOTE',
      title: 'Combo Speed Pass (Tamil + English)',
      description: 'Full access to 50+ Tamil & 50+ English DoTE Junior & Senior examination model papers.',
      language: 'both',
      level: 'combo',
      durationDays: 365,
      priceInr: 299,
      badge: 'MOST POPULAR',
      features: ['50+ Tamil Model Exam Papers', '50+ English Model Exam Papers', 'DoTE Junior & Senior Speed Grading']
    },
    {
      id: 'english_senior',
      code: 'ENG-SR-45',
      title: 'English Senior Typewriting',
      description: 'Complete DoTE English Senior (45 WPM) speed passages & exam prep.',
      language: 'en',
      level: 'senior',
      durationDays: 365,
      priceInr: 199,
      badge: '45 WPM SENIOR',
      features: ['50 Official English Senior Model Papers', '10-Minute DoTE Stroke Deduction Scoring']
    },
    {
      id: 'tamil_senior',
      code: 'TAM-SR-30',
      title: 'Tamil Senior Typewriting',
      description: 'Complete DoTE Tamil Senior (30 WPM) passages (Tamil99 & Typewriter).',
      language: 'ta',
      level: 'senior',
      durationDays: 365,
      priceInr: 199,
      badge: 'TAMIL SENIOR',
      features: ['50 Official Tamil Senior Model Papers', 'Tamil99 & Typewriter Support']
    },
    {
      id: 'english_junior',
      code: 'ENG-JR-30',
      title: 'English Junior Typewriting',
      description: 'DoTE English Junior (30 WPM) speed training & exam readiness.',
      language: 'en',
      level: 'junior',
      durationDays: 365,
      priceInr: 149,
      badge: '30 WPM JUNIOR',
      features: ['30 WPM Junior Speed Training Passages', 'Keyboard Row & Accuracy Drills']
    },
    {
      id: 'tamil_junior',
      code: 'TAM-JR-25',
      title: 'Tamil Junior Typewriting',
      description: 'DoTE Tamil Junior (25 WPM) foundational-to-exam preparation.',
      language: 'ta',
      level: 'junior',
      durationDays: 365,
      priceInr: 149,
      badge: 'TAMIL JUNIOR',
      features: ['25 WPM Tamil Junior Passages', 'Uyir, Mei & Uyirmei Drills']
    },
    {
      id: 'coa_exam',
      code: 'COA-DOTE',
      title: 'COA (Computer on Office Automation)',
      description: 'Bilingual speed typing & practical documentation drill track for DoTE COA.',
      language: 'both',
      level: 'coa',
      durationDays: 365,
      priceInr: 249,
      badge: 'GOVT COA PREP',
      features: ['Bilingual English & Tamil Practice', 'All Arcade Drills & Analytics Unlocked']
    }
  ];

  function esc(val) {
    return String(val ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function isCapacitorWebViewOrigin(loc) {
    if (!loc) return false;
    const isNative = Boolean(
      global.Capacitor &&
      typeof global.Capacitor.isNativePlatform === 'function' &&
      global.Capacitor.isNativePlatform()
    );
    if (isNative) return true;
    const host = String(loc.hostname || '').toLowerCase();
    const port = String(loc.port || '');
    // Capacitor serves WebView assets on https://localhost, http://localhost (default ports), or capacitor://localhost
    if (String(loc.protocol || '').startsWith('capacitor:')) return true;
    if ((host === 'localhost' || host === '127.0.0.1') && (!port || port === '80' || port === '443')) {
      return true;
    }
    return false;
  }

  function getApiBase() {
    if (global.TYPING_API_BASE) {
      return String(global.TYPING_API_BASE).trim().replace(/\/$/, '');
    }
    try {
      const saved = global.localStorage && global.localStorage.getItem('tt_api_base');
      if (saved) return String(saved).trim().replace(/\/$/, '');
    } catch (_) {}
    if (global.location && global.location.origin && global.location.origin.startsWith('http') && !isCapacitorWebViewOrigin(global.location)) {
      return global.location.origin.replace(/\/$/, '');
    }
    return '';
  }

  function notifyToast(msg) {
    if (typeof global.toast === 'function') global.toast(msg);
  }

  const StudentPortal = {
    token: null,
    courses: FALLBACK_COURSES.slice(),
    dashboard: null,
    checkoutState: null,
    pendingIntent: null,
    isSubmittingCheckout: false,
    pollTimer: null,

    init() {
      try {
        this.token = global.localStorage ? global.localStorage.getItem(TOKEN_KEY) : null;
        const rawIntent = global.localStorage ? global.localStorage.getItem(PENDING_INTENT_KEY) : null;
        if (rawIntent) this.pendingIntent = JSON.parse(rawIntent);
      } catch (_) {}

      this.loadPublicConfig().catch(() => {});
      this.fetchCourses().catch(() => {});
      if (this.token && getApiBase()) {
        this.syncDashboard({ silent: true }).catch(() => {});
      }
      this.renderInlineCards();
    },

    getApiBase() {
      return getApiBase();
    },

    setApiBase(url) {
      const clean = String(url || '').trim().replace(/\/$/, '');
      if (clean && !/^https?:\/\/.+/.test(clean)) {
        this.showAuthError('Backend URL must start with https:// or http:// (do not use localhost on mobile).');
        return false;
      }
      global.TYPING_API_BASE = clean;
      try {
        if (global.localStorage) {
          if (clean) global.localStorage.setItem('tt_api_base', clean);
          else global.localStorage.removeItem('tt_api_base');
        }
      } catch (_) {}
      this.clearAuthError();
      this.loadPublicConfig().catch(() => {});
      this.fetchCourses().catch(() => {});
      return true;
    },

    async loadPublicConfig() {
      if (!getApiBase()) return null;
      try {
        const cfg = await this.api('/api/public-config', { method: 'GET' });
        this.publicConfig = cfg;
        if (cfg && cfg.firebaseWebConfig && global.FirebaseService && typeof global.FirebaseService.configure === 'function') {
          global.FirebaseService.configure(cfg.firebaseWebConfig);
        }
        return cfg;
      } catch (_) {
        return null;
      }
    },

    setToken(jwt) {
      this.token = jwt || null;
      try {
        if (global.localStorage) {
          if (jwt) global.localStorage.setItem(TOKEN_KEY, jwt);
          else global.localStorage.removeItem(TOKEN_KEY);
        }
      } catch (_) {}
    },

    setPendingIntent(intent) {
      this.pendingIntent = intent || null;
      try {
        if (global.localStorage) {
          if (intent) global.localStorage.setItem(PENDING_INTENT_KEY, JSON.stringify(intent));
          else global.localStorage.removeItem(PENDING_INTENT_KEY);
        }
      } catch (_) {}
    },

    async api(path, opts = {}) {
      const base = getApiBase();
      if (!base) {
        const err = new Error('Backend API URL is not configured for offline mode.');
        err.isOffline = true;
        throw err;
      }
      const headers = {
        'Content-Type': 'application/json',
        ...(opts.headers || {})
      };
      if (this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }
      let res;
      try {
        res = await fetch(`${base}${path}`, {
          ...opts,
          headers
        });
      } catch (netErr) {
        const err = new Error(`Cannot reach backend server (${base}). Verify your internet connection or Backend Server URL.`);
        err.isNetworkError = true;
        err.cause = netErr;
        throw err;
      }
      const data = await res.json().catch(() => ({}));
      if (res.status === 401 && data.code === 'SESSION_REVOKED') {
        this.setToken(null);
        this.dashboard = null;
        if (global.FirebaseService && typeof global.FirebaseService.handleRemoteRevocation === 'function') {
          global.FirebaseService.handleRemoteRevocation(true);
        }
        throw new Error(data.error || 'Session revoked on another device.');
      }
      if (!res.ok) {
        const err = new Error(data.error || `Request failed (${res.status})`);
        err.code = data.code;
        err.status = res.status;
        throw err;
      }
      return data;
    },

    syncFirebaseServiceState(user, entitlement, sessionId) {
      const fs = global.FirebaseService;
      if (!fs) return;
      if (user) {
        fs.isGuest = false;
        fs.currentUser = {
          uid: user.id || user.uid,
          name: user.name,
          email: user.email,
          provider: (user.authProviders && user.authProviders.includes('google')) ? 'google.com' : 'password'
        };
        if (sessionId) fs.activeSessionId = sessionId;
        if (entitlement) {
          fs.entitlement = {
            ...fs.entitlement,
            ...entitlement
          };
        }
        if (typeof fs.persistLocalSession === 'function') fs.persistLocalSession();
        if (typeof global.syncStudentProfileWithAuth === 'function') {
          global.syncStudentProfileWithAuth(fs.currentUser);
        }
      } else {
        if (typeof fs.setGuestState === 'function') fs.setGuestState();
      }
      if (typeof global.renderAccountAccessCard === 'function') global.renderAccountAccessCard();
      if (typeof global.renderUpgradeAuthSection === 'function') global.renderUpgradeAuthSection();
      if (typeof global.populatePassageDropdown === 'function') global.populatePassageDropdown();
    },

    async fetchCourses() {
      try {
        const data = await this.api('/api/courses', { method: 'GET' });
        if (Array.isArray(data.courses) && data.courses.length) {
          this.courses = data.courses;
        }
      } catch (_) {
        // Keep FALLBACK_COURSES when offline
      }
      this.renderInlineCards();
      return this.courses;
    },

    async syncDashboard({ silent = false } = {}) {
      if (!this.token) {
        this.dashboard = null;
        this.renderInlineCards();
        return null;
      }
      try {
        const data = await this.api('/api/student/dashboard', { method: 'GET' });
        this.dashboard = data;
        this.syncFirebaseServiceState(data.user, data.entitlement);
        this.renderInlineCards();
        this.renderCoursesModalContent();
        return data;
      } catch (err) {
        if (!silent) notifyToast('⚠️ ' + err.message);
        return null;
      }
    },

    async syncProgressResult(entry) {
      if (!this.token || !getApiBase() || !entry) return false;
      try {
        await this.api('/api/student/progress', {
          method: 'POST',
          body: JSON.stringify({ entry })
        });
        return true;
      } catch (_) {
        return false;
      }
    },

    async syncCloudProgress() {
      if (!this.token || !getApiBase()) return null;
      try {
        const res = await this.api('/api/student/progress', { method: 'GET' });
        const remote = Array.isArray(res.history) ? res.history : [];
        if (remote.length && global.storage && typeof global.storage.get === 'function') {
          const curRes = await global.storage.get('recent-results', false).catch(() => null);
          const curVal = (curRes && typeof curRes === 'object' && curRes.value !== undefined) ? curRes.value : curRes;
          const localList = curVal ? (typeof curVal === 'string' ? JSON.parse(curVal) : curVal) : [];
          const seen = new Set(localList.map(r => `${r.timestamp || ''}|${r.passage || ''}`));
          let merged = [...localList];
          for (const item of remote) {
            const key = `${item.timestamp || ''}|${item.passage || ''}`;
            if (!seen.has(key)) {
              seen.add(key);
              merged.push(item);
            }
          }
          merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
          merged = merged.slice(0, 100);
          await global.storage.set('recent-results', JSON.stringify(merged), false).catch(() => {});
          if (typeof global.loadRecentResults === 'function') global.loadRecentResults();
        }
        return remote;
      } catch (_) {
        return null;
      }
    },

    isAuthenticated() {
      if (this.token && this.dashboard && this.dashboard.user) return true;
      return Boolean(global.FirebaseService && !global.FirebaseService.isGuest && global.FirebaseService.currentUser);
    },

    // =========================================================================
    // AUTHENTICATION UI & FLOWS (Login / Register / Google / Forgot Password)
    // =========================================================================
    openAuthModal(mode = 'login', intent = null) {
      if (intent) this.setPendingIntent(intent);
      const modal = document.getElementById('studentAuthModal');
      if (!modal) return;
      this.switchAuthTab(mode);
      const intentBanner = document.getElementById('stuAuthIntentBanner');
      if (intentBanner) {
        if (this.pendingIntent && this.pendingIntent.courseId) {
          const crs = this.courses.find(c => c.id === this.pendingIntent.courseId);
          intentBanner.style.display = 'block';
          intentBanner.innerHTML = `🔒 Sign in to continue enrolling in <b>${esc(crs ? crs.title : this.pendingIntent.courseId)}</b>${this.pendingIntent.couponCode ? ` with coupon <b>${esc(this.pendingIntent.couponCode)}</b>` : ''}. Your selection is saved.`;
        } else {
          intentBanner.style.display = 'none';
        }
      }
      this.clearAuthError();
      const apiInput = document.getElementById('stuApiBaseInput');
      if (apiInput) apiInput.value = getApiBase();
      modal.style.display = 'flex';
    },

    closeAuthModal() {
      const modal = document.getElementById('studentAuthModal');
      if (modal) modal.style.display = 'none';
    },

    switchAuthTab(tab) {
      ['login', 'register', 'forgot'].forEach(t => {
        const pane = document.getElementById(`stuAuthPane_${t}`);
        const btn = document.getElementById(`stuAuthTab_${t}`);
        if (pane) pane.style.display = (t === tab) ? 'block' : 'none';
        if (btn) btn.classList.toggle('active', t === tab);
      });
      this.clearAuthError();
    },

    showAuthError(msg) {
      const box = document.getElementById('stuAuthAlert');
      if (!box) return;
      box.textContent = msg;
      box.style.display = 'block';
    },

    clearAuthError() {
      const box = document.getElementById('stuAuthAlert');
      if (box) box.style.display = 'none';
    },

    async completeAuthAndResume(res) {
      this.setToken(res.token);
      this.syncFirebaseServiceState(res.user, res.entitlement, res.sessionId);
      await this.syncDashboard({ silent: true });
      this.syncCloudProgress().catch(() => {});
      this.closeAuthModal();
      notifyToast(`✅ Signed in as ${res.user.name}`);

      if (this.pendingIntent && this.pendingIntent.courseId) {
        const intent = this.pendingIntent;
        this.setPendingIntent(null);
        await this.openCheckout(intent.courseId, {
          couponCode: intent.couponCode || '',
          attemptType: intent.attemptType || 'initial'
        });
      }
    },

    async submitLogin(e) {
      if (e) e.preventDefault();
      this.clearAuthError();
      const email = document.getElementById('stuLoginEmail')?.value.trim();
      const password = document.getElementById('stuLoginPassword')?.value;
      try {
        if (global.FirebaseService && global.FirebaseService.isFirebaseAppReady() && global.firebase && global.firebase.auth) {
          try {
            const fbCred = await global.firebase.auth().signInWithEmailAndPassword(email, password);
            if (fbCred && fbCred.user) {
              const idToken = await fbCred.user.getIdToken(true);
              const res = await this.api('/api/auth/firebase', {
                method: 'POST',
                body: JSON.stringify({ idToken })
              });
              await this.completeAuthAndResume(res);
              return;
            }
          } catch (fbErr) {
            if (!fbErr || (fbErr.code !== 'auth/user-not-found' && fbErr.code !== 'auth/invalid-credential')) {
              throw fbErr;
            }
          }
        }
        const res = await this.api('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password })
        });
        await this.completeAuthAndResume(res);
      } catch (err) {
        this.showAuthError(err.message);
      }
    },

    async submitRegister(e) {
      if (e) e.preventDefault();
      this.clearAuthError();
      const payload = {
        name: document.getElementById('stuRegName')?.value.trim(),
        email: document.getElementById('stuRegEmail')?.value.trim(),
        password: document.getElementById('stuRegPassword')?.value,
        phone: document.getElementById('stuRegPhone')?.value.trim(),
        regNumber: document.getElementById('stuRegNo')?.value.trim(),
        institute: document.getElementById('stuRegInstitute')?.value.trim()
      };
      try {
        if (global.FirebaseService && global.FirebaseService.isFirebaseAppReady() && global.firebase && global.firebase.auth) {
          const fbCred = await global.firebase.auth().createUserWithEmailAndPassword(payload.email, payload.password);
          if (fbCred && fbCred.user) {
            await fbCred.user.updateProfile({ displayName: payload.name }).catch(() => {});
            const idToken = await fbCred.user.getIdToken(true);
            const res = await this.api('/api/auth/firebase', {
              method: 'POST',
              body: JSON.stringify({
                idToken,
                name: payload.name,
                phone: payload.phone,
                regNumber: payload.regNumber,
                institute: payload.institute
              })
            });
            await this.completeAuthAndResume(res);
            return;
          }
        }
        const res = await this.api('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        await this.completeAuthAndResume(res);
      } catch (err) {
        this.showAuthError(err.message);
      }
    },

    async handleGoogleAuth(idTokenOverride = null) {
      this.clearAuthError();
      try {
        if (idTokenOverride) {
          const res = await this.api('/api/auth/google', {
            method: 'POST',
            body: JSON.stringify({ idToken: idTokenOverride })
          });
          await this.completeAuthAndResume(res);
          return res;
        }
        if (!getApiBase()) {
          throw new Error('Backend API URL is not configured yet. Connect your deployed backend server first.');
        }
        await this.loadPublicConfig();
        if (!global.FirebaseService || typeof global.FirebaseService.signInWithGoogle !== 'function') {
          throw new Error('Authentication service is not ready.');
        }
        const gRes = await global.FirebaseService.signInWithGoogle();
        if (!gRes || !gRes.idToken) {
          throw new Error('Verified Google/Firebase ID token was not returned.');
        }
        const res = await this.api('/api/auth/firebase', {
          method: 'POST',
          body: JSON.stringify({ idToken: gRes.idToken })
        });
        await this.completeAuthAndResume(res);
        return res;
      } catch (err) {
        this.showAuthError(err.message || 'Google Sign-In could not be completed.');
        throw err;
      }
    },

    async submitForgotPassword(e) {
      if (e) e.preventDefault();
      this.clearAuthError();
      const email = document.getElementById('stuForgotEmail')?.value.trim();
      try {
        if (global.FirebaseService && global.FirebaseService.isFirebaseAppReady() && global.firebase && global.firebase.auth) {
          await global.firebase.auth().sendPasswordResetEmail(email);
          const msgBox = document.getElementById('stuForgotStatus');
          if (msgBox) {
            msgBox.style.display = 'block';
            msgBox.textContent = 'Password reset email sent via Firebase Authentication. Check your inbox.';
          }
          return;
        }
        const res = await this.api('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email })
        });
        const msgBox = document.getElementById('stuForgotStatus');
        if (msgBox) {
          msgBox.style.display = 'block';
          msgBox.textContent = res.message || 'Reset instructions sent if account exists.';
        }
        const resetForm = document.getElementById('stuResetTokenGroup');
        if (resetForm) resetForm.style.display = 'block';
      } catch (err) {
        this.showAuthError(err.message);
      }
    },

    async submitResetPassword() {
      this.clearAuthError();
      const token = document.getElementById('stuResetToken')?.value.trim();
      const newPassword = document.getElementById('stuResetNewPassword')?.value;
      try {
        await this.api('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ token, newPassword })
        });
        notifyToast('✅ Password reset successful. Please sign in.');
        this.switchAuthTab('login');
      } catch (err) {
        this.showAuthError(err.message);
      }
    },

    async logout() {
      try {
        if (this.token && getApiBase()) {
          await this.api('/api/auth/logout', { method: 'POST', body: '{}' });
        }
      } catch (_) {}
      this.setToken(null);
      this.dashboard = null;
      this.setPendingIntent(null);
      this.syncFirebaseServiceState(null, null);
      this.renderInlineCards();
      this.renderCoursesModalContent();
      notifyToast('Signed out cleanly.');
    },

    // =========================================================================
    // COURSE CATALOG, COUPON CHECKOUT & ENROLLMENT
    // =========================================================================
    openCoursesHub(tab = 'catalog') {
      const modal = document.getElementById('studentCoursesModal');
      if (!modal) return;
      modal.style.display = 'flex';
      this.switchCoursesHubTab(tab);
      this.fetchCourses().catch(() => {});
      if (this.token) this.syncDashboard({ silent: true });
    },

    closeCoursesHub() {
      const modal = document.getElementById('studentCoursesModal');
      if (modal) modal.style.display = 'none';
    },

    switchCoursesHubTab(tab) {
      this.activeHubTab = tab;
      ['catalog', 'enrollments', 'history', 'notifications'].forEach(t => {
        const btn = document.getElementById(`stuHubTab_${t}`);
        if (btn) btn.classList.toggle('active', t === tab);
      });
      this.renderCoursesModalContent();
    },

    async openCheckout(courseId, { couponCode = '', attemptType = 'initial' } = {}) {
      // Preserve intent if user is not signed in yet!
      if (!this.isAuthenticated()) {
        this.openAuthModal('login', { courseId, couponCode, attemptType });
        return;
      }

      const course = this.courses.find(c => c.id === courseId) || FALLBACK_COURSES[0];
      this.checkoutState = {
        courseId: course.id,
        course,
        couponCode: couponCode || '',
        attemptType,
        quote: {
          course,
          couponApplied: false,
          couponCode: null,
          originalPrice: course.priceInr,
          discountAmount: 0,
          finalPrice: course.priceInr,
          isFreeEnrollment: course.priceInr === 0,
          breakdownLabel: 'Standard Course Fee'
        },
        couponError: '',
        pendingPaymentOrder: null,
        idempotencyKey: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
      };

      const modal = document.getElementById('courseCheckoutModal');
      if (modal) modal.style.display = 'flex';
      this.renderCheckoutModal();

      if (couponCode) {
        await this.applyCouponCode(couponCode);
      } else if (getApiBase()) {
        await this.refreshQuote();
      }
    },

    closeCheckoutModal() {
      const modal = document.getElementById('courseCheckoutModal');
      if (modal) modal.style.display = 'none';
      this.isSubmittingCheckout = false;
    },

    async refreshQuote() {
      if (!this.checkoutState) return;
      try {
        const q = await this.api('/api/checkout/quote', {
          method: 'POST',
          body: JSON.stringify({
            courseId: this.checkoutState.courseId,
            couponCode: this.checkoutState.couponCode
          })
        });
        this.checkoutState.quote = q;
        this.checkoutState.couponError = '';
      } catch (err) {
        if (this.checkoutState.couponCode) {
          this.checkoutState.couponError = err.message;
          this.checkoutState.couponCode = '';
          // Re-fetch base course quote cleanly
          const crs = this.checkoutState.course;
          this.checkoutState.quote = {
            course: crs,
            couponApplied: false,
            couponCode: null,
            originalPrice: crs.priceInr,
            discountAmount: 0,
            finalPrice: crs.priceInr,
            isFreeEnrollment: crs.priceInr === 0,
            breakdownLabel: 'Standard Course Fee'
          };
        }
      }
      this.renderCheckoutModal();
    },

    async applyCouponCode(codeOverride = null) {
      if (!this.checkoutState) return;
      const input = document.getElementById('chkCouponInput');
      const code = (codeOverride !== null ? codeOverride : (input ? input.value : '')).trim().toUpperCase();
      if (!code) {
        this.checkoutState.couponError = 'Enter a coupon code to apply.';
        this.renderCheckoutModal();
        return;
      }
      this.checkoutState.couponCode = code;
      await this.refreshQuote();
    },

    async removeCouponCode() {
      if (!this.checkoutState) return;
      this.checkoutState.couponCode = '';
      this.checkoutState.couponError = '';
      const input = document.getElementById('chkCouponInput');
      if (input) input.value = '';
      await this.refreshQuote();
    },

    async completeCheckout() {
      if (!this.checkoutState || this.isSubmittingCheckout) return;
      this.isSubmittingCheckout = true;
      this.renderCheckoutModal();

      try {
        const res = await this.api('/api/checkout/complete', {
          method: 'POST',
          headers: { 'X-Idempotency-Key': this.checkoutState.idempotencyKey },
          body: JSON.stringify({
            courseId: this.checkoutState.courseId,
            couponCode: this.checkoutState.quote.couponApplied ? this.checkoutState.quote.couponCode : '',
            attemptType: this.checkoutState.attemptType,
            paymentMethod: 'razorpay',
            idempotencyKey: this.checkoutState.idempotencyKey
          })
        });

        if (res.nextStep === 'enrolled_free') {
          this.syncFirebaseServiceState(this.dashboard ? this.dashboard.user : global.FirebaseService?.currentUser, res.entitlement);
          await this.syncDashboard({ silent: true });
          this.closeCheckoutModal();
          notifyToast('🎉 Free Enrollment Confirmed (₹0)! Course Unlocked.');
          this.openCoursesHub('enrollments');
        } else {
          this.checkoutState.pendingPaymentOrder = res.paymentOrder;
          this.checkoutState.pendingPurchase = res.purchase;
          this.renderCheckoutModal();
          notifyToast('Order created. Complete payment verification to unlock course.');
        }
      } catch (err) {
        this.checkoutState.couponError = err.message;
        notifyToast('⚠️ ' + err.message);
      } finally {
        this.isSubmittingCheckout = false;
        this.renderCheckoutModal();
      }
    },

    renderCheckoutModal() {
      const body = document.getElementById('courseCheckoutBody');
      if (!body || !this.checkoutState) return;
      const { course, quote, couponError, pendingPaymentOrder } = this.checkoutState;

      if (pendingPaymentOrder) {
        body.innerHTML = `
          <div style="background:var(--bg-main);border:1px solid var(--card-border);border-radius:14px;padding:14px;margin-bottom:12px;">
            <div style="font-size:12px;font-weight:800;color:var(--primary);text-transform:uppercase;">Payment Gateway Pending Verification</div>
            <h4 style="margin:6px 0;font-size:15px;font-weight:900;color:var(--ink);">${esc(course.title)}</h4>
            <div style="font-size:12px;color:var(--muted);">Order ID: <b>${esc(pendingPaymentOrder.orderId)}</b></div>
            <div style="font-size:18px;font-weight:900;color:var(--ink);margin-top:8px;">Payable: ₹${esc(pendingPaymentOrder.amount)}</div>
          </div>
          <div style="font-size:12px;color:var(--muted);line-height:1.5;margin-bottom:12px;">
            Your enrollment order has been safely recorded with <b>Payment Pending</b> status. Once payment is verified via payment gateway webhook or approved by the Institute Admin, your course will unlock automatically.
          </div>
          <button type="button" class="solidbtn" style="width:100%;" onclick="StudentPortal.closeCheckoutModal(); StudentPortal.openCoursesHub('enrollments');">
            📋 View Status in My Enrollments
          </button>
        `;
        return;
      }

      body.innerHTML = `
        <div style="background:var(--bg-main);border:1px solid var(--card-border);border-radius:14px;padding:14px;margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
            <div>
              <span style="font-size:10px;font-weight:800;padding:2px 8px;border-radius:9999px;background:var(--primary-light);color:var(--primary);">${esc(course.badge || course.code)}</span>
              <h4 style="margin:6px 0 4px;font-size:15px;font-weight:900;color:var(--ink);">${esc(course.title)}</h4>
              <div style="font-size:11.5px;color:var(--muted);">${esc(course.description || '')}</div>
            </div>
            <div style="font-size:18px;font-weight:900;color:var(--ink);white-space:nowrap;">₹${esc(quote.originalPrice)}</div>
          </div>
          ${this.checkoutState.attemptType === 'rebooking' ? `<div style="margin-top:8px;font-size:11.5px;font-weight:800;color:#7c3aed;">🔁 Rebooking New Examination Attempt</div>` : ''}
        </div>

        <div style="margin-bottom:14px;">
          <div style="font-size:12px;font-weight:800;color:var(--ink);margin-bottom:6px;">Have a Coupon Code?</div>
          <div style="display:flex;gap:8px;">
            <input id="chkCouponInput" type="text" value="${esc(this.checkoutState.couponCode || '')}" placeholder="e.g. WELCOME100 or TYPE25"
              style="flex:1;padding:10px 12px;border:1.5px solid var(--card-border);border-radius:10px;font-size:13px;font-weight:700;text-transform:uppercase;background:var(--card-bg);color:var(--ink);" />
            ${quote.couponApplied
              ? `<button type="button" class="ghostbtn" onclick="StudentPortal.removeCouponCode()">Remove</button>`
              : `<button type="button" class="solidbtn" onclick="StudentPortal.applyCouponCode()">Apply</button>`}
          </div>
          ${couponError ? `<div id="chkCouponError" style="margin-top:6px;font-size:11.5px;font-weight:700;color:#dc2626;">⚠️ ${esc(couponError)}</div>` : ''}
          ${quote.couponApplied ? `<div id="chkCouponSuccess" style="margin-top:6px;font-size:11.5px;font-weight:700;color:#059669;">✅ Coupon <b>${esc(quote.couponCode)}</b> applied: ${esc(quote.breakdownLabel)}</div>` : ''}
        </div>

        <div style="background:var(--bg-main);border:1px dashed var(--card-border);border-radius:12px;padding:12px;margin-bottom:14px;font-size:12.5px;">
          <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
            <span style="color:var(--muted);">Course Fee</span>
            <b>₹${esc(quote.originalPrice)}</b>
          </div>
          <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
            <span style="color:var(--muted);">Coupon Discount ${quote.couponCode ? `(${esc(quote.couponCode)})` : ''}</span>
            <b style="color:${quote.discountAmount > 0 ? '#059669' : 'var(--muted)'};">- ₹${esc(quote.discountAmount)}</b>
          </div>
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid var(--card-border);font-size:15px;font-weight:900;color:var(--ink);">
            <span>Final Payable Amount</span>
            <span style="color:${quote.isFreeEnrollment ? '#059669' : 'var(--primary)'};">₹${esc(quote.finalPrice)} ${quote.isFreeEnrollment ? '(FREE)' : ''}</span>
          </div>
        </div>

        <button type="button" id="btnCompleteCheckout" class="solidbtn" ${this.isSubmittingCheckout ? 'disabled' : ''}
          style="width:100%;padding:13px;font-size:14px;font-weight:900;border-radius:12px;background:${quote.isFreeEnrollment ? 'linear-gradient(135deg,#059669,#10b981)' : 'linear-gradient(135deg,var(--primary),#4f46e5)'};"
          onclick="StudentPortal.completeCheckout()">
          ${this.isSubmittingCheckout
            ? 'Processing...'
            : quote.isFreeEnrollment
              ? '🎉 Complete Free Enrollment (₹0)'
              : `💳 Proceed to Pay ₹${esc(quote.finalPrice)}`}
        </button>
      `;
    },

    // =========================================================================
    // RENDER STUDENT HUB MODAL & INLINE PROFILE / ACADEMY CARDS
    // =========================================================================
    statusBadgeHtml(status) {
      const map = {
        free_enrollment: ['Free Enrollment', '#7c3aed', 'rgba(124,58,237,0.12)'],
        payment_verified: ['Verified', '#059669', 'rgba(5,150,105,0.12)'],
        payment_pending: ['Payment Pending', '#d97706', 'rgba(217,119,6,0.12)'],
        exam_date_pending: ['Exam Date Pending', '#d97706', 'rgba(217,119,6,0.12)'],
        scheduled: ['Exam Scheduled', '#2563eb', 'rgba(37,99,235,0.12)'],
        completed: ['Completed', '#059669', 'rgba(5,150,105,0.12)'],
        rebooking_eligible: ['Rebooking Eligible', '#7c3aed', 'rgba(124,58,237,0.12)'],
        cancelled: ['Cancelled', '#dc2626', 'rgba(220,38,38,0.12)']
      };
      const [label, color, bg] = map[status] || [status || 'Active', '#475569', 'rgba(100,116,139,0.15)'];
      return `<span style="font-size:10px;font-weight:800;padding:3px 8px;border-radius:9999px;color:${color};background:${bg};white-space:nowrap;">${esc(label)}</span>`;
    },

    renderCoursesModalContent() {
      const container = document.getElementById('studentCoursesModalBody');
      if (!container) return;
      const tab = this.activeHubTab || 'catalog';
      const d = this.dashboard;

      if (tab === 'catalog') {
        const allEnr = d ? d.allEnrollments : [];
        container.innerHTML = this.courses.map(c => {
          const matching = allEnr.filter(e => e.courseId === c.id && e.status !== 'cancelled');
          const activeEnr = matching.find(e => !['completed', 'rebooking_eligible'].includes(e.status));
          const rebookEnr = matching.find(e => e.status === 'rebooking_eligible' || e.rebookingAllowed);
          let actionBtn = `<button type="button" class="solidbtn" style="padding:8px 14px;font-size:12px;" onclick="StudentPortal.openCheckout('${esc(c.id)}')">Enroll / Buy • ₹${esc(c.priceInr)}</button>`;
          if (activeEnr) {
            actionBtn = this.statusBadgeHtml(activeEnr.status);
          } else if (rebookEnr) {
            actionBtn = `<button type="button" class="solidbtn" style="padding:8px 14px;font-size:12px;background:#7c3aed;" onclick="StudentPortal.openCheckout('${esc(c.id)}',{attemptType:'rebooking'})">🔁 Rebook Attempt #${esc(rebookEnr.attemptNumber + 1)}</button>`;
          }
          return `
            <div style="background:var(--bg-main);border:1px solid var(--card-border);border-radius:14px;padding:14px;margin-bottom:10px;">
              <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;">
                <div>
                  <span style="font-size:9.5px;font-weight:800;background:var(--primary-light);color:var(--primary);padding:2px 8px;border-radius:9999px;">${esc(c.badge || c.code)}</span>
                  <h4 style="margin:6px 0 4px;font-size:14.5px;font-weight:900;color:var(--ink);">${esc(c.title)}</h4>
                  <p style="margin:0;font-size:11.5px;color:var(--muted);line-height:1.45;">${esc(c.description)}</p>
                </div>
                <div style="text-align:right;white-space:nowrap;">
                  <div style="font-size:17px;font-weight:900;color:var(--primary);">₹${esc(c.priceInr)}</div>
                  <div style="font-size:10px;color:var(--muted);">${esc(c.durationDays)} days</div>
                </div>
              </div>
              <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;padding-top:10px;border-top:1px dashed var(--card-border);">
                <span style="font-size:11px;color:var(--muted);font-weight:700;">🎟️ Coupon codes supported</span>
                ${actionBtn}
              </div>
            </div>
          `;
        }).join('');
        return;
      }

      if (!this.isAuthenticated() || !d) {
        container.innerHTML = `
          <div style="text-align:center;padding:24px 12px;">
            <div style="font-size:34px;margin-bottom:8px;">🎓</div>
            <h4 style="margin:0 0 6px;font-size:15px;font-weight:800;color:var(--ink);">Sign In to Sync Your Courses &amp; Exam Schedule</h4>
            <p style="font-size:12px;color:var(--muted);margin:0 0 14px;">View active enrollments, applied coupons, upcoming DoTE exam dates, completed attempts, and rebooking eligibility.</p>
            <button type="button" class="solidbtn" onclick="StudentPortal.openAuthModal('login')">🔐 Student Sign In / Register</button>
          </div>
        `;
        return;
      }

      if (tab === 'enrollments') {
        const list = d.allEnrollments.filter(e => !['completed'].includes(e.status));
        if (!list.length) {
          container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:12.5px;">You have no active course enrollments yet. Browse the Course Catalog or apply a coupon to enroll!</div>`;
          return;
        }
        container.innerHTML = list.map(e => `
          <div style="background:var(--bg-main);border:1px solid var(--card-border);border-radius:14px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:6px;">
              <b style="font-size:14px;color:var(--ink);">${esc(e.courseTitle)}</b>
              ${this.statusBadgeHtml(e.status)}
            </div>
            <div style="font-size:11.5px;color:var(--muted);margin-bottom:6px;">
              Attempt <b>#${esc(e.attemptNumber)}</b> • ID: <b>${esc(e.id)}</b>
              ${e.purchase && e.purchase.couponCode ? ` • Coupon: <b>${esc(e.purchase.couponCode)}</b> (Paid ₹${esc(e.purchase.finalAmount)})` : ''}
            </div>
            <div style="background:var(--card-bg);border:1px dashed var(--card-border);border-radius:10px;padding:9px 11px;font-size:12px;">
              <div>📅 <b>Exam Schedule:</b> ${esc(e.examDisplayStatus)}</div>
              ${e.examCenter && e.examDate ? `<div style="color:var(--muted);margin-top:3px;">📍 Center: ${esc(e.examCenter)}</div>` : ''}
            </div>
            ${e.rebookingAllowed || e.status === 'rebooking_eligible' ? `
              <div style="margin-top:10px;">
                <button type="button" class="solidbtn" style="width:100%;background:#7c3aed;" onclick="StudentPortal.openCheckout('${esc(e.courseId)}',{attemptType:'rebooking'})">
                  🔁 Enroll / Rebook Next Attempt (#${esc(e.attemptNumber + 1)})
                </button>
              </div>
            ` : ''}
          </div>
        `).join('');
        return;
      }

      if (tab === 'history') {
        if (!d.completedHistory.length) {
          container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:12.5px;">No completed examination attempts yet.</div>`;
          return;
        }
        container.innerHTML = d.completedHistory.map(e => `
          <div style="background:var(--bg-main);border:1px solid var(--card-border);border-radius:14px;padding:14px;margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
              <b style="font-size:14px;color:var(--ink);">${esc(e.courseTitle)} — Attempt #${esc(e.attemptNumber)}</b>
              ${this.statusBadgeHtml(e.status)}
            </div>
            <div style="font-size:12px;color:var(--ink);margin-top:6px;">🏆 Result: <b>${esc(e.scoreSummary || 'Completed')}</b></div>
            <div style="font-size:11px;color:var(--muted);margin-top:4px;">Exam Date: ${esc(e.examDate || 'N/A')} • Enrollment ID: ${esc(e.id)}</div>
            ${e.rebookingAllowed || e.status === 'rebooking_eligible' ? `
              <button type="button" class="solidbtn" style="margin-top:10px;width:100%;background:#7c3aed;" onclick="StudentPortal.openCheckout('${esc(e.courseId)}',{attemptType:'rebooking'})">
                🔁 Rebook Another Examination Attempt
              </button>
            ` : ''}
          </div>
        `).join('');
        return;
      }

      if (tab === 'notifications') {
        if (!d.notifications.length) {
          container.innerHTML = `<div style="text-align:center;padding:20px;color:var(--muted);font-size:12.5px;">No institute updates yet.</div>`;
          return;
        }
        container.innerHTML = d.notifications.map(n => `
          <div style="background:var(--bg-main);border:1px solid var(--card-border);border-radius:12px;padding:12px;margin-bottom:8px;">
            <div style="font-size:13px;font-weight:800;color:var(--ink);">${esc(n.title)}</div>
            <div style="font-size:12px;color:var(--muted);margin-top:4px;line-height:1.45;">${esc(n.message)}</div>
          </div>
        `).join('');
      }
    },

    renderInlineCards() {
      const box = document.getElementById('studentCoursesSummaryCard');
      if (!box) return;
      const d = this.dashboard;
      if (!this.isAuthenticated() || !d) {
        box.innerHTML = `
          <p style="font-size:12px;color:var(--muted);margin:0 0 12px;line-height:1.5;">
            Practice 2 free Tamil &amp; 2 free English passages immediately with no login. Sign in or create a student account to enroll in DoTE courses, redeem coupons, view exam schedules, and track attempts.
          </p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button type="button" class="solidbtn" style="flex:1;min-width:140px;font-size:12.5px;" onclick="StudentPortal.openCoursesHub('catalog')">📚 Course Catalog &amp; Coupons</button>
            <button type="button" class="ghostbtn" style="flex:1;min-width:140px;font-size:12.5px;" onclick="StudentPortal.openAuthModal('login')">🔐 Student Sign In</button>
          </div>
        `;
        return;
      }

      const activeCount = d.activeEnrollments.length;
      const completedCount = d.completedHistory.length;
      const nextExam = d.upcomingExams[0];
      const latestPendingDate = d.activeEnrollments.find(e => !e.examDate);

      box.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px;">
          <div style="background:var(--bg-main);padding:10px;border-radius:10px;border:1px solid var(--card-border);">
            <div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;">Active Courses</div>
            <div style="font-size:18px;font-weight:900;color:var(--primary);">${activeCount}</div>
          </div>
          <div style="background:var(--bg-main);padding:10px;border-radius:10px;border:1px solid var(--card-border);">
            <div style="font-size:10px;font-weight:800;color:var(--muted);text-transform:uppercase;">Completed Exams</div>
            <div style="font-size:18px;font-weight:900;color:#059669;">${completedCount}</div>
          </div>
        </div>
        <div style="background:var(--bg-main);border:1px dashed var(--card-border);border-radius:10px;padding:10px;font-size:12px;margin-bottom:10px;">
          ${nextExam
            ? `📅 <b>Upcoming Exam:</b> ${esc(nextExam.courseTitle)} on <b>${esc(nextExam.examDate)}</b> (${esc(nextExam.examSlot || '')})`
            : latestPendingDate
              ? `⏳ <b>${esc(latestPendingDate.courseTitle)}:</b> ${esc(latestPendingDate.examDisplayStatus)}`
              : 'Browse courses or apply a coupon code to enroll.'}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          <button type="button" class="solidbtn" style="flex:1;min-width:130px;font-size:12px;" onclick="StudentPortal.openCoursesHub('enrollments')">🎓 My Courses &amp; Exams</button>
          <button type="button" class="ghostbtn" style="flex:1;min-width:130px;font-size:12px;" onclick="StudentPortal.openCoursesHub('catalog')">🎟️ Buy / Apply Coupon</button>
        </div>
      `;
    }
  };

  global.StudentPortal = StudentPortal;
})(typeof window !== 'undefined' ? window : globalThis);
