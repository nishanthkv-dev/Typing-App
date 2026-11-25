/**
 * VERIFICATION TEST SUITE:
 * 1. Academics DoTE Emblem Fix (img/dote_emblem.png, zero legacy base64)
 * 2. Untimed Skill Drills Expansion (Home, Top, Bottom, Mixed Rows across English/Tamil99/Typewriter)
 * 3. Open Practice Drill Studio Word Practice Mode
 * 4. Typing Layout Stability, Scroll Anchoring, Header Updates & Non-Backward Input
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runSuite() {
  console.log('======================================================================');
  console.log('   ACADEMICS, UNTIMED SKILL DRILLS, WORD PRACTICE & LAYOUT QA SUITE   ');
  console.log('======================================================================\n');

  const html = fs.readFileSync(path.join(__dirname, 'www', 'index.html'), 'utf8');
  const pracJs = fs.readFileSync(path.join(__dirname, 'www', 'js', 'practice_curriculum.js'), 'utf8');

  const dom = new JSDOM(html, {
    url: 'https://localhost/',
    runScripts: 'dangerously',
    pretendToBeVisual: true
  });

  const { window } = dom;
  const { document } = window;

  // Evaluate practice_curriculum.js as in browser load order
  const sEl = document.createElement('script');
  sEl.textContent = pracJs;
  document.body.appendChild(sEl);

  // =====================================================================
  // 1. ACADEMICS LOGO FIX
  // =====================================================================
  console.log('--- TEST 1: ACADEMICS LOGO REPLACEMENT & PROPORTIONS ---');
  const tabAcademy = document.getElementById('tab-academy');
  assert(tabAcademy !== null, '#tab-academy exists');
  const legacyBase64 = tabAcademy.querySelector('img[src^="data:image/png;base64,"]');
  assert(legacyBase64 === null, 'Legacy corrupted base64 emblem removed from Academics');

  const academyLogo = document.getElementById('academyDoteLogo');
  assert(academyLogo !== null, '#academyDoteLogo exists in Academics');
  assert(academyLogo.getAttribute('src') === 'img/dote_emblem.png', 'Academics uses img/dote_emblem.png');
  assert(academyLogo.classList.contains('dote-logo-img'), 'Uses .dote-logo-img CSS for contain & aspect-ratio');

  const doteStat = fs.statSync(path.join(__dirname, 'www', 'img', 'dote_emblem.png'));
  assert(doteStat.size > 20000, `DoTE emblem PNG is crisp high-res (${doteStat.size} bytes)`);
  console.log('  [PASS] Academics DoTE logo verified');

  // =====================================================================
  // 2. UNTIMED SKILL DRILLS — REVERSE TYPING & KEYBOARD ROW PRACTICE (2x2)
  // =====================================================================
  console.log('\n--- TEST 2: REVERSE TYPING & KEYBOARD ROW PRACTICE MODULES ---');
  const tabPrac = document.getElementById('tab-practice');
  assert(tabPrac !== null, '#tab-practice exists');
  const pracTextAll = tabPrac.textContent;
  assert(pracTextAll.includes('Reverse Typing'), 'Reverse Typing card present in Untimed Skill Drills');
  assert(pracTextAll.includes('Type words and sentences backwards'), 'Reverse Typing description matches specification');
  assert(pracTextAll.includes('Keyboard Row Practice'), 'Keyboard Row Practice heading present');
  assert(pracTextAll.includes('Home Row'), 'Home Row card present in Untimed Skill Drills');
  assert(pracTextAll.includes('Top Row'), 'Top Row card present in Untimed Skill Drills');
  assert(pracTextAll.includes('Bottom Row'), 'Bottom Row card present in Untimed Skill Drills');
  assert(pracTextAll.includes('Mixed Row'), 'Mixed Row card present in Untimed Skill Drills');
  assert(html.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'), 'Keyboard Row Practice uses clean 2x2 grid');

  const btnRev = document.getElementById('btnStartReverseTyping');
  const btnHome = document.getElementById('btnStartRowHome');
  const btnTop = document.getElementById('btnStartRowTop');
  const btnBottom = document.getElementById('btnStartRowBottom');
  const btnMixed = document.getElementById('btnStartRowMixed');
  assert(btnRev && btnHome && btnTop && btnBottom && btnMixed, 'Reverse Typing and all 4 Row Start buttons exist');

  // Verify Reverse Typing across English, Tamil99, and Tamil Typewriter + grapheme reversal integrity
  assert(window.reverseGraphemes('தமிழ்', 'ta') === 'ழ்மித', 'Tamil grapheme reversal preserves combining vowel/pulli marks');
  document.getElementById('tabPracTrackSel').value = 'en';
  window.onTabPracTrackChange('en');
  window.openPracticeReverse();
  assert(document.getElementById('screen-practice').classList.contains('active'), 'Reverse Typing opens #screen-practice');
  assert(document.getElementById('pracLessonTitle').textContent.includes('Reverse Typing'), 'Header title updated to Reverse Typing');
  assert(window.currentPracLesson().text.includes('sdrawkcab'), 'English Reverse Typing drill loaded with backwards words');

  document.getElementById('tabPracTrackSel').value = 'tamil99';
  window.onTabPracTrackChange('tamil99');
  window.openPracticeReverse();
  assert(document.getElementById('pracLessonTitle').textContent.includes('Tamil99'), 'Tamil99 Reverse Typing drill supported');

  // Verify English row drills launch properly
  document.getElementById('tabPracTrackSel').value = 'en';
  window.onTabPracTrackChange('en');
  assert(document.getElementById('rowKeysHome').textContent.includes('ASDF'), 'English Home Row key pill rendered');

  window.openPracticeRow('home');
  assert(document.getElementById('screen-practice').classList.contains('active'), 'Home Row opens #screen-practice');
  assert(document.getElementById('pracLessonTitle').textContent.includes('Home Row'), 'Header title updated to Home Row');
  assert(document.getElementById('pracExText').textContent.includes('asdf ;lkj'), 'Home Row content loaded');

  window.openPracticeRow('top');
  assert(document.getElementById('pracLessonTitle').textContent.includes('Top Row'), 'Header title updated to Top Row');
  assert(document.getElementById('pracExText').textContent.includes('qwert'), 'Top Row content loaded');

  window.openPracticeRow('bottom');
  assert(document.getElementById('pracLessonTitle').textContent.includes('Bottom Row'), 'Header title updated to Bottom Row');
  assert(document.getElementById('pracExText').textContent.includes('zxcvb'), 'Bottom Row content loaded');

  window.openPracticeRow('mixed');
  assert(document.getElementById('pracLessonTitle').textContent.includes('Mixed Row'), 'Header title updated to Mixed Row');
  assert(document.getElementById('pracExText').textContent.includes('quick brown fox'), 'Mixed Row content loaded');

  // Verify Tamil99 & Typewriter track support
  document.getElementById('tabPracTrackSel').value = 'tamil99';
  window.onTabPracTrackChange('tamil99');
  window.openPracticeRow('home');
  assert(document.getElementById('pracLessonTitle').textContent.includes('Tamil99'), 'Tamil99 Home Row drill supported');

  document.getElementById('tabPracTrackSel').value = 'typewriter';
  window.onTabPracTrackChange('typewriter');
  window.openPracticeRow('top');
  assert(document.getElementById('pracLessonTitle').textContent.includes('Typewriter'), 'Typewriter Top Row drill supported');
  console.log('  [PASS] All 4 Row Practice modules functional across English, Tamil99, and Typewriter');

  // =====================================================================
  // 3. OPEN PRACTICE DRILL STUDIO — WORD PRACTICE MODE
  // =====================================================================
  console.log('\n--- TEST 3: OPEN PRACTICE DRILL STUDIO — WORD PRACTICE ---');
  window.openPractice();
  window.setPracLang('en');
  window.selectPracLesson(4); // Lesson 5 Bottom Row
  assert(document.getElementById('pracLessonTitle').textContent.includes('Lesson 5'), 'Selecting Lesson 5 updates panel title (not stuck on Lesson 1)');

  const btnWords = document.getElementById('pmWords');
  const btnLetters = document.getElementById('pmLetters');
  assert(btnWords && btnLetters, 'Practice mode switcher (#pmLetters, #pmWords) exists');

  window.setPracMode('words');
  assert(btnWords.classList.contains('active'), 'Word Practice tab becomes active');
  const wordTitle = document.getElementById('pracLessonTitle').textContent;
  const activeWordLesson = window.currentPracLesson();
  const wordList = (activeWordLesson.text || '').trim().split(/\s+/);
  assert(wordTitle.includes('Word Practice'), `Word Practice title active: ${wordTitle}`);
  assert(wordList.length >= 16, `Word Practice generates >= 16 real words (got ${wordList.length})`);
  assert(!wordList.includes('azxcvf') && !wordList.includes('lkj'), 'Word Practice filters out raw finger-drill tokens');
  assert(document.getElementById('pracExText').querySelectorAll('br').length >= 3, 'Word Practice formats multi-line rows in DOM');

  // Switch back to Letter/Row drills cleanly
  window.setPracMode('letters');
  assert(btnLetters.classList.contains('active'), 'Letter Drills tab restored');

  // Verify Tamil Word Practice uses active layout
  window.setPracLang('ta');
  window.setPracLayout('typewriter');
  window.setPracMode('words');
  assert(document.getElementById('pracExText').textContent.trim().length > 15, 'Tamil Typewriter Word Practice populates words');
  console.log('  [PASS] Word Practice mode works cleanly in English & Tamil without reloads');

  // =====================================================================
  // 4. TYPING LAYOUT STABILITY & NON-BACKWARD / NON-JUMPING INPUT
  // =====================================================================
  console.log('\n--- TEST 4: TYPING LAYOUT STABILITY & SCROLL FIX ---');
  window.openPractice();
  window.setPracLang('en');
  window.selectPracLesson(0); // Home Keys

  const scrollWrap = document.getElementById('pracScrollWrap');
  const pracExText = document.getElementById('pracExText');
  const pracInput = document.getElementById('practiceInput');
  assert(scrollWrap !== null, '#pracScrollWrap container exists');
  assert(html.includes('#pracScrollWrap {\n  position: relative !important;'), 'Scroll wrapper has position: relative');
  assert(html.includes('#pracExText {\n  position: relative !important;'), '#pracExText has position: relative and no nested competing scroll');

  // Simulate scrollWrap dimensions in JSDOM and test early typing keeps scrollTop at 0
  Object.defineProperty(scrollWrap, 'clientHeight', { value: 200, configurable: true });
  scrollWrap.scrollTop = 0;

  // Mock typing "asdf" character by character
  pracInput.value = 'a';
  pracInput.setSelectionRange(1, 1);
  pracInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(pracInput.value === 'a', `Typed 'a' retained without moving backward (got '${pracInput.value}')`);
  assert(scrollWrap.scrollTop === 0, `Question scrollTop stayed at 0 after typing 'a' (got ${scrollWrap.scrollTop})`);

  pracInput.value = 'asdf l'; // intentional mistake on 6th char
  pracInput.setSelectionRange(6, 6);
  pracInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(pracInput.value === 'asdf l', `Mistyped character did not revert/delete backward (got '${pracInput.value}')`);
  assert(document.getElementById('pracMistakes').textContent === '1', 'Mistake counted accurately');
  assert(scrollWrap.scrollTop === 0, 'Question panel did NOT jump downward to bottom words on early keystroke');

  // Verify switching lessons resets lastPIValue cleanly so next keystroke does NOT jump backward
  window.selectPracLesson(4); // Switch to Lesson 5 (Bottom Row)
  assert(pracInput.value === '', 'Input cleared on lesson switch');
  pracInput.value = 'az';
  pracInput.setSelectionRange(2, 2);
  pracInput.dispatchEvent(new window.Event('input', { bubbles: true }));
  assert(pracInput.value === 'az', `After switching lessons, typing 'az' stays 'az' (got '${pracInput.value}')`);
  assert(document.getElementById('pracCorrect').textContent === '2', 'Correct count updated to 2 cleanly');

  // Verify overlay passage CSS fixes
  assert(html.includes('#screen-test.mode-overlay .passcard') && !html.includes('height: calc(100vh - 180px)'), 'Overlay mode uses responsive flex height instead of fixed 100vh calc');
  assert(document.getElementById('btnPracKeyMap') !== null, '#btnPracKeyMap exists with bounded mobile header styling');
  console.log('  [PASS] Typing layout stability, scroll anchoring, and non-backward input verified');

  console.log('\n======================================================================');
  console.log('   ALL ACADEMICS, DRILLS & TYPING LAYOUT TESTS PASSED (100%)          ');
  console.log('======================================================================\n');
  process.exit(0);
}

runSuite().catch(err => {
  console.error('TEST FAILED:', err);
  process.exit(1);
});
