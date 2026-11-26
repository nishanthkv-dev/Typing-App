/**
 * Runtime Firebase & Backend API Configuration for Typing Thalaiva Student App.
 *
 * SECURITY:
 * - Contains ONLY public Firebase Web App identity fields (never service-account private keys).
 * - For production APK builds, set <meta name="tt-api-base" content="https://..."> or StudentPortal.setApiBase().
 */
(function (global) {
  'use strict';

  if (typeof document !== 'undefined' && !global.TYPING_API_BASE) {
    const metaApi = document.querySelector('meta[name="tt-api-base"]');
    if (metaApi && metaApi.getAttribute('content')) {
      global.TYPING_API_BASE = metaApi.getAttribute('content').trim();
    }
  }

  global.FIREBASE_CONFIG = {
    apiKey: "AIzaSyD3YiNnU5KESSmxD6L7dwh2lN6dwG7lgis",
    authDomain: "typingthalaiva.firebaseapp.com",
    projectId: "typingthalaiva",
    storageBucket: "typingthalaiva.firebasestorage.app",
    messagingSenderId: "1063058977311",
    appId: "1:1063058977311:web:726136ce2335c16acc5b2a",
    googleWebClientId: "1063058977311-rdj90sp2641te7errsq6shncpvql3fth.apps.googleusercontent.com"
  };
})(typeof window !== 'undefined' ? window : globalThis);
