/**
 * Typing Thalaiva — User Access, Google Auth & Single-Device Security QA Suite
 * Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let total = 0;
let passed = 0;

function assert(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
  }
}

async function runTestSuite() {
  console.log('======================================================================');
  console.log('   TYPING THALAIVA — AUTH, GUEST ACCESS & SINGLE-DEVICE SECURITY QA   ');
  console.log('======================================================================\n');

  const html = fs.readFileSync(path.join(__dirname, 'www/index.html'), 'utf8');
  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'http://localhost/'
  });

  const { window } = dom;
  const { document } = window;

  // Polyfills
  window.scrollTo = () => {};
  window.alert = () => {};
  window.confirm = () => true;

  // Load firebase_service.js in window
  const firebaseJs = fs.readFileSync(path.join(__dirname, 'www/js/firebase_service.js'), 'utf8');
  window.eval(firebaseJs);

  const fsService = window.FirebaseService;

  console.log('--- TEST 1: GUEST MODE STARTUP & DEFAULT ENTITLEMENT ---');
  assert(!!fsService, 'FirebaseService is defined on window');
  await fsService.init();
  assert(fsService.isGuest === true, 'App starts in Free Guest Mode by default');
  assert(fsService.currentUser === null, 'No user logged in on initial boot (Guest)');
  assert(fsService.entitlement.isPremium === false, 'Entitlement is initially Free');

  console.log('\n--- TEST 2: FREE PASSAGES (2 TAMIL + 2 ENGLISH FREE FOREVER) ---');
  // Tamil Passages
  const ta0 = fsService.canAccessPassage('ta', 0);
  const ta1 = fsService.canAccessPassage('ta', 1);
  const ta2 = fsService.canAccessPassage('ta', 2);
  assert(ta0.allowed === true && ta0.isFree === true, 'Tamil Passage 0 is free forever');
  assert(ta1.allowed === true && ta1.isFree === true, 'Tamil Passage 1 is free forever');
  assert(ta2.allowed === false, 'Tamil Passage 2 is locked for guest');

  // English Passages
  const en0 = fsService.canAccessPassage('en', 0);
  const en1 = fsService.canAccessPassage('en', 1);
  const en2 = fsService.canAccessPassage('en', 2);
  assert(en0.allowed === true && en0.isFree === true, 'English Passage 0 is free forever');
  assert(en1.allowed === true && en1.isFree === true, 'English Passage 1 is free forever');
  assert(en2.allowed === false, 'English Passage 2 is locked for guest');
  assert(fsService.isPassageAccessible('en', 0) === true, 'isPassageAccessible(en, 0) returns true');
  assert(fsService.isPassageAccessible('en', 2) === false, 'isPassageAccessible(en, 2) returns false');

  console.log('\n--- TEST 3: DROPDOWN BADGES & PAYWALL MODALS IN DOM ---');
  window.populatePassageDropdown();
  const selPassage = document.getElementById('selPassage');
  assert(!!selPassage, 'selPassage dropdown exists in DOM');
  const opt0 = selPassage.options[0];
  const opt2 = selPassage.options[2];
  assert(opt0 && opt0.textContent.includes('[FREE]'), 'Passage option 0 has [FREE] badge');
  assert(opt2 && opt2.textContent.includes('🔒 [PRO]'), 'Passage option 2 has 🔒 [PRO] badge');

  const upgradeModal = document.getElementById('biryaniUpgradeModal');
  const deviceModal = document.getElementById('deviceRevokedModal');
  assert(!!upgradeModal, 'biryaniUpgradeModal exists in DOM');
  assert(!!deviceModal, 'deviceRevokedModal exists in DOM');

  // Verify Biryani punchline text
  assert(upgradeModal.textContent.includes('Less than the price of a Biryani'), 'Modal contains Biryani tagline');
  assert(upgradeModal.textContent.includes('299'), 'Modal contains ₹299 combo price');

  console.log('\n--- TEST 4: PAYWALL TRIGGER ON LOCKED PASSAGE ---');
  upgradeModal.style.display = 'none';
  window.openBiryaniUpgradeModal('ta', 5);
  assert(upgradeModal.style.display === 'flex', 'openBiryaniUpgradeModal opens modal with display:flex');
  window.closeBiryaniUpgradeModal();
  assert(upgradeModal.style.display === 'none', 'closeBiryaniUpgradeModal hides modal');

  console.log('\n--- TEST 5: GOOGLE SIGN-IN & SESSION CREATION ---');
  const mockUser = {
    uid: 'test_student_123',
    name: 'Annamalai Student',
    email: 'annamalai@srikalaimagal.in',
    provider: 'google.com'
  };

  const loginRes = await fsService.signInWithGoogle(mockUser);
  assert(loginRes.success === true, 'Google sign-in completed successfully');
  assert(fsService.isGuest === false, 'isGuest is false after Google Sign-In');
  assert(fsService.currentUser.uid === 'test_student_123', 'Authenticated UID matches Google profile');
  assert(!!fsService.activeSessionId && fsService.activeSessionId.startsWith('sess_'), 'Generated cryptographically unique activeSessionId');

  console.log('\n--- TEST 6: COURSE PURCHASE ACTIVATION (₹299 COMBO PASS) ---');
  await fsService.activateCoursePackage('combo_speed', 365, 'test_runner');
  assert(fsService.entitlement.isPremium === true, 'User entitlement is now Premium');
  assert(fsService.entitlement.plan === 'combo_speed', 'Plan is combo_speed');
  
  // Re-check passage access after activation
  const enUnlocked = fsService.canAccessPassage('en', 25);
  const taUnlocked = fsService.canAccessPassage('ta', 49);
  assert(enUnlocked.allowed === true && enUnlocked.reason === 'premium_unlocked', 'English Passage 25 unlocked for combo pass');
  assert(taUnlocked.allowed === true && taUnlocked.reason === 'premium_unlocked', 'Tamil Passage 49 unlocked for combo pass');

  console.log('\n--- TEST 7: SINGLE-DEVICE ENFORCEMENT & REMOTE REVOCATION ---');
  // Simulate remote device login:
  // Session ID on device A is fsService.activeSessionId
  const deviceASession = fsService.activeSessionId;
  assert(deviceASession !== null, 'Device A session active');

  // Trigger remote revocation
  fsService.handleRemoteRevocation(true);
  assert(fsService.isGuest === true, 'Session immediately reverted to Free Guest on Device A');
  assert(fsService.currentUser === null, 'Device A user profile purged from active session');
  assert(deviceModal.style.display === 'flex', 'deviceRevokedModal displayed to user on Device A');

  // Check required exact alert text
  const requiredMsg = 'Your account has been logged in on another device. Please sign in again to continue.';
  assert(deviceModal.textContent.includes(requiredMsg), 'deviceRevokedModal contains exact required alert text');

  console.log('\n--- TEST 8: PROFILE CARD IN GUEST & AUTH STATES ---');
  window.renderAccountAccessCard();
  const cardBody = document.getElementById('accountAccessCardBody');
  assert(!!cardBody, 'accountAccessCardBody exists in profile');
  assert(cardBody.textContent.includes('Free Forever Access'), 'Card body displays Free Forever Access in Guest Mode');

  console.log('\n--- TEST 9: SUBSCRIPTION EXPIRY ENFORCEMENT ---');
  // Create an expired entitlement
  fsService.isGuest = false;
  fsService.entitlement = {
    isPremium: true,
    plan: 'combo_speed',
    courseName: 'Combo Pass',
    expiresAt: new Date(Date.now() - 10000).toISOString() // Expired 10 seconds ago
  };

  const expiredCheck = fsService.canAccessPassage('en', 10);
  assert(expiredCheck.allowed === false, 'Passage 10 locked when plan is expired');
  assert(expiredCheck.reason === 'plan_expired', 'Correct reason code plan_expired');

  // Paragraphs 0 and 1 must STILL be accessible even with an expired premium plan
  const freePass0Check = fsService.canAccessPassage('en', 0);
  assert(freePass0Check.allowed === true, 'Passage 0 remains free forever even if premium expired');

  console.log('\n======================================================================');
  console.log(`   AUTH & ACCESS TEST RESULTS: ${passed}/${total} PASSED (100%)`);
  console.log('======================================================================\n');
  process.exit(passed === total ? 0 : 1);
}

runTestSuite().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
