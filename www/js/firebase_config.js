/**
 * Runtime Firebase & Backend API Configuration for Typing Thalaiva Student App.
 *
 * SECURITY:
 * - NEVER put Firebase Admin service-account private keys, JWT secrets, or payment secrets here.
 * - For production APK builds, set window.TYPING_API_BASE (your deployed HTTPS backend URL)
 *   and/or window.FIREBASE_CONFIG (your Firebase Web App config from Firebase Console), or let
 *   StudentPortal fetch public config dynamically from GET <API_BASE>/api/public-config.
 */
(function (global) {
  'use strict';

  // Read optional <meta name="tt-api-base" content="https://..."> override if injected at build time
  if (typeof document !== 'undefined' && !global.TYPING_API_BASE) {
    const metaApi = document.querySelector('meta[name="tt-api-base"]');
    if (metaApi && metaApi.getAttribute('content')) {
      global.TYPING_API_BASE = metaApi.getAttribute('content').trim();
    }
  }

  // Leave null until populated by deploy-time config or GET /api/public-config
  if (typeof global.FIREBASE_CONFIG === 'undefined') {
    global.FIREBASE_CONFIG = null;
  }
})(typeof window !== 'undefined' ? window : globalThis);
