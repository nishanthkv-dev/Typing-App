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
  // 2. FALLING WORD GAME — BEGINNER SLOW SPEED & SUSTAINED ADAPTATION
  // =====================================================================
  console.log("\n--- 2. FALLING WORD GAME (SLOW BEGINNER SPEED & WORD FLOW) ---");
  engine.start('falling', 'en', 'qwerty');
  assert(engine.gameType === 'falling', "Falling game started");
  assert(engine.activeWords.length === 1, "Strictly 1 falling word on screen (zero overlap / bunching)");

  // Synchronized target
  const fallingWord = engine.activeWords[0];
  assert(fallingWord !== undefined, "Active falling word exists");
  assert(engine.currentWordIdx === 0, "currentWordIdx is locked to 0 for falling mode");

  // Beginner-friendly slow baseline speed verification
  const initialSpeed = engine.adaptiveBaseSpeed;
  assert(initialSpeed >= 0.16 && initialSpeed <= 0.28, `Base speed is genuinely slow and beginner-friendly: ${initialSpeed}`);

  // Single clean word MUST NOT trigger sudden speed increase
  engine.charIndex = 0;
  engine.currentWordHadMistake = false;
  for (const char of fallingWord.graphemes) {
    engine.handleKeystroke(char);
  }
  const speedAfter1Word = engine.adaptiveBaseSpeed;
  assert(speedAfter1Word === initialSpeed, `1 clean word does not cause sudden speedup (${speedAfter1Word} === ${initialSpeed})`);

  // Sustained improvement (3 consecutive clean words with comfortable y-margin) increases speed VERY gradually
  for (let w = 0; w < 2; w++) {
    const wordObj = engine.activeWords[0];
    wordObj.y = 80; // comfortably high on screen
    for (const char of wordObj.graphemes) {
      engine.handleKeystroke(char);
    }
  }
  const speedAfterSustained = engine.adaptiveBaseSpeed;
  assert(speedAfterSustained > initialSpeed, `Speed increases gradually after 3 sustained clean words (${initialSpeed} -> ${speedAfterSustained})`);
  assert(speedAfterSustained - initialSpeed <= 0.025, `Speed increase is minimal and very gradual (${(speedAfterSustained - initialSpeed).toFixed(3)})`);

  // Repeated mistakes slow speed down smoothly to help student recover
  engine.handleKeystroke('!');
  engine.handleKeystroke('@');
  const speedAfterMistakes = engine.adaptiveBaseSpeed;
  assert(speedAfterMistakes < speedAfterSustained, `Speed eases down on repeated mistakes (${speedAfterSustained} -> ${speedAfterMistakes})`);

  // Word length compensation check
  const shortWordSpeed = engine.getSpeedForWord({ graphemes: ['c', 'a', 't'] });
  const longWordSpeed = engine.getSpeedForWord({ graphemes: ['c', 'h', 'a', 'm', 'p', 'i', 'o', 'n', 's'] });
  assert(longWordSpeed < shortWordSpeed, `Long words fall slower to allow sufficient typing time (long: ${longWordSpeed} vs short: ${shortWordSpeed})`);
  console.log("  [PASS] Falling Words starts slow, resists single-word spikes, adapts gradually on sustained improvement, and compensates for word length");

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
  // 6. DEDICATED RESULTS SCREEN, BACK BUTTON & NO MISSING WORDS IN WORD TYPING
  // =====================================================================
  console.log("\n--- 6. RESULTS SCREEN, BACK NAVIGATION, SUBMIT & WORD TYPING ---");
  engine.start('word_typing', 'en', 'qwerty');

  // Verify Missing Words UI is hidden in Word Typing Challenge
  const missedCluster = document.getElementById('gameMissedCluster');
  assert(missedCluster && missedCluster.style.display === 'none', "Missing Words HUD cluster is hidden in Word Typing Challenge");

  // Verify Submit button replaces Next/Cancel
  const btnSubmit = document.getElementById('btnGameSubmit');
  assert(btnSubmit !== null, "#btnGameSubmit exists in game HUD");
  assert(document.getElementById('btnGameNext') === null, "Old #btnGameNext button is removed");
  assert(document.getElementById('btnGameCancel') === null, "Old #btnGameCancel button is removed");

  // Simulate completing words cleanly and submitting
  engine.wordsCompleted = 32;
  engine.wordTypingIndex = 32;
  engine.wordsMissed = 3; // even if stale, word_typing must ignore/zero missing words
  engine.wordsCorrect = 30;
  engine.wordsIncorrect = 2;
  engine.keystrokeMistakes = 4;
  engine.correctChars = 140;
  engine.incorrectChars = 4;
  engine.score = 290;

  window.submitGame();
  // Calling submitGame a second time must be a safe no-op (duplicate guard)
  window.submitGame();

  const goModal = document.getElementById('gameOverModal');
  assert(goModal && goModal.style.display === 'flex', "Results modal displayed on Submit");

  const titleEl = document.getElementById('goGameTitle');
  assert(titleEl && titleEl.textContent.includes('Word Typing Challenge'), "Results title displays game name");

  const scoreEl = document.getElementById('goScoreValue');
  assert(scoreEl && scoreEl.textContent === '290', "Score displayed accurately");

  const wordsAttEl = document.getElementById('goWordsAttempted');
  assert(wordsAttEl && wordsAttEl.textContent === '32', `Total words attempted excludes missing words (got ${wordsAttEl.textContent})`);

  const wordsCorEl = document.getElementById('goWordsCorrect');
  assert(wordsCorEl && wordsCorEl.textContent === '30', `Correct words displayed (got ${wordsCorEl.textContent})`);

  const mistEl = document.getElementById('goKeystrokeMistakes');
  assert(mistEl && mistEl.textContent === '4', `Total keystroke mistakes displayed (got ${mistEl.textContent})`);

  const wordsClearedEl = document.getElementById('goWordsCleared');
  assert(wordsClearedEl && !wordsClearedEl.textContent.includes('Missed'), `Word Typing results contain no 'Missed' label: '${wordsClearedEl.textContent}'`);

  // Verify Exit button removed and replaced by Back button redirecting to Games Hub
  const btnBack = document.getElementById('btnGameResultBack');
  assert(btnBack !== null && btnBack.textContent.includes('Back'), "Result screen has Back button");
  assert(!goModal.textContent.includes('🏠 Exit'), "Old Exit button is removed from Result screen");

  window.backToGamesHub();
  assert(goModal.style.display === 'none', "Results modal closed on Back");
  assert(document.getElementById('screen-games-hub').classList.contains('active'), "Back button redirects to Games Module (#screen-games-hub)");

  // Verify Games Hub has Back to Dashboard button
  const btnBackDash = document.getElementById('btnGamesBackToDashboard');
  assert(btnBackDash !== null && btnBackDash.textContent.includes('Back to Dashboard'), "Games Hub retains Back to Dashboard button");

  // Verify zero-activity graceful Submit handling
  engine.start('falling', 'en', 'qwerty');
  assert(document.getElementById('gameMissedCluster').style.display === 'flex', "Missing Words HUD cluster remains visible in Falling Words");
  window.submitGame();
  assert(goModal.style.display === 'flex', "Zero-activity Submit displays graceful summary");
  assert(document.getElementById('goGameTitle').textContent.includes('No Typing Recorded'), "Graceful message shown for zero-typing session");
  assert(document.getElementById('goAccValue').textContent === '—', "Does not display misleading 100% accuracy for zero typing");
  window.backToGamesHub();

  // Verify crisp DoTE logo asset & Games Module visibility
  const doteStat = fs.statSync(path.join(__dirname, 'www', 'img', 'dote_emblem.png'));
  assert(doteStat.size > 20000, `DoTE emblem PNG is full high-res asset (${doteStat.size} bytes)`);
  assert(document.getElementById('gamesHubDoteLogo') !== null, "DoTE emblem rendered in Games Hub");
  assert(document.getElementById('gameTopDoteLogo') !== null, "DoTE emblem rendered in Game Screen top bar");

  console.log("  [PASS] Submit, Back->Hub->Dashboard flow, Word Typing (no missing words), zero-activity guard, and DoTE logo verified");

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
