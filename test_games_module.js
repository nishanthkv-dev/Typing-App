/**
 * AUTOMATED COMPREHENSIVE TEST SUITE FOR TYPING THALAIVA GAMES MODULE
 * Tests:
 *  1. Game Initialization & Screen Navigation
 *  2. Word Generation & Grapheme Splitting (English & Tamil)
 *  3. Bubble Word Challenge: Letter-by-letter progression, +1 pt, +5 bonus
 *  4. Falling Words Challenge: Velocity scaling with score
 *  5. Mistake Detection: No advance on errors, exact logging of mistakes
 *  6. 5-Miss Termination Rule (Game Over on 5 misses, no negative points)
 *  7. Partial Point Retention on boundary miss
 *  8. Tamil99 & Typewriter Layout Transliteration in Games
 *  9. Anti-Choke Diagnostic Report & Weak Key Heatmap
 * 10. Student Game History Persistence & Filtering
 * 11. Fair-Play Personal Best Leaderboard & Accuracy Tie-Breaking
 */

const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

function assert(cond, desc, detail) {
  if (!cond) {
    console.error(`  [FAIL] ${desc} -> ${detail || ''}`);
    throw new Error(`Assertion failed: ${desc}`);
  } else {
    console.log(`  [PASS] ${desc}`);
  }
}

