const fs = require('fs');
const { JSDOM } = require('jsdom');

console.log("======================================================================");
console.log("   TYPING THALAIVA — SENIOR QA AUTOMATED COMPREHENSIVE TEST SUITE     ");
console.log("   Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute   ");
console.log("======================================================================\n");

const html = fs.readFileSync('www/index.html', 'utf8');

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const resultsLog = [];

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
    resultsLog.push({ status: 'PASS', test: testName, details });
  } else {
    failedTests++;
    console.error(`  [FAIL] ${testName} -> ${details}`);
    resultsLog.push({ status: 'FAIL', test: testName, details });
  }
}

async function runTestSuite() {
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://localhost/"
  });

  const { window } = dom;
  const { document } = window;

  // Polyfill / Mock window.storage for testing
  const mockStorage = {};
  window.storage = {
    get: async (k) => mockStorage[k] || null,
    set: async (k, v) => { mockStorage[k] = v; return true; },
    remove: async (k) => { delete mockStorage[k]; return true; }
  };

  // Polyfill AudioEngine to prevent audio errors in headless
  window.AudioEngine = {
    play: () => {},
    init: () => {}
  };

  // Polyfill requestAnimationFrame
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  // -------------------------------------------------------------
  // TEST SUITE 1: Branding & Shorthand Removal Verification
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 1: BRANDING & SHORTHAND AUDIT ---");
  const brandTag = document.querySelector('.brand-tag');
  assert(
    brandTag && brandTag.textContent.includes('Powered by K V N Techno Labs'),
    "Branding tag in header displays 'Powered by K V N Techno Labs'",
    brandTag ? brandTag.textContent : 'Not found'
  );

  const poweredBanners = document.querySelectorAll('.powered-by-banner');
  assert(
    poweredBanners.length >= 2,
    `Powered-by banners present across application tabs (found ${poweredBanners.length})`,
    `Count: ${poweredBanners.length}`
  );

  const shorthandTile = document.querySelector('.academy-tile.steno');
  assert(
    shorthandTile === null,
    "Shorthand Studio tile completely removed from Academy Hub",
    shorthandTile ? 'Tile still present' : 'Verified absent'
  );

  const shorthandModal = document.getElementById('modalShorthand');
  assert(
    shorthandModal === null,
    "Shorthand modal dialog completely removed from DOM",
    shorthandModal ? 'Modal still present' : 'Verified absent'
  );

  assert(
    typeof window.openShorthandStudio === 'undefined',
    "Shorthand JS functions cleanly removed (openShorthandStudio is undefined)"
  );

  // -------------------------------------------------------------
  // TEST SUITE 2: Dual Split Mode & Studio Layout / Scrolling
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 2: STUDIO LAYOUT & DUAL SPLIT SCROLL CLEARANCE ---");
  const tabSpeed = document.getElementById('tab-speed');
  assert(tabSpeed !== null, "Studio tab (#tab-speed) exists in DOM");

  const cards = tabSpeed.querySelectorAll('.launch-mode-card');
  assert(cards.length === 4, `All 4 test mode cards exist (found ${cards.length})`);

  let dualSplitCard = null;
  cards.forEach(c => {
    if (c.textContent.includes('Dual Split Mode')) dualSplitCard = c;
  });
  assert(dualSplitCard !== null, "Dual Split Mode card exists in launch card deck");

  const bottomScrollSpacer = tabSpeed.querySelector('div[style*="height:36px"]') || tabSpeed.querySelector('div[style*="height: 36px"]');
  assert(bottomScrollSpacer !== null, "Scroll clearance spacer present below Dual Split Mode card");

  // -------------------------------------------------------------
  // TEST SUITE 3: Student Profile Picture & Details Persistence
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 3: STUDENT PROFILE & AVATAR UPDATE ---");
  const avatarInput = document.getElementById('avatarFileInput');
  assert(avatarInput !== null, "Avatar file input (#avatarFileInput) exists in DOM");
  assert(avatarInput.getAttribute('type') === 'file', "Avatar input is type='file'");
  assert(avatarInput.getAttribute('accept') === 'image/*', "Avatar input accepts image/*");

  const testAvatarDataUrl = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  window.setStudentAvatar(testAvatarDataUrl, true);

  const hdrAvatar = document.getElementById('hdrAvatarImg');
  const profAvatar = document.getElementById('profileAvatarImg');
  assert(hdrAvatar.src === testAvatarDataUrl, "Header avatar image updated with new photo");
  assert(profAvatar.src === testAvatarDataUrl, "Profile screen avatar image updated with new photo");

  const savedAvatarInStorage = await window.storage.get('student_avatar');
  assert(savedAvatarInStorage === testAvatarDataUrl, "Avatar data persisted successfully in storage");

  // Profile Save
  document.getElementById('profName').value = "Kavitha Rajan";
  document.getElementById('profAddress').value = "DOTE-2026-9812";
  document.getElementById('profMobile').value = "9876543210";
  document.getElementById('profInstitute').value = "Sri Kalaimagal Typewriting Institute";
  
  await window.saveProfile();
  const savedProfile = JSON.parse(await window.storage.get('student-profile'));
  assert(savedProfile.name === "Kavitha Rajan", "Student name persisted in storage");
  assert(savedProfile.address === "DOTE-2026-9812", "Student reg no persisted in storage");

  // -------------------------------------------------------------
  // TEST SUITE 4: English Typing Engine & Verification
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 4: ENGLISH TYPING ENGINE EXECUTION ---");
  window.setLanguage('en');
  window.readConfig();
  assert(window.CFG.lang === 'en', "Active language configured to English");

  // Launch test in scrolling mode
  window.startTest('scrolling');
  const TA = document.getElementById('typingArea');
  assert(TA !== null, "Typing area (#typingArea) exists and active");
  assert(TA.disabled === false, "Typing area is enabled for student input");
  assert(TA.getAttribute('inputmode') === 'text', "Typing area inputmode is 'text' (IME & soft keyboard enabled)");

  // Simulate keystrokes: "Education is "
  const englishTestInput = "Education is ";
  for (let i = 1; i <= englishTestInput.length; i++) {
    const sub = englishTestInput.slice(0, i);
    TA.value = sub;
    TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  }

  assert(TA.value === englishTestInput, `Typing area contains typed text: '${TA.value}'`);
  assert(window.started === true, "Timer automatically started on first keystroke");

  const liveWords = parseInt(document.getElementById('liveWords').textContent, 10);
  assert(liveWords === 2, `Live words count correctly updated to 2 (got ${liveWords})`);

  // Test Backspace deletion
  TA.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));
  TA.value = "Education is";
  TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(TA.value === "Education is", "Backspace deletion handled correctly");
  assert(window.backspaceCount >= 1, `Physical backspace counted (count: ${window.backspaceCount})`);

  // -------------------------------------------------------------
  // TEST SUITE 5: Tamil Typing Engine (Tamil99 & Typewriter)
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 5: TAMIL TYPING ENGINE TRANSLITERATION ---");
  window.setLanguage('ta');
  document.getElementById('selLayout').value = 'tamil99';
  window.readConfig();
  assert(window.CFG.lang === 'ta', "Active language configured to Tamil");
  assert(window.CFG.layout === 'tamil99', "Active layout configured to Tamil99");

  window.startTest('scrolling');
  // In Tamil99: typing 'h' should transliterate to 'க'
  TA.value = 'h';
  TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(TA.value === 'க', `Tamil99 transliteration: 'h' -> 'க' (got '${TA.value}')`);

  // In Tamil99: typing 'f' (pulli) after 'க' should compose to 'க்'
  TA.value = 'hf';
  TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(TA.value === 'க்', `Tamil99 syllable composition: 'hf' -> 'க்' (got '${TA.value}')`);

  // In Tamil99: typing 'q' (vowel sign aa) after 'h' should compose to 'கா'
  TA.value = '';
  TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  TA.value = 'hq';
  TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(TA.value === 'கா', `Tamil99 vowel sign: 'hq' -> 'கா' (got '${TA.value}')`);

  // Test Direct Tamil unicode typing compatibility (e.g. from Tamil IME soft keyboard)
  TA.value = 'தமிழ்';
  TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(TA.value === 'தமிழ்', `Direct Tamil Unicode support: 'தமிழ்' accepted (got '${TA.value}')`);

  // -------------------------------------------------------------
  // TEST SUITE 6: Examination Scoring & Marks Calculation
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 6: EXAMINATION SCORING & MARKS ALGORITHM ---");
  window.setLanguage('en');
  window.CFG.category = 'typing';
  window.CFG.level = 'senior';
  window.CFG.totalMarks = 100;
  window.timeLimitSecs = 600; // 10 minutes

  const samplePassage = "Education is the most powerful weapon which you can use to change the world. It is the passport to the future, for tomorrow belongs to those who prepare for it today.";
  const sampleTyped = "Education is the most powerful weapon which you can use to change the world. It is the passport to the future, for tomorrow belongs to those who prepare for it today.";
  
  // Set markWords to samplePassage word count for complete test evaluation
  window.markWords = samplePassage.split(/\s+/).filter(Boolean).length;

  const result100 = window.calcResults(sampleTyped, samplePassage, 120, false);
  assert(result100.accuracy === 100, `Perfect accuracy calculated as 100% (got ${result100.accuracy}%)`);
  assert(result100.errors === 0, `Errors counted as 0 (got ${result100.errors})`);
  assert(result100.marks === 100, `Full marks awarded for flawless submission: 100/100 (got ${result100.marks})`);
  assert(result100.netWpm > 0, `Net WPM calculated (> 0) (got ${result100.netWpm} WPM)`);

  // Test Error deduction: 2 mistakes in Senior Grade (100 - (2 * 1.25) = 97.5)
  const sampleWithMistakes = "Education is the most powerfull weapon which you can use to chang the world. It is the passport to the future, for tomorrow belongs to those who prepare for it today.";
  const resultMistakes = window.calcResults(sampleWithMistakes, samplePassage, 120, false);
  assert(resultMistakes.errors === 2, `Detected exactly 2 mistakes (got ${resultMistakes.errors})`);
  assert(resultMistakes.marks === 97.5, `DoTE Senior Mark deduction: 100 - (2 * 1.25) = 97.5 (got ${resultMistakes.marks})`);

  // Test COA benchmark (50 marks total, -1.8 deduction)
  window.CFG.category = 'coa';
  window.CFG.totalMarks = 50;
  const resultCOA = window.calcResults(sampleWithMistakes, samplePassage, 120, false);
  assert(resultCOA.total === 50, `COA Total marks is 50 (got ${resultCOA.total})`);
  const expectedCOAMarks = +(50 - (2 * 1.8)).toFixed(1); // 46.4
  assert(resultCOA.marks === expectedCOAMarks, `COA deduction: 50 - (2 * 1.8) = ${expectedCOAMarks} (got ${resultCOA.marks})`);

  // Test full submission workflow
  window.startTest('scrolling');
  TA.value = sampleTyped;
  TA.dispatchEvent(new window.Event('input', { bubbles: true }));
  window.submitTest(false);
  assert(window.submitted === true, "Test successfully submitted");
  assert(TA.disabled === true, "Typing area locked after submission");
  const resultsScreen = document.getElementById('screen-results');
  assert(resultsScreen.classList.contains('active'), "Results screen displayed to user");

  // -------------------------------------------------------------
  // TEST SUITE 7: Untimed Practice Drills Studio
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 7: SKILL DRILLS STUDIO ---");
  window.openPractice();
  const pracScreen = document.getElementById('screen-practice');
  assert(pracScreen.classList.contains('active'), "Drills studio screen opened");

  window.setPracLang('en');
  const pracInput = document.getElementById('practiceInput');
  assert(pracInput !== null, "Drills input area exists");

  pracInput.value = "asdf ;lkj ";
  pracInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  const pct = parseInt(document.getElementById('pracProgressPct').textContent, 10);
  assert(pct > 0, `Drills progress updated on typing (> 0%) (got ${pct}%)`);

  window.closePractice();
  assert(!pracScreen.classList.contains('active'), "Drills studio closed cleanly");

  // -------------------------------------------------------------
  // TEST SUITE 8: Analytics & Recent Results Persistence
  // -------------------------------------------------------------
  console.log("\n--- TEST SUITE 8: ANALYTICS & RESULT HISTORY ---");
  await new Promise(r => setTimeout(r, 100));
  const storedResults = JSON.parse(await window.storage.get('recent-results') || '[]');
  assert(Array.isArray(storedResults) && storedResults.length > 0, `Recent test run successfully logged in history (records: ${storedResults.length})`);
  assert(storedResults[0].marks > 0, `Logged result contains valid marks (${storedResults[0].marks})`);

  // -------------------------------------------------------------
  // FINAL SUMMARY
  // -------------------------------------------------------------
  console.log("\n======================================================================");
  console.log(`   TEST EXECUTION COMPLETE: ${totalTests} TESTS RUN`);
  console.log(`   PASSED: ${passedTests} | FAILED: ${failedTests}`);
  console.log("======================================================================");

  if (failedTests > 0) {
    console.error(`\n❌ SENIOR QA VERIFICATION FAILED: ${failedTests} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`\n✅ ALL MODULES VERIFIED & STABLE. APPLICATION READY FOR RELEASE.`);
    process.exit(0);
  }
}

runTestSuite().catch(err => {
  console.error("Test runner threw uncaught error:", err);
  process.exit(1);
});
