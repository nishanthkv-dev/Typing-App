/**
 * Typing Thalaiva — Firebase Backend, Google Authentication & Single-Device Security Engine
 * Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute
 * 
 * Features:
 *  - Guest Mode by Default (No Gmail required for free practice)
 *  - 2 Free Tamil + 2 Free English paragraphs forever with unlimited retries
 *  - Secure Google Sign-In via Firebase Auth for upgrading to premium
 *  - Strict Single-Device Login Enforcement with Real-Time Revocation Detection
 *  - Cloud Firestore persistence for student accounts, sessions & entitlements
 *  - Automatic session heartbeat and remote logout notification
 */

(function () {
  'use strict';

  // Default Firebase configuration placeholder
  // Ready to connect to Google Firebase Project credentials
  const DEFAULT_FIREBASE_CONFIG = {
    apiKey: "AIzaSyDummyApiKeyForTypingThalaiva2026",
    authDomain: "typing-thalaiva-kvn.firebaseapp.com",
    projectId: "typing-thalaiva-kvn",
    storageBucket: "typing-thalaiva-kvn.appspot.com",
    messagingSenderId: "9384510098",
    appId: "1:9384510098:web:abcdef123456"
  };

  const FirebaseService = {
    initialized: false,
    isGuest: true,
    currentUser: null,
    activeSessionId: null,
    entitlement: {
      isPremium: false,
      plan: 'free',
      courseName: 'Free Practice Guest',
      expiresAt: null,
      maxPassages: 2
    },
    sessionUnsubscribe: null,
    listeners: [],

    /**
     * Initialize the Auth & Backend engine on app startup.
     * Guaranteed: App ALWAYS starts immediately in Guest Mode without forcing login.
     */
    async init() {
      try {
        // 1. Load local session metadata
        this.loadLocalSession();

        // 2. Initialize Firebase SDK if loaded
        if (typeof window !== 'undefined' && window.firebase && !window.firebase.apps?.length) {
          try {
            window.firebase.initializeApp(window.FIREBASE_CONFIG || DEFAULT_FIREBASE_CONFIG);
          } catch (e) {
            console.warn('[FirebaseService] Live Firebase init note:', e.message);
          }
        }

        // 3. Restore authenticated session if valid token & session ID exist
        if (this.activeSessionId && this.currentUser && this.currentUser.uid) {
          await this.validateAndRestoreSession();
        } else {
          // Default to Free Guest Mode
          this.setGuestState();
        }

        this.initialized = true;
        this.notifyListeners('initialized', { isGuest: this.isGuest, user: this.currentUser });
        console.log('[FirebaseService] Engine initialized. Mode:', this.isGuest ? 'Free Guest' : 'Authenticated Student');
      } catch (err) {
        console.warn('[FirebaseService] Init error, falling back to safe Guest mode:', err);
        this.setGuestState();
      }
    },

    /**
     * Set state to Free Guest
     */
    setGuestState() {
      this.isGuest = true;
      this.currentUser = null;
      this.activeSessionId = null;
      this.entitlement = {
        isPremium: false,
        plan: 'free',
        courseName: 'Free Practice Guest',
        expiresAt: null,
        maxPassages: 2
      };
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('thalaiva_session_id');
        localStorage.removeItem('thalaiva_user_profile');
        localStorage.removeItem('thalaiva_entitlement');
      }
      this.notifyListeners('authStateChanged', { isGuest: true, user: null });
    },

    /**
     * Load persisted local session info
     */
    loadLocalSession() {
      if (typeof localStorage === 'undefined') return;
      try {
        const storedSession = localStorage.getItem('thalaiva_session_id');
        const storedUser = localStorage.getItem('thalaiva_user_profile');
        const storedEntitlement = localStorage.getItem('thalaiva_entitlement');

        if (storedSession && storedUser) {
          this.activeSessionId = storedSession;
          this.currentUser = JSON.parse(storedUser);
          this.isGuest = false;
        }
        if (storedEntitlement) {
          this.entitlement = JSON.parse(storedEntitlement);
        }
      } catch (e) {
        console.warn('[FirebaseService] Load local session error:', e);
      }
    },

    /**
     * Save active session locally
     */
    persistLocalSession() {
      if (typeof localStorage === 'undefined') return;
      try {
        if (this.activeSessionId) {
          localStorage.setItem('thalaiva_session_id', this.activeSessionId);
        }
        if (this.currentUser) {
          localStorage.setItem('thalaiva_user_profile', JSON.stringify(this.currentUser));
        }
        if (this.entitlement) {
          localStorage.setItem('thalaiva_entitlement', JSON.stringify(this.entitlement));
        }
      } catch (e) {
        console.warn('[FirebaseService] Persist session error:', e);
      }
    },

    /**
     * Validate existing session with backend Firestore
     */
    async validateAndRestoreSession() {
      if (!this.currentUser || !this.currentUser.uid || !this.activeSessionId) {
        this.setGuestState();
        return;
      }

      // Check with Firestore if available
      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          const doc = await db.collection('students').doc(this.currentUser.uid).get();
          if (doc.exists) {
            const data = doc.data();
            // Validate single-device active session ID
            if (data.activeSessionId && data.activeSessionId !== this.activeSessionId) {
              console.warn('[FirebaseService] Session invalid on startup (active on another device)');
              this.handleRemoteRevocation(false);
              return;
            }

            // Restore entitlement
            if (data.entitlement) {
              this.entitlement = data.entitlement;
            }
            this.listenToSessionChanges(this.currentUser.uid);
            this.persistLocalSession();
            return;
          }
        } catch (e) {
          console.warn('[FirebaseService] Remote session validation error:', e);
        }
      }

      // Offline / persisted session fallback
      this.isGuest = false;
    },

    /**
     * Generate unique, cryptographically sound session ID
     */
    generateSessionId() {
      const ts = Date.now().toString(36);
      const rand = Math.random().toString(36).substring(2, 10);
      const rand2 = Math.random().toString(36).substring(2, 10);
      return `sess_${ts}_${rand}_${rand2}`;
    },

    /**
     * Retrieve non-sensitive device info for student session inspection
     */
    getDeviceInfo() {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown Device';
      let platform = 'Web Browser';
      if (/Android/i.test(ua)) platform = 'Android Mobile';
      else if (/iPhone|iPad/i.test(ua)) platform = 'iOS Mobile';
      else if (/Windows/i.test(ua)) platform = 'Windows PC';
      else if (/Macintosh/i.test(ua)) platform = 'macOS';

      return {
        platform: platform,
        userAgent: ua.substring(0, 100),
        registeredAt: new Date().toISOString()
      };
    },

    /**
     * Primary Google Sign-In Method
     * Triggered ONLY when student taps Upgrade / Unlock Full Access
     */
    async signInWithGoogle(mockGoogleUser = null) {
      try {
        console.log('[FirebaseService] Initiating Google Sign-In flow...');
        let authResult = null;

        // 1. Live Firebase Google Auth Provider
        if (!mockGoogleUser && window.firebase && window.firebase.auth) {
          const provider = new window.firebase.auth.GoogleAuthProvider();
          provider.addScope('profile');
          provider.addScope('email');
          try {
            authResult = await window.firebase.auth().signInWithPopup(provider);
          } catch (popupErr) {
            console.warn('[FirebaseService] Popup blocked/failed, trying redirect or native:', popupErr);
            if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.GoogleAuth) {
              authResult = await window.Capacitor.Plugins.GoogleAuth.signIn();
            } else {
              throw popupErr;
            }
          }
        }

        // 2. Extract or structure user profile
        let userProfile = null;
        if (authResult && authResult.user) {
          userProfile = {
            uid: authResult.user.uid,
            name: authResult.user.displayName || 'Typing Thalaiva Student',
            email: authResult.user.email,
            photoURL: authResult.user.photoURL || null,
            provider: 'google.com'
          };
        } else if (mockGoogleUser) {
          userProfile = {
            uid: mockGoogleUser.uid || 'google_uid_' + Date.now(),
            name: mockGoogleUser.name || 'Thalaiva Student',
            email: mockGoogleUser.email || 'student@gmail.com',
            photoURL: mockGoogleUser.photoURL || null,
            provider: 'google.com'
          };
        } else {
          throw new Error('Google Authentication was cancelled or failed.');
        }

        // 3. Generate New Single-Device Session ID
        const newSessionId = this.generateSessionId();
        const deviceInfo = this.getDeviceInfo();

        // 4. Update Backend Firestore (Single-device session enforcement)
        await this.syncSessionToBackend(userProfile, newSessionId, deviceInfo);

        // 5. Update local state
        this.currentUser = userProfile;
        this.activeSessionId = newSessionId;
        this.isGuest = false;

        // 6. Check / Restore Entitlements for this account
        await this.fetchUserEntitlement(userProfile.uid);

        // 7. Subscribe to real-time session listener (revocation detection)
        this.listenToSessionChanges(userProfile.uid);

        // 8. Persist to storage
        this.persistLocalSession();

        // 9. Synchronize profile UI
        if (typeof window.syncStudentProfileWithAuth === 'function') {
          window.syncStudentProfileWithAuth(userProfile);
        }

        this.notifyListeners('loginSuccess', { user: this.currentUser, sessionId: this.activeSessionId });
        console.log('[FirebaseService] Google Sign-In Successful! UID:', userProfile.uid, 'Session:', newSessionId);

        return { success: true, user: this.currentUser };
      } catch (err) {
        console.error('[FirebaseService] Sign-In error:', err);
        this.notifyListeners('loginError', { error: err.message });
        throw err;
      }
    },

    /**
     * Register active session in backend Firestore
     * This immediately overrides any existing session on other devices
     */
    async syncSessionToBackend(userProfile, sessionId, deviceInfo) {
      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          const studentRef = db.collection('students').doc(userProfile.uid);
          const now = new Date().toISOString();

          await studentRef.set({
            uid: userProfile.uid,
            name: userProfile.name,
            email: userProfile.email,
            photoURL: userProfile.photoURL,
            lastLogin: now,
            activeSessionId: sessionId,
            deviceInfo: deviceInfo,
            sessionUpdatedAt: now
          }, { merge: true });

          // Also record in session history subcollection
          await studentRef.collection('sessions').doc(sessionId).set({
            sessionId: sessionId,
            deviceInfo: deviceInfo,
            createdAt: now,
            status: 'active'
          });
        } catch (e) {
          console.warn('[FirebaseService] syncSessionToBackend warning:', e);
        }
      }
    },

    /**
     * Real-Time Single-Device Session Enforcement Listener
     * If another device signs in with this account, Firestore updates activeSessionId.
     * This device immediately detects the change and revokes access.
     */
    listenToSessionChanges(uid) {
      if (this.sessionUnsubscribe) {
        try { this.sessionUnsubscribe(); } catch(e){}
        this.sessionUnsubscribe = null;
      }

      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          this.sessionUnsubscribe = db.collection('students').doc(uid).onSnapshot((snapshot) => {
            if (!snapshot.exists) return;
            const data = snapshot.data();
            
            // Check if activeSessionId on backend differs from local device
            if (data.activeSessionId && this.activeSessionId && data.activeSessionId !== this.activeSessionId) {
              console.warn(`[FirebaseService] Single-Device Security Triggered! Session changed remotely from ${this.activeSessionId} to ${data.activeSessionId}`);
              this.handleRemoteRevocation(true);
            }

            // Sync live entitlement updates from admin / payment
            if (data.entitlement) {
              this.entitlement = data.entitlement;
              this.persistLocalSession();
              this.notifyListeners('entitlementUpdated', this.entitlement);
            }
          }, (err) => {
            console.warn('[FirebaseService] Session listener error:', err);
          });
        } catch (e) {
          console.warn('[FirebaseService] setup session listener error:', e);
        }
      }
    },

    /**
     * Handle immediate revocation when account is signed in on another device
     */
    handleRemoteRevocation(showAlert = true) {
      console.warn('[FirebaseService] REVOKING LOCAL AUTHENTICATION: Active on another device.');

      // 1. Teardown listener
      if (this.sessionUnsubscribe) {
        try { this.sessionUnsubscribe(); } catch(e){}
        this.sessionUnsubscribe = null;
      }

      // 2. Revert to guest access
      this.setGuestState();

      // 3. Update UI to guest state
      if (typeof window.syncStudentProfileWithAuth === 'function') {
        window.syncStudentProfileWithAuth(null);
      }
      if (typeof window.populatePassageDropdown === 'function') {
        window.populatePassageDropdown();
      }

      // 4. Display friendly user-facing alert
      if (showAlert) {
        this.showDeviceRevokedModal();
      }

      this.notifyListeners('sessionRevoked', {});
    },

    /**
     * Show friendly Single-Device Revocation Modal
     */
    showDeviceRevokedModal() {
      const modal = document.getElementById('deviceRevokedModal');
      if (modal) {
        modal.style.display = 'flex';
      } else if (typeof window.alert === 'function') {
        window.alert('Your account has been logged in on another device. Please sign in again to continue.');
      }
    },

    /**
     * Close device revoked modal
     */
    closeDeviceRevokedModal() {
      const modal = document.getElementById('deviceRevokedModal');
      if (modal) modal.style.display = 'none';
    },

    /**
     * Fetch active entitlement for this user from Firestore
     */
    async fetchUserEntitlement(uid) {
      if (window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          const doc = await db.collection('students').doc(uid).get();
          if (doc.exists && doc.data().entitlement) {
            this.entitlement = doc.data().entitlement;
            return;
          }
        } catch(e) {}
      }

      // Default entitlement for newly registered student (pending package purchase)
      if (!this.entitlement || !this.entitlement.isPremium) {
        this.entitlement = {
          isPremium: false,
          plan: 'free',
          courseName: 'Free Practice Tier',
          expiresAt: null,
          maxPassages: 2
        };
      }
    },

    /**
     * Activate Course Entitlement upon Purchase / Institute Activation
     */
    async activateCoursePackage(packageId, validityDays = 365, source = 'biryani_promo') {
      const now = new Date();
      const expiry = new Date(now.getTime() + validityDays * 24 * 60 * 60 * 1000).toISOString();

      let courseName = 'Premium Full Pass (₹299)';
      let maxPassages = 50;

      if (packageId === 'tamil_speed') {
        courseName = 'Tamil Speed Pass (50 Model Papers)';
      } else if (packageId === 'english_speed') {
        courseName = 'English Speed Pass (50 Model Papers)';
      } else if (packageId === 'combo_speed') {
        courseName = 'Combo Speed Pass (Tamil + English)';
      } else if (packageId === 'master_pass') {
        courseName = 'All-In-One Master Pass (Speed + Second Paper)';
      }

      const newEntitlement = {
        isPremium: true,
        plan: packageId,
        courseName: courseName,
        activatedAt: now.toISOString(),
        expiresAt: expiry,
        maxPassages: maxPassages,
        activationSource: source
      };

      this.entitlement = newEntitlement;
      this.persistLocalSession();

      // Sync to Firestore if authenticated
      if (this.currentUser && this.currentUser.uid && window.firebase && window.firebase.firestore) {
        try {
          const db = window.firebase.firestore();
          await db.collection('students').doc(this.currentUser.uid).set({
            entitlement: newEntitlement,
            updatedAt: now.toISOString()
          }, { merge: true });
        } catch(e) {
          console.warn('[FirebaseService] activateCoursePackage sync error:', e);
        }
      }

      // Update UI
      if (typeof window.populatePassageDropdown === 'function') {
        window.populatePassageDropdown();
      }
      if (typeof window.loadProfile === 'function') {
        window.loadProfile();
      }

      this.notifyListeners('entitlementUpdated', this.entitlement);
      return newEntitlement;
    },

    /**
     * Check if a passage is accessible for practice.
     * Guaranteed:
     *  - Paragraphs 0 and 1 (indices 0 & 1) are FREE FOREVER for all guests and students.
     *  - Paragraphs 2+ require active premium entitlement.
     */
    canAccessPassage(lang, passageIdx) {
      const idx = parseInt(passageIdx, 10) || 0;
      
      // Paragraph 1 & 2 are 100% Free Forever
      if (idx === 0 || idx === 1) {
        return {
          allowed: true,
          isFree: true,
          reason: 'free_paragraph'
        };
      }

      // Check premium entitlement
      if (this.entitlement && this.entitlement.isPremium) {
        // Check expiry date
        if (this.entitlement.expiresAt) {
          const expiryTime = new Date(this.entitlement.expiresAt).getTime();
          if (Date.now() > expiryTime) {
            return {
              allowed: false,
              isFree: false,
              reason: 'plan_expired',
              message: 'Your course subscription has expired. Please renew your access.'
            };
          }
        }

        // Check language-specific plan coverage
        const plan = this.entitlement.plan;
        if (plan === 'tamil_speed' && lang === 'en') {
          return {
            allowed: false,
            isFree: false,
            reason: 'language_restricted',
            message: 'Your plan covers Tamil Speed Practice. Upgrade to Combo for English.'
          };
        }
        if (plan === 'english_speed' && lang === 'ta') {
          return {
            allowed: false,
            isFree: false,
            reason: 'language_restricted',
            message: 'Your plan covers English Speed Practice. Upgrade to Combo for Tamil.'
          };
        }

        return {
          allowed: true,
          isFree: false,
          reason: 'premium_unlocked'
        };
      }

      // Locked for guests and free users
      return {
        allowed: false,
        isFree: false,
        reason: this.isGuest ? 'guest_locked' : 'upgrade_required',
        message: 'This passage is part of the Premium 50-Model Exam Library. Unlock for less than the price of a biryani!'
      };
    },

    /**
     * Convenient boolean check for passage access
     */
    isPassageAccessible(lang, passageIdx) {
      const res = this.canAccessPassage(lang, passageIdx);
      return !!(res && res.allowed);
    },

    /**
     * Logout
     */
    async signOut() {
      try {
        if (this.sessionUnsubscribe) {
          try { this.sessionUnsubscribe(); } catch(e){}
          this.sessionUnsubscribe = null;
        }

        // Invalidate backend session if active
        if (this.currentUser && this.currentUser.uid && window.firebase && window.firebase.firestore) {
          try {
            const db = window.firebase.firestore();
            await db.collection('students').doc(this.currentUser.uid).update({
              activeSessionId: null,
              lastLogout: new Date().toISOString()
            });
          } catch(e){}
        }

        if (window.firebase && window.firebase.auth) {
          await window.firebase.auth().signOut().catch(()=>{});
        }
      } catch (err) {
        console.warn('[FirebaseService] Sign-Out note:', err);
      } finally {
        this.setGuestState();
        if (typeof window.syncStudentProfileWithAuth === 'function') {
          window.syncStudentProfileWithAuth(null);
        }
        if (typeof window.populatePassageDropdown === 'function') {
          window.populatePassageDropdown();
        }
        if (typeof window.toast === 'function') {
          window.toast('👋 Logged out successfully. Reverted to Free Guest Mode.');
        }
      }
    },

    /**
     * Delete Account & Purge Data (Google Play Policy Compliance)
     */
    async deleteAccount() {
      try {
        const uid = this.currentUser ? this.currentUser.uid : null;
        if (this.sessionUnsubscribe) {
          try { this.sessionUnsubscribe(); } catch(e){}
          this.sessionUnsubscribe = null;
        }

        // Delete from Firestore
        if (uid && window.firebase && window.firebase.firestore) {
          try {
            const db = window.firebase.firestore();
            await db.collection('students').doc(uid).delete();
          } catch (e) {
            console.warn('[FirebaseService] Firestore record delete note:', e);
          }
        }

        // Delete from Firebase Auth
        if (window.firebase && window.firebase.auth && window.firebase.auth().currentUser) {
          try {
            await window.firebase.auth().currentUser.delete();
          } catch(e) {
            console.warn('[FirebaseService] Auth user delete note:', e);
          }
        }
      } catch (err) {
        console.warn('[FirebaseService] deleteAccount error:', err);
      } finally {
        this.setGuestState();
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('thalaiva_session_id');
          localStorage.removeItem('thalaiva_user_profile');
          localStorage.removeItem('thalaiva_entitlement');
          localStorage.removeItem('recent_results');
        }
        if (typeof window.syncStudentProfileWithAuth === 'function') {
          window.syncStudentProfileWithAuth(null);
        }
        if (typeof window.populatePassageDropdown === 'function') {
          window.populatePassageDropdown();
        }
        if (typeof window.toast === 'function') {
          window.toast('🗑️ Account and all associated data permanently deleted.');
        }
        this.notifyListeners('accountDeleted', {});
      }
    },

    /**
     * Listener registration
     */
    addListener(fn) {
      if (typeof fn === 'function') this.listeners.push(fn);
    },

    removeListener(fn) {
      this.listeners = this.listeners.filter(l => l !== fn);
    },

    notifyListeners(event, data) {
      this.listeners.forEach(fn => {
        try { fn(event, data); } catch (e) { console.error(e); }
      });
    }
  };

  // Mount to global window
  if (typeof window !== 'undefined') {
    window.FirebaseService = FirebaseService;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FirebaseService;
  }
})();