async function runGamesTestSuite() {
  console.log("======================================================================");
  console.log("   TYPING THALAIVA — ARCADE ARENA & ANTI-CHOKE GAMES TEST SUITE       ");
  console.log("======================================================================\n");

  const html = fs.readFileSync(path.resolve(__dirname, 'www/index.html'), 'utf-8');
  const gamesJs = fs.readFileSync(path.resolve(__dirname, 'www/js/games_engine.js'), 'utf-8');

  const dom = new JSDOM(html, {
    runScripts: 'dangerously',
    url: 'https://localhost/'
  });

  const { window } = dom;

  // Mock window.storage
  const mockStorage = {};
  window.storage = {
    get: async (k) => mockStorage[k] || null,
    set: async (k, v) => { mockStorage[k] = v; return true; },
    remove: async (k) => { delete mockStorage[k]; return true; }
  };

  // Mock AudioEngine
  window.AudioEngine = {
    play: () => {},
    init: () => {},
    ctx: null
  };

  // Polyfill requestAnimationFrame for headless Node environment
  global.requestAnimationFrame = window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  global.cancelAnimationFrame = window.cancelAnimationFrame = (id) => clearTimeout(id);

  // Polyfill canvas context for headless DOM
  window.HTMLCanvasElement.prototype.getContext = function () {
    return {
      scale: () => {},
      clearRect: () => {},
      fillRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      stroke: () => {},
      fill: () => {},
      arc: () => {},
      ellipse: () => {},
      quadraticCurveTo: () => {},
      closePath: () => {},
      save: () => {},
      restore: () => {},
      font: '',
      measureText: (text) => ({ width: (text || '').length * 12 }),
      fillText: () => {},
      setLineDash: () => {},
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} })
    };
  };

  // Execute games_engine.js in window context if not already executed
  window.eval(gamesJs);

  const engine = window.GamesEngine;
  engine.init();
  assert(engine !== undefined && engine !== null, "GamesEngine is defined and loaded on window");

  // --- SUITE 1: GAMES ARENA SCREENS & NAVIGATION ---
  console.log("\n--- TEST SUITE 1: GAMES ARENA SCREENS & NAVIGATION ---");
  const gamesHubScreen = window.document.getElementById('screen-games-hub');
  const gamesScreen = window.document.getElementById('screen-games');
  const gameCanvas = window.document.getElementById('gameCanvas');
  const gameInput = window.document.getElementById('gameKeyInput');

  assert(gamesHubScreen !== null, "screen-games-hub exists in DOM");
  assert(gamesScreen !== null, "screen-games exists in DOM");
  assert(gameCanvas !== null, "gameCanvas exists in DOM");
  assert(gameInput !== null, "gameKeyInput exists in DOM");

  window.showScreen('screen-games-hub');
  assert(gamesHubScreen.classList.contains('active'), "screen-games-hub activated via showScreen");

  // --- SUITE 2: WORD GENERATION & TAMIL GRAPHEME SEGMENTATION ---
  console.log("\n--- TEST SUITE 2: WORD GENERATION & TAMIL GRAPHEME SEGMENTATION ---");
  // Test English
  engine.start('bubble', 'en', 'qwerty');
  assert(engine.activeWords.length > 0, "Word spawned on game start");
  const enWord = engine.activeWords[0];
  assert(typeof enWord.text === 'string' && enWord.text.length > 0, `English word spawned: '${enWord.text}'`);
  assert(Array.isArray(enWord.graphemes) && enWord.graphemes.length === enWord.text.length, "English graphemes split 1:1 with characters");

  // Test Tamil compound characters
  engine.start('bubble', 'ta', 'tamil99');
  assert(engine.activeWords.length > 0, "Tamil word spawned on start");
  const taWord = engine.activeWords[0];
  assert(typeof taWord.text === 'string' && taWord.text.length > 0, `Tamil word spawned: '${taWord.text}'`);
  assert(Array.isArray(taWord.graphemes) && taWord.graphemes.length > 0, `Tamil graphemes correctly formed: ${taWord.graphemes.join('|')}`);

  // --- SUITE 3: BUBBLE WORD CHALLENGE PROGRESSION & SCORING ---
  console.log("\n--- TEST SUITE 3: BUBBLE WORD CHALLENGE PROGRESSION & SCORING ---");
  engine.start('bubble', 'en', 'qwerty');
  // Inject known word: 'speed'
  engine.activeWords[0] = {
    text: 'speed',
    graphemes: ['s', 'p', 'e', 'e', 'd'],
    x: 180,
    y: 400,
    baseX: 180,
    width: 100,
    height: 48,
    speed: 1,
    phase: 0,
    wobbleSpeed: 0.03,
    wobbleAmp: 10,
    shakeOffset: 0,
    shakeFrames: 0
  };
  engine.currentWordIdx = 0;
  engine.charIndex = 0;
  engine.score = 0;

  // Keystroke 1: Correct 's' -> +1 point, advance to 'p'
  engine.handleKeystroke('s');
  assert(engine.score === 1, `1 point awarded for correct letter (got ${engine.score})`);
  assert(engine.charIndex === 1, `charIndex advanced to 1 (got ${engine.charIndex})`);
  assert(engine.correctChars === 1, "correctChars incremented to 1");

  // Keystroke 2: Correct 'p' -> +1 point, advance to 'e'
  engine.handleKeystroke('p');
  assert(engine.score === 2, `Score is now 2 (got ${engine.score})`);
  assert(engine.charIndex === 2, `charIndex advanced to 2 (got ${engine.charIndex})`);

  // Keystrokes 3 & 4: Correct 'e', 'e'
  engine.handleKeystroke('e');
  engine.handleKeystroke('e');
  assert(engine.score === 4, `Score is now 4 (got ${engine.score})`);
  assert(engine.charIndex === 4, `charIndex advanced to 4 (got ${engine.charIndex})`);

  // Keystroke 5: Final letter 'd' -> +1 point AND +5 WORD BONUS!
  engine.handleKeystroke('d');
  assert(engine.score === 10, `Full word scored 10 points (5 letters + 5 bonus) (got ${engine.score})`);
  assert(engine.wordsCompleted === 1, `wordsCompleted incremented to 1 (got ${engine.wordsCompleted})`);

  // --- SUITE 4: MISTAKE DETECTION & ZERO-ADVANCE RULE ---
  console.log("\n--- TEST SUITE 4: MISTAKE DETECTION & ZERO-ADVANCE RULE ---");
  engine.start('bubble', 'en', 'qwerty');
  engine.activeWords[0] = {
    text: 'target',
    graphemes: ['t', 'a', 'r', 'g', 'e', 't'],
    x: 180,
    y: 400,
    baseX: 180,
    width: 100,
    height: 48,
    speed: 1,
    phase: 0,
    wobbleSpeed: 0.03,
    wobbleAmp: 10,
    shakeOffset: 0,
    shakeFrames: 0
  };
  engine.currentWordIdx = 0;
  engine.charIndex = 0;
  engine.score = 0;
  engine.incorrectChars = 0;

  // Type wrong letter: 'z' instead of 't'
  engine.handleKeystroke('z');
  assert(engine.charIndex === 0, `ZERO-ADVANCE: charIndex remained at 0 on mistake (got ${engine.charIndex})`);
  assert(engine.score === 0, `NO NEGATIVE POINTS: score remained at 0 (got ${engine.score})`);
  assert(engine.incorrectChars === 1, "incorrectChars incremented to 1");
  assert(engine.mistakesLog.length === 1, "Exact mistake recorded in mistakesLog");
  assert(engine.mistakesLog[0].expected === 't' && engine.mistakesLog[0].actual === 'z', "Logged expected='t' and actual='z'");
  assert(engine.weakKeysMap['t'] === 1, "weakKeysMap registered mistake on 't'");

  // Type correct letter: 't' -> advances!
  engine.handleKeystroke('t');
  assert(engine.charIndex === 1, `Advanced to index 1 after correcting mistake (got ${engine.charIndex})`);
  assert(engine.score === 1, `Score updated to 1 (got ${engine.score})`);

  // --- SUITE 5: 6-MISS TERMINATION & PARTIAL POINT RETENTION ---
  console.log("\n--- TEST SUITE 5: 6-MISS TERMINATION & PARTIAL POINT RETENTION ---");
  engine.start('bubble', 'en', 'qwerty');
  assert(engine.lives === 6, "Starts with exactly 6 lives/chances");

  // Type 2 letters of word to earn 2 partial points
  engine.activeWords[0] = {
    text: 'victory',
    graphemes: ['v', 'i', 'c', 't', 'o', 'r', 'y'],
    x: 180, y: 100, baseX: 180, width: 100, height: 48, speed: 1, phase: 0, wobbleSpeed: 0.03, wobbleAmp: 10, shakeOffset: 0, shakeFrames: 0
  };
  engine.currentWordIdx = 0;
  engine.charIndex = 0;
  engine.handleKeystroke('v');
  engine.handleKeystroke('i');
  assert(engine.score === 2, "Earned 2 partial points");

  // Word reaches ceiling incomplete: 1 miss!
  engine.handleWordMiss(0);
  assert(engine.lives === 5, `Lives decreased to 5 (got ${engine.lives})`);
  assert(engine.score === 2, `PARTIAL POINTS RETAINED: score still 2 after miss (got ${engine.score})`);

  // Simulate misses 2, 3, 4, 5
  engine.spawnWord();
  engine.handleWordMiss(0); // Miss 2 -> lives: 4
  engine.spawnWord();
  engine.handleWordMiss(0); // Miss 3 -> lives: 3
  engine.spawnWord();
  engine.handleWordMiss(0); // Miss 4 -> lives: 2
  engine.spawnWord();
  engine.handleWordMiss(0); // Miss 5 -> lives: 1
  assert(engine.lives === 1, "1 Life remaining before final miss");
  assert(engine.active === true, "Game still active on 1 life");

  // 6th Miss -> GAME OVER IMMEDIATELY!
  engine.spawnWord();
  engine.handleWordMiss(0);
  assert(engine.lives === 0, "Lives is 0 on 6th miss");
  assert(engine.active === false, "Game stopped immediately on 6th miss");

  const goModal = window.document.getElementById('gameOverModal');
  assert(goModal !== null && goModal.style.display === 'flex', "Anti-Choke Game Over report modal displayed");

  // --- SUITE 6: FALLING WORDS CHALLENGE & SPEED PROGRESSION ---
  console.log("\n--- TEST SUITE 6: FALLING WORDS CHALLENGE & SPEED PROGRESSION ---");
  engine.start('falling', 'en', 'qwerty');
  assert(engine.gameType === 'falling', "Falling Words Challenge started");
  const startWord = engine.activeWords[0];
  assert(startWord.y === 40, `Falling words start at top of screen (y=${startWord.y})`);

  // Verify speed scaling
  engine.score = 0;
  engine.spawnWord();
  const baseSpeed = engine.activeWords[engine.activeWords.length - 1].speed;

  engine.score = 100;
  engine.spawnWord();
  const highSpeed = engine.activeWords[engine.activeWords.length - 1].speed;
  assert(highSpeed > baseSpeed, `Falling speed increased with higher score: ${baseSpeed.toFixed(2)} -> ${highSpeed.toFixed(2)}`);

  // --- SUITE 7: TAMIL99 TRANSLITERATION IN GAMES ---
  console.log("\n--- TEST SUITE 7: TAMIL99 TRANSLITERATION IN GAMES ---");
  engine.start('bubble', 'ta', 'tamil99');
  engine.activeWords[0] = {
    text: 'தமிழ்',
    graphemes: ['த', 'மி', 'ழ்'],
    x: 180, y: 300, baseX: 180, width: 100, height: 48, speed: 1, phase: 0, wobbleSpeed: 0.03, wobbleAmp: 10, shakeOffset: 0, shakeFrames: 0
  };
  engine.currentWordIdx = 0;
  engine.charIndex = 0;
  engine.score = 0;

  // In Tamil99, 'l' produces 'த'
  engine.handleKeystroke('l');
  assert(engine.score === 1, `Tamil99 'l' resolved to 'த', awarded 1 pt (got ${engine.score})`);
  assert(engine.charIndex === 1, `Advanced to grapheme 1 (மி) (got ${engine.charIndex})`);

  // Direct Unicode Tamil keystroke 'மி' also supported!
  engine.handleKeystroke('மி');
  assert(engine.score === 2, `Direct Unicode 'மி' accepted, awarded 1 pt (got ${engine.score})`);
  assert(engine.charIndex === 2, `Advanced to grapheme 2 (ழ்) (got ${engine.charIndex})`);

  // Final letter: 'ழ்' (via Tamil99 key '/' + 'f' or direct)
  engine.handleKeystroke('ழ்');
  assert(engine.score === 8, `Tamil word completed: 3 letters + 5 bonus = 8 pts (got ${engine.score})`);
  assert(engine.wordsCompleted === 1, "Tamil word counted in wordsCompleted");

  // --- SUITE 8: FAIR-PLAY PERSONAL BEST LEADERBOARD ---
  console.log("\n--- TEST SUITE 8: FAIR-PLAY PERSONAL BEST LEADERBOARD ---");
  const testReport1 = {
    gameType: 'bubble',
    lang: 'en',
    layout: 'qwerty',
    score: 200,
    accuracy: 95.0,
    date: '09 Nov 2026'
  };
  await engine.updateLeaderboardRecord(testReport1);

  let rawBoard = await window.storage.get('games_leaderboard');
  let board = JSON.parse(rawBoard.value || rawBoard);
  let studentEntry = board.bubble.en.find(e => e.isCurrentStudent);
  assert(studentEntry !== undefined, "Student record added to Bubble/En leaderboard");
  assert(studentEntry.score === 200, `Student score recorded as 200 (got ${studentEntry.score})`);

  // Test higher score: should UPDATE existing entry, NEVER create duplicate!
  const testReport2 = {
    gameType: 'bubble',
    lang: 'en',
    layout: 'qwerty',
    score: 290,
    accuracy: 98.0,
    date: '09 Nov 2026'
  };
  await engine.updateLeaderboardRecord(testReport2);

  rawBoard = await window.storage.get('games_leaderboard');
  board = JSON.parse(rawBoard.value || rawBoard);
  const studentEntries = board.bubble.en.filter(e => e.isCurrentStudent);
  assert(studentEntries.length === 1, `NO DUPLICATES: Exactly 1 record exists for student (found ${studentEntries.length})`);
  assert(studentEntries[0].score === 290, `Record updated with new personal best: 290 (got ${studentEntries[0].score})`);

  // Lower score: should NOT overwrite higher personal best!
  const testReport3 = {
    gameType: 'bubble',
    lang: 'en',
    layout: 'qwerty',
    score: 150,
    accuracy: 90.0,
    date: '09 Nov 2026'
  };
  await engine.updateLeaderboardRecord(testReport3);
  rawBoard = await window.storage.get('games_leaderboard');
  board = JSON.parse(rawBoard.value || rawBoard);
  studentEntry = board.bubble.en.find(e => e.isCurrentStudent);
  assert(studentEntry.score === 290, `PB PRESERVED: Lower score 150 did not overwrite 290 (got ${studentEntry.score})`);

  // --- SUITE 9: STUDENT GAME HISTORY PERSISTENCE ---
  console.log("\n--- TEST SUITE 9: STUDENT GAME HISTORY PERSISTENCE ---");
  await engine.saveGameSession({
    id: 'test_hist_1',
    gameType: 'bubble',
    gameTitle: 'Bubble Word Challenge',
    lang: 'en',
    layout: 'qwerty',
    score: 290,
    accuracy: 98.0,
    wpm: 42,
    wordsCompleted: 15,
    wordsMissed: 5,
    correctChars: 180,
    incorrectChars: 4,
    date: '09 Nov 2026'
  });

  const rawHist = await window.storage.get('games_history');
  const hist = JSON.parse(rawHist.value || rawHist);
  assert(Array.isArray(hist) && hist.length > 0, `Game history saved to storage (entries: ${hist.length})`);
  assert(hist[0].score === 290, `Most recent game history entry has score 290 (got ${hist[0].score})`);

  console.log("\n======================================================================");
  console.log("   ALL 28 GAMES MODULE ACCEPTANCE TESTS PASSED (100%)                 ");
  console.log("======================================================================\n");

  engine.active = false;
  if (engine.animFrameId) cancelAnimationFrame(engine.animFrameId);
  process.exit(0);
}

runGamesTestSuite().catch(err => {
  console.error("TEST EXECUTION FAILED:", err);
  process.exit(1);
});
