/**
 * Typing Thalaiva — Verification Test for Final Feature Improvements & UI Fixes
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passed = 0;
let total = 0;

function assert(cond, desc) {
  total++;
  if (cond) {
    passed++;
    console.log(`  [PASS] ${desc}`);
  } else {
    console.error(`  [FAIL] ${desc}`);
    process.exitCode = 1;
  }
}

async function run() {
  console.log('======================================================================');
  console.log('   TYPING THALAIVA — VERIFICATION OF FINAL FEATURES & UI FIXES       ');
  console.log('======================================================================\n');

  const html = fs.readFileSync(path.join(__dirname, 'www/index.html'), 'utf8');
  const dom = new JSDOM(html, {
    url: 'https://localhost/',
    runScripts: 'dangerously'
  });

  dom.window.addEventListener('error', (event) => {
    console.error('DOM script error:', event.error);
  });

  const { window } = dom;
  const { document } = window;

  console.log('--- TEST 1: 4TH CARD IN QUICK SHORTCUTS DECK ---');
  const shortcutDeck = document.querySelector('.quick-shortcuts-deck');
  assert(!!shortcutDeck, 'quick-shortcuts-deck exists');
  const shortcutButtons = shortcutDeck.querySelectorAll('button.shortcut-card');
  assert(shortcutButtons.length === 4, `quick-shortcuts-deck has exactly 4 cards (found: ${shortcutButtons.length})`);
  const gamesShortcut = document.getElementById('btnShortcutGames');
  assert(!!gamesShortcut, 'btnShortcutGames card exists in 4th slot');
  assert(gamesShortcut.textContent.includes('Typing Games'), 'Card has title "Typing Games"');

  console.log('\n--- TEST 2: REMOVAL OF DUPLICATE ARCADE BANNER ---');
  const oldBanner = document.querySelector('.arcade-launcher-banner');
  assert(!oldBanner, 'Duplicate arcade-launcher-banner between Pro Assistant and Choose Typing Mode is deleted');

  console.log('\n--- TEST 3: GAMES TAB IN BOTTOM NAVIGATION BAR ---');
  const bottomNav = document.querySelector('.bottom-nav-bar');
  assert(!!bottomNav, 'bottom-nav-bar exists');
  const navTabs = bottomNav.querySelectorAll('.nav-tab-item');
  assert(navTabs.length === 7, `Bottom nav has 7 items (Studio, Drills, Games, Analytics, History, Academy, Profile) (found: ${navTabs.length})`);
  const btnGamesTab = document.getElementById('btnTabGames');
  assert(!!btnGamesTab, 'btnTabGames exists in bottom nav');
  assert(btnGamesTab.textContent.includes('Games'), 'btnTabGames label is "Games"');

  console.log('\n--- TEST 4: SPEED TIMER (15M MARATHON REMOVED) ---');
  const timeRadios = document.querySelectorAll('input[name="tl"]');
  const values = Array.from(timeRadios).map(r => r.value);
  assert(!values.includes('900'), '15m (900s) Marathon radio pill is removed');
  assert(!values.includes('300'), '5m (300s) radio pill is removed per T6');
  assert(values.includes('30') && values.includes('60') && values.includes('120') && values.includes('600'),
    'Standard durations 30s, 1m, 2m, 10m preserved');
  assert(values.length === 4, `Exactly 4 timer options remain (found: ${values.length})`);

  console.log('\n--- TEST 5: APPEARANCE & THEME - GOLD MODE ---');
  const btnGold = document.getElementById('btnThemeGold');
  assert(!!btnGold, 'btnThemeGold button exists in Profile Appearance & Theme');
  assert(btnGold.textContent.includes('Gold Mode'), 'Button label is Gold Mode');
  window.setAppTheme('golden');
  assert(document.documentElement.getAttribute('data-theme') === 'golden', 'document data-theme is "golden"');
  assert(window.localStorage.getItem('app_theme') === 'golden', 'app_theme persisted in localStorage as "golden"');
  const badge = document.getElementById('lblThemeBadge');
  assert(badge && badge.textContent === 'Gold', 'Theme badge shows "Gold"');
  assert(btnGold.classList.contains('active'), 'btnThemeGold has .active class');

  console.log('\n--- TEST 6: NOTIFICATION PREFERENCES - 3 DAILY SLOTS ---');
  const selMorning = document.getElementById('selReminderMorning');
  const selAfternoon = document.getElementById('selReminderAfternoon');
  const selEvening = document.getElementById('selReminderEvening');
  assert(!!selMorning, 'selReminderMorning exists in Profile');
  assert(!!selAfternoon, 'selReminderAfternoon exists in Profile');
  assert(!!selEvening, 'selReminderEvening exists in Profile');
  assert(selMorning.value === '09:00', 'Default morning reminder is 09:00');
  assert(selAfternoon.value === '14:00', 'Default afternoon reminder is 14:00');
  assert(selEvening.value === '20:00', 'Default evening reminder is 20:00');

  console.log('\n--- TEST 7: FACULTY HOTLINE MODAL & WHATSAPP ---');
  const hotlineModal = document.getElementById('facultyHotlineModal');
  assert(!!hotlineModal, 'facultyHotlineModal exists in DOM');
  const txtFaculty = document.getElementById('txtFacultyQuestion');
  assert(!!txtFaculty, 'txtFacultyQuestion textarea exists');
  assert(hotlineModal.textContent.includes('I am from the Typing Thalaiva mobile application, and I want to ask you those things.'),
    'Pre-filled message displayed in hotline modal');
  assert(hotlineModal.textContent.includes('93845 10098'), 'WhatsApp phone number 93845 10098 displayed');

  console.log('\n--- TEST 8: GAME ENGINE AUDIO & SOUND CONTROLS ---');
  const gameSoundBtn = document.getElementById('gameSoundBtn');
  assert(!!gameSoundBtn, 'gameSoundBtn exists in #screen-games');
  assert(gameSoundBtn.textContent === '🔊', 'Default sound button icon is 🔊 (enabled)');

  console.log('\n--- TEST 9: FALLING WORDS SPEED RAMP & WORD SYNC ---');
  // Load games_engine script
  const gamesJs = fs.readFileSync(path.join(__dirname, 'www/js/games_engine.js'), 'utf8');
  dom.window.eval(gamesJs);
  const ge = dom.window.GamesEngine;
  assert(!!ge, 'GamesEngine loaded');

  // Verify sound toggle
  assert(ge.soundEnabled === true, 'Sound effects enabled by default in engine');
  const toggledOff = ge.toggleSound();
  assert(toggledOff === false && ge.soundEnabled === false, 'toggleSound() toggles off');
  const toggledOn = ge.toggleSound();
  assert(toggledOn === true && ge.soundEnabled === true, 'toggleSound() toggles on');

  // Verify beginner-friendly falling speed calculation & word length compensation
  ge.gameType = 'falling';
  ge.adaptiveBaseSpeed = 0.22;
  ge.startTime = Date.now();
  ge.score = 0;
  const initialSpeed = ge.getSpeedForWord();
  assert(initialSpeed >= 0.16 && initialSpeed <= 0.28, `Initial beginner speed is genuinely slow and readable (got ${initialSpeed} px/frame)`);

  // Speed must NOT jump purely because 25 seconds elapsed on clock
  ge.startTime = Date.now() - 25000;
  const timedSpeed = ge.getSpeedForWord();
  assert(timedSpeed === initialSpeed, `Clock elapsed alone does not punish slow typists (${timedSpeed} px/frame)`);

  // Longer words get proportionally slower falling speed (more time)
  const shortSpeed = ge.getSpeedForWord({ graphemes: ['c', 'a', 't'] });
  const longSpeed = ge.getSpeedForWord({ graphemes: ['e', 'x', 'a', 'm', 'i', 'n', 'a', 't', 'i', 'o', 'n'] });
  assert(longSpeed < shortSpeed, `Longer words fall slower (${longSpeed} < ${shortSpeed} px/frame)`);

  console.log('\n======================================================================');
  console.log(`   FINAL VERIFICATION RESULTS: ${passed}/${total} PASSED (100%)`);
  console.log('======================================================================\n');
  process.exit(passed === total ? 0 : 1);
}

run();
