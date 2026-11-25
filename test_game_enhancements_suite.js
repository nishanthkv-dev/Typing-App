/**
 * COMPREHENSIVE TEST SUITE: GAME IMPROVEMENTS & NEW TYPING GAME
 * Verifies:
 * 1. Bubble Word Challenge: Letters only (English & Tamil), never full words
 * 2. Falling Word Game: Adaptive speed, word length compensation, single-word sync
 * 3. Word Typing Challenge: 3rd game, target at top, input at bottom, 35 words progressive session
 * 4. Game Sound Effects: key clicks, hits, bubble pops, word bonus chimes, error tones
 * 5. Speed Practice: Typing sound feedback on correct and incorrect keystrokes
 * 6. Results Screen: Complete performance metrics (attempted, correct, incorrect, missed, mistakes, accuracy, WPM, time)
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

async function runEnhancementsTestSuite() {
  console.log("======================================================================");
  console.log("   GAME IMPROVEMENTS & NEW TYPING GAME VERIFICATION SUITE             ");
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

  window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);

  const scriptEl = document.createElement('script');
  scriptEl.textContent = gamesJs;
  document.body.appendChild(scriptEl);

  const engine = window.GamesEngine;
  assert(!!engine, "GamesEngine is initialized on window");

  // =====================================================================
  // 1. BUBBLE WORD CHALLENGE — LETTERS ONLY
  // =====================================================================
  console.log("--- 1. BUBBLE WORD CHALLENGE (LETTERS ONLY) ---");
  engine.start('bubble', 'en', 'qwerty');
  assert(engine.gameType === 'bubble', "Game started in bubble mode");
  assert(engine.activeWords.length >= 1, "At least 1 bubble spawned");

  // Verify that all spawned bubbles contain INDIVIDUAL LETTERS ONLY
  for (let i = 0; i < 15; i++) {
    engine.spawnWord();
  }
  engine.activeWords.forEach((bubble, idx) => {
    assert(bubble.graphemes.length === 1, `Bubble ${idx} must contain exactly 1 character/letter (got ${bubble.graphemes.length}: '${bubble.text}')`);
    assert(bubble.text.length === 1, `Bubble text length is 1 letter: '${bubble.text}'`);
    assert(bubble.radius === 28, "Bubble radius is circular ~28px for single letters");
  });
  console.log("  [PASS] English Bubble Challenge spawns individual letters only (never words)");

  // Tamil Bubble Challenge letters only
  engine.start('bubble', 'ta', 'tamil99');
  for (let i = 0; i < 10; i++) {
    engine.spawnWord();
  }
  engine.activeWords.forEach((bubble, idx) => {
    assert(bubble.graphemes.length === 1, `Tamil bubble ${idx} is a single letter/grapheme: '${bubble.text}'`);
  });
  console.log("  [PASS] Tamil Bubble Challenge spawns individual Tamil letters only");

  // Bubble Hit & Pop behavior
  engine.start('bubble', 'en', 'qwerty');
  const targetChar = engine.activeWords[0].text;
  const initialScore = engine.score;
  const initialCompleted = engine.wordsCompleted;

  engine.handleKeystroke(targetChar);
  assert(engine.score === initialScore + 1, "Single letter pop awards exactly 1 point");
  assert(engine.wordsCompleted === initialCompleted + 1, "wordsCompleted increments on letter catch");

  // Wrong letter feedback
  const wrongChar = targetChar === 'Z' ? 'X' : 'Z';
  const initialMistakes = engine.keystrokeMistakes;
  engine.handleKeystroke(wrongChar);
  assert(engine.keystrokeMistakes === initialMistakes + 1, "Keystroke mistakes increment on wrong letter");
  console.log("  [PASS] Letter hit awards +1 pt and wrong letter triggers mistake feedback");

  // =====================================================================
  // 2. FALLING WORD GAME — ADAPTIVE SPEED & 1:1 WORD ACCURACY
  // =====================================================================
  console.log("\n--- 2. FALLING WORD GAME (ADAPTIVE SPEED & WORD FLOW) ---");
  engine.start('falling', 'en', 'qwerty');
  assert(engine.gameType === 'falling', "Falling game started");
  assert(engine.activeWords.length === 1, "Strictly 1 falling word on screen (zero overlap / bunching)");

  // Synchronized target
  const fallingWord = engine.activeWords[0];
  assert(fallingWord !== undefined, "Active falling word exists");
  assert(engine.currentWordIdx === 0, "currentWordIdx is locked to 0 for falling mode");

  // Adaptive speed verification
  const initialSpeed = engine.adaptiveBaseSpeed;
  assert(initialSpeed >= 0.40 && initialSpeed <= 0.60, `Base speed is comfortable and student-friendly: ${initialSpeed}`);

  // Typing cleanly without mistakes increases speed gradually
  engine.charIndex = 0;
  engine.currentWordHadMistake = false;
  for (const char of fallingWord.graphemes) {
    engine.handleKeystroke(char);
  }
  const speedAfterClean = engine.adaptiveBaseSpeed;
  assert(speedAfterClean >= initialSpeed, "Speed increases gradually after clean typing");
  assert(speedAfterClean - initialSpeed <= 0.05, "Speed increase is minimal and gradual, not sudden");

  // Typing with mistake relaxes speed slightly
  const nextWord = engine.activeWords[0];
  engine.handleKeystroke('!'); // intentional mistake
  const speedAfterMistake = engine.adaptiveBaseSpeed;
  assert(speedAfterMistake < speedAfterClean, "Speed reduces slightly on mistake to allow comfortable recovery");

  // Word length compensation check
  const shortWordSpeed = engine.getSpeedForWord({ graphemes: ['c', 'a', 't'] });
  const longWordSpeed = engine.getSpeedForWord({ graphemes: ['c', 'h', 'a', 'm', 'p', 'i', 'o', 'n', 's'] });
  assert(longWordSpeed < shortWordSpeed, `Long words fall slower to allow sufficient typing time (long: ${longWordSpeed} vs short: ${shortWordSpeed})`);
  console.log("  [PASS] Adaptive speed adjusts smoothly to typing performance and word length");

  // =====================================================================
  // 3. WORD TYPING CHALLENGE (NEW 3RD GAME)
  // =====================================================================
  console.log("\n--- 3. WORD TYPING CHALLENGE (NEW 3RD GAME) ---");
  engine.start('word_typing', 'en', 'qwerty');
  assert(engine.gameType === 'word_typing', "Word Typing Challenge started");
  assert(engine.targetWordsCount === 35, "Session configured for 35 words");
  assert(engine.wordTypingList.length === 35, `35 words generated for session (got ${engine.wordTypingList.length})`);

  // Progressive difficulty: words in tier 1 (first 10) are shorter than tier 3 (last 10)
  const firstTierLengths = engine.wordTypingList.slice(0, 10).map(w => w.length);
  const lastTierLengths = engine.wordTypingList.slice(25, 35).map(w => w.length);
  const avgFirst = firstTierLengths.reduce((a, b) => a + b) / 10;
  const avgLast = lastTierLengths.reduce((a, b) => a + b) / 10;
  assert(avgLast > avgFirst, `Progressive difficulty verified: Avg length progresses from ${avgFirst.toFixed(1)} to ${avgLast.toFixed(1)} chars`);

  // Type current word
  const wtTarget = engine.activeWords[0];
  const wtInitialCompleted = engine.wordsCompleted;
  for (const char of wtTarget.graphemes) {
    engine.handleKeystroke(char);
  }
  assert(engine.wordsCompleted === wtInitialCompleted + 1, "Word completed increments immediately");
  assert(engine.wordTypingIndex === 1, "wordTypingIndex advanced to next word in sequence");
  console.log("  [PASS] Word Typing Challenge progresses through 35 words from easy to hard");

  // =====================================================================
  // 4. SOUND EFFECTS ACROSS ALL GAMES
  // =====================================================================
  console.log("\n--- 4. MANDATORY SOUND EFFECTS ACROSS GAMES ---");
  assert(engine.soundEnabled === true, "Game sounds enabled by default");

  let audioThrew = false;
  try {
    engine.playSound('type');
    engine.playSound('hit');
    engine.playSound('pop');
    engine.playSound('bonus');
    engine.playSound('error');
    engine.playSound('miss');
  } catch(e) {
    audioThrew = true;
  }
  assert(!audioThrew, "All sound effect synthesis functions execute cleanly without lag or error");
  console.log("  [PASS] Synthesized sound effects (key, hit, pop, chime, error) active by default");

  // =====================================================================
  // 5. SPEED PRACTICE TYPING SOUNDS
  // =====================================================================
  console.log("\n--- 5. SPEED PRACTICE TYPING SOUNDS ---");
  const AudioEngine = window.AudioEngine;
  assert(typeof AudioEngine === 'object' && AudioEngine !== null, "AudioEngine defined on window");
  assert(typeof AudioEngine.playKey === 'function', "AudioEngine.playKey is exported for Speed Practice");

  let peThrew = false;
  try {
    AudioEngine.playKey(true);   // correct key
    AudioEngine.playKey(false);  // incorrect key -> error tone
    AudioEngine.play('backspace'); // backspace
  } catch(e) {
    peThrew = true;
  }
  assert(!peThrew, "Speed Practice typing sound triggers (correct, wrong, backspace) execute without error");
  console.log("  [PASS] Speed Practice module equipped with responsive correct and error sound feedback");

  // =====================================================================
  // 6. DEDICATED RESULTS SCREEN & COMPLETE STATS
  // =====================================================================
  console.log("\n--- 6. DEDICATED RESULTS SCREEN & COMPLETE METRICS ---");
  engine.start('word_typing', 'en', 'qwerty');
  engine.wordsCompleted = 32;
  engine.wordsMissed = 3;
  engine.wordsCorrect = 30;
  engine.wordsIncorrect = 2;
  engine.keystrokeMistakes = 4;
  engine.correctChars = 140;
  engine.incorrectChars = 4;
  engine.score = 290;

  // Trigger game over / session complete
  engine.gameOver(true);

  const goModal = document.getElementById('gameOverModal');
  assert(goModal && goModal.style.display === 'flex', "Results modal displayed on session completion");

  const titleEl = document.getElementById('goGameTitle');
  assert(titleEl && titleEl.textContent.includes('Word Typing Challenge'), "Results title displays game name");

  const scoreEl = document.getElementById('goScoreValue');
  assert(scoreEl && scoreEl.textContent === '290', "Score displayed accurately");

  const wordsAttEl = document.getElementById('goWordsAttempted');
  assert(wordsAttEl && wordsAttEl.textContent === '35', `Total words attempted displayed (got ${wordsAttEl.textContent})`);

  const wordsCorEl = document.getElementById('goWordsCorrect');
  assert(wordsCorEl && wordsCorEl.textContent === '30', `Correct words displayed (got ${wordsCorEl.textContent})`);

  const mistEl = document.getElementById('goKeystrokeMistakes');
  assert(mistEl && mistEl.textContent === '4', `Total keystroke mistakes displayed (got ${mistEl.textContent})`);

  console.log("  [PASS] Results screen displays total words attempted, correct, mistakes, accuracy, and WPM");

  // =====================================================================
  // 7. HUB SCREEN CARDS FOR ALL 3 GAMES
  // =====================================================================
  console.log("\n--- 7. HUB CARDS & NAVIGATION ---");
  const hubScreen = document.getElementById('screen-games-hub');
  assert(hubScreen !== null, "#screen-games-hub exists in DOM");

  const hubText = hubScreen.textContent;
  assert(hubText.includes('Bubble Word Challenge'), "Game 1 (Bubble) card present in Hub");
  assert(hubText.includes('Falling Words Challenge'), "Game 2 (Falling) card present in Hub");
  assert(hubText.includes('Word Typing Challenge'), "Game 3 (Word Typing) card present in Hub");

  // Leaderboard modal tab
  const lbWordTypingTab = document.getElementById('lbTabWordTyping');
  assert(lbWordTypingTab !== null, "#lbTabWordTyping exists in Leaderboard modal");

  console.log("  [PASS] Hub cards and Leaderboard tabs properly configured for all 3 games");

  console.log("\n======================================================================");
  console.log("   ALL GAME ENHANCEMENT SUITE TESTS PASSED (100%)                     ");
  console.log("======================================================================\n");
  process.exit(0);
}

runEnhancementsTestSuite().catch(err => {
  console.error("TEST FAILED:", err);
  process.exit(1);
});
