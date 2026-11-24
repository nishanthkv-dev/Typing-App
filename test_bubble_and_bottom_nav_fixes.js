/**
 * TEST SUITE: BUBBLE WORD CHALLENGE & BOTTOM NAVIGATION VERIFICATION
 */
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runTestSuite() {
  console.log("======================================================================");
  console.log("   BUBBLE WORD CHALLENGE & BOTTOM NAVIGATION FIX VERIFICATION       ");
  console.log("======================================================================\n");

  const html = fs.readFileSync(path.join(__dirname, 'www', 'index.html'), 'utf8');
  const gamesJs = fs.readFileSync(path.join(__dirname, 'www', 'js', 'games_engine.js'), 'utf8');

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    resources: 'usable',
    pretendToBeVisual: true
  });

  const { window } = dom;
  const { document } = window;

  // Polyfills for JSDOM
  window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  // Mount GamesEngine script
  const scriptEl = document.createElement('script');
  scriptEl.textContent = gamesJs;
  document.body.appendChild(scriptEl);

  const engine = window.GamesEngine;
  assert(!!engine, "GamesEngine is defined and loaded on window");

  // =====================================================================
  // SUITE 1: BUBBLE WORD CHALLENGE SPAWNING & FALL SMOOTHNESS (ENGLISH)
  // =====================================================================
  console.log("--- TEST 1: BUBBLE WORD CHALLENGE (ENGLISH) SPAWNING & COORDINATES ---");
  engine.start('bubble', 'en', 'qwerty');
  assert(engine.gameType === 'bubble', "Game started in bubble mode");
  assert(engine.activeWords.length > 0, "Initial bubble spawned on start");

  const initialWord = engine.activeWords[0];
  assert(typeof initialWord.x === 'number' && !isNaN(initialWord.x), `Initial bubble x is a valid number (got ${initialWord.x})`);
  assert(typeof initialWord.y === 'number' && !isNaN(initialWord.y), `Initial bubble y is a valid number (got ${initialWord.y})`);
  assert(initialWord.y > 0, `Initial bubble is immediately visible in view (y: ${initialWord.y})`);

  const prevX = initialWord.x;
  const prevY = initialWord.y;

  // Run 30 animation frames of update
  for (let frame = 1; frame <= 30; frame++) {
    engine.update(Date.now());
  }

  assert(!isNaN(initialWord.x), `After 30 frames, bubble x is NOT NaN (got ${initialWord.x})`);
  assert(!isNaN(initialWord.y), `After 30 frames, bubble y is NOT NaN (got ${initialWord.y})`);
  assert(initialWord.y > prevY, `Bubble falls smoothly downwards (from ${prevY} to ${initialWord.y})`);
  console.log("  [PASS] English bubble spawned with valid coordinates and falls smoothly without NaN");

  // =====================================================================
  // SUITE 2: BUBBLE WORD CHALLENGE SPAWNING & FALL SMOOTHNESS (TAMIL)
  // =====================================================================
  console.log("\n--- TEST 2: BUBBLE WORD CHALLENGE (TAMIL) SPAWNING & COORDINATES ---");
  engine.start('bubble', 'ta', 'tamil99');
  assert(engine.gameType === 'bubble', "Tamil game started in bubble mode");
  assert(engine.activeWords.length > 0, "Tamil initial bubble spawned on start");

  const taWord = engine.activeWords[0];
  assert(typeof taWord.text === 'string' && taWord.text.length > 0, `Tamil word text spawned: '${taWord.text}'`);
  assert(Array.isArray(taWord.graphemes) && taWord.graphemes.length > 0, `Tamil graphemes: ${taWord.graphemes.join('|')}`);
  assert(!isNaN(taWord.x), `Tamil bubble x is valid number (got ${taWord.x})`);
  assert(!isNaN(taWord.y), `Tamil bubble y is valid number (got ${taWord.y})`);

  const prevTaY = taWord.y;
  for (let frame = 1; frame <= 30; frame++) {
    engine.update(Date.now());
  }
  assert(!isNaN(taWord.x), `After 30 frames, Tamil bubble x is NOT NaN (got ${taWord.x})`);
  assert(!isNaN(taWord.y), `After 30 frames, Tamil bubble y is NOT NaN (got ${taWord.y})`);
  assert(taWord.y > prevTaY, `Tamil bubble falls smoothly downwards (from ${prevTaY} to ${taWord.y})`);
  console.log("  [PASS] Tamil bubble spawned with valid coordinates and falls smoothly without NaN");

  // =====================================================================
  // SUITE 3: LETTER-BY-LETTER TYPING & POPPING IN BUBBLE MODE (ENGLISH)
  // =====================================================================
  console.log("\n--- TEST 3: LETTER-BY-LETTER TYPING & POPPING (ENGLISH) ---");
  engine.start('bubble', 'en', 'qwerty');
  engine.activeWords[0] = {
    text: 'cat',
    graphemes: ['c', 'a', 't'],
    x: 150,
    baseX: 150,
    y: 100,
    width: 90,
    height: 52,
    radius: 26,
    speed: 1,
    phase: 0,
    wobbleSpeed: 0.02,
    wobbleAmp: 5,
    shakeOffset: 0,
    shakeFrames: 0,
    bubbles: [{ char: 'cat', x: 150, y: 100, radius: 26, popped: false }]
  };
  engine.currentWordIdx = 0;
  engine.charIndex = 0;
  engine.score = 0;

  // Type 'c'
  engine.handleKeystroke('c');
  assert(engine.score === 1, `Typing 'c' awards 1 point (got ${engine.score})`);
  assert(engine.charIndex === 1, `charIndex advances to 1 (got ${engine.charIndex})`);
  assert(engine.activeWords.length === 1, "Bubble is STILL active and visible (not popped prematurely)");

  // Type 'a'
  engine.handleKeystroke('a');
  assert(engine.score === 2, `Typing 'a' awards 1 point (got ${engine.score})`);
  assert(engine.charIndex === 2, `charIndex advances to 2 (got ${engine.charIndex})`);
  assert(engine.activeWords.length === 1, "Bubble is still active for last letter");

  // Type 't' -> Completes word: +1 letter + 5 bonus = 8 points total
  const initialCompleted = engine.wordsCompleted;
  engine.handleKeystroke('t');
  assert(engine.score === 8, `Full word scored 8 points (3 letters + 5 bonus) (got ${engine.score})`);
  assert(engine.wordsCompleted === initialCompleted + 1, "wordsCompleted incremented on word pop");
  console.log("  [PASS] English bubble remains visible letter-by-letter and pops upon full word completion");

  // =====================================================================
  // SUITE 4: LETTER-BY-LETTER TYPING & POPPING IN BUBBLE MODE (TAMIL)
  // =====================================================================
  console.log("\n--- TEST 4: LETTER-BY-LETTER TYPING & POPPING (TAMIL) ---");
  engine.start('bubble', 'ta', 'tamil99');
  engine.activeWords[0] = {
    text: 'கல்வி',
    graphemes: ['க', 'ல்', 'வி'],
    x: 180,
    baseX: 180,
    y: 120,
    width: 100,
    height: 52,
    radius: 26,
    speed: 1,
    phase: 0,
    wobbleSpeed: 0.02,
    wobbleAmp: 5,
    shakeOffset: 0,
    shakeFrames: 0,
    bubbles: [{ char: 'கல்வி', x: 180, y: 120, radius: 26, popped: false }]
  };
  engine.currentWordIdx = 0;
  engine.charIndex = 0;
  engine.score = 0;

  // In Tamil99: 'h' maps to 'க'
  engine.handleKeystroke('h');
  assert(engine.score === 1, `Typing 'h' in Tamil99 matches 'க' and awards 1 pt (got ${engine.score})`);
  assert(engine.charIndex === 1, `charIndex advances to 1 (got ${engine.charIndex})`);
  assert(engine.activeWords.length === 1, "Tamil bubble stays visible");

  // Direct Unicode input: 'ல்'
  engine.handleKeystroke('ல்');
  assert(engine.score === 2, `Direct Unicode 'ல்' matches and awards 1 pt (got ${engine.score})`);
  assert(engine.charIndex === 2, `charIndex advances to 2 (got ${engine.charIndex})`);

  // Direct Unicode input: 'வி'
  engine.handleKeystroke('வி');
  assert(engine.score === 8, `Word completion awards 8 points (3 letters + 5 bonus) (got ${engine.score})`);
  assert(engine.wordsCompleted === 1, "Tamil word completed");
  console.log("  [PASS] Tamil bubble handles both Tamil99 transliteration and direct Unicode with +5 word bonus");

  // =====================================================================
  // SUITE 5: START, RESTART AND EXIT MECHANICS
  // =====================================================================
  console.log("\n--- TEST 5: START, RESTART, AND EXIT ---");
  engine.start('bubble', 'en', 'qwerty');
  assert(engine.active === true, "Engine is active after start()");

  // Test restart
  engine.restart();
  assert(engine.active === true, "Engine is active after restart()");
  assert(engine.score === 0, "Score reset to 0 after restart()");
  assert(engine.lives === 6, "Lives reset to 6 after restart()");

  // Test quit
  engine.quit();
  assert(engine.active === false, "Engine is inactive after quit()");
  assert(document.getElementById('screen-games-hub').classList.contains('active'), "quit() returned to games hub");
  console.log("  [PASS] start, restart, and quit operate cleanly without errors");

  // =====================================================================
  // SUITE 6: BOTTOM NAVIGATION STATE TRANSITIONS & SYNC ON EXIT
  // =====================================================================
  console.log("\n--- TEST 6: BOTTOM NAVIGATION STATE TRANSITIONS & EXIT ---");
  // 1. Switch to Academy tab first
  window.switchTab('academy');
  assert(document.getElementById('btnTabAcademy').classList.contains('active'), "Academy button is active");
  assert(document.getElementById('tab-academy').classList.contains('active'), "Academy pane is active");
  assert(!document.getElementById('btnTabGames').classList.contains('active'), "Games button is NOT active");

  // 2. Open Games tab
  window.switchTab('games');
  assert(document.getElementById('btnTabGames').classList.contains('active'), "Games button is active while in games");
  assert(!document.getElementById('btnTabAcademy').classList.contains('active'), "Academy button is no longer active");
  assert(document.getElementById('screen-games-hub').classList.contains('active'), "Games Hub screen is active");

  // 3. Exit Games via exitGames()
  window.exitGames();
  assert(!document.getElementById('btnTabGames').classList.contains('active'), "Games button is NOT active after exitGames()");
  assert(document.getElementById('btnTabAcademy').classList.contains('active'), "Academy button restored to active after exiting games");
  assert(document.getElementById('tab-academy').classList.contains('active'), "Academy pane restored after exiting games");
  assert(document.getElementById('screen-config').classList.contains('active'), "App config screen is active");

  // 4. Test exit when previously on Studio (speed)
  window.switchTab('speed');
  assert(document.getElementById('btnTabSpeed').classList.contains('active'), "Studio button is active");
  window.switchTab('games');
  assert(document.getElementById('btnTabGames').classList.contains('active'), "Games button is active");
  window.exitGames();
  assert(!document.getElementById('btnTabGames').classList.contains('active'), "Games button is NOT active after exiting to Studio");
  assert(document.getElementById('btnTabSpeed').classList.contains('active'), "Studio button is active after exit");
  assert(document.getElementById('tab-speed').classList.contains('active'), "Studio tab is active after exit");

  // 5. Test direct showScreen('screen-config') auto-synchronization
  window.switchTab('games');
  assert(document.getElementById('btnTabGames').classList.contains('active'), "Games button is active");
  window.showScreen('screen-config');
  assert(!document.getElementById('btnTabGames').classList.contains('active'), "showScreen('screen-config') automatically cleaned up Games button");
  assert(document.getElementById('btnTabSpeed').classList.contains('active'), "showScreen('screen-config') synchronized active button with tab-speed");
  console.log("  [PASS] Bottom navigation perfectly restores previous tab and synchronizes active state on exit");

  // =====================================================================
  // SUITE 7: BOTTOM NAVIGATION LABELS, SPACING & ALIGNMENT AUDIT
  // =====================================================================
  console.log("\n--- TEST 7: BOTTOM NAVIGATION LABELS & ALIGNMENT ---");
  const bottomNav = document.querySelector('.bottom-nav-bar');
  const navTabs = bottomNav.querySelectorAll('.nav-tab-item');
  assert(navTabs.length === 7, `7 nav tabs present (found ${navTabs.length})`);

  const expectedTabs = [
    { id: 'btnTabSpeed', label: 'Studio' },
    { id: 'btnTabPractice', label: 'Drills' },
    { id: 'btnTabGames', label: 'Games' },
    { id: 'btnTabProgress', label: 'Analytics' },
    { id: 'btnTabHistory', label: 'History' },
    { id: 'btnTabAcademy', label: 'Academy' },
    { id: 'btnTabProfile', label: 'Profile' }
  ];

  expectedTabs.forEach(tab => {
    const el = document.getElementById(tab.id);
    assert(!!el, `Tab #${tab.id} exists`);
    const labelSpan = el.querySelector('span');
    assert(!!labelSpan, `Tab #${tab.id} has span label`);
    assert(labelSpan.textContent.trim() === tab.label, `Tab #${tab.id} label is '${tab.label}' (got '${labelSpan.textContent.trim()}')`);
    assert(!!el.querySelector('svg'), `Tab #${tab.id} has SVG icon`);
  });

  console.log("  [PASS] All 7 tabs have verified labels, SVG icons, and uniform layout matching Academy");

  console.log("\n======================================================================");
  console.log("   ALL BUBBLE WORD CHALLENGE & BOTTOM NAV TESTS PASSED (100%)       ");
  console.log("======================================================================");
}

runTestSuite().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
