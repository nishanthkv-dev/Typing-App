/**
 * TYPING THALAIVA — GAMES, KEYMAP & DRILLS OVERHAUL TEST SUITE
 * Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  [FAIL] ${message}`);
    failed++;
    throw new Error(`Assertion failed: ${message}`);
  }
}

async function runTestSuite() {
  console.log("======================================================================");
  console.log("   TYPING THALAIVA — GAMES, KEYMAP & DRILLS OVERHAUL TEST SUITE       ");
  console.log("======================================================================\n");

  const indexPath = path.join(__dirname, 'www', 'index.html');
  const indexHtml = fs.readFileSync(indexPath, 'utf8');

  // Virtual Canvas Mock
  function CanvasMock() {
    return {
      getContext: () => ({
        fillRect: () => {},
        clearRect: () => {},
        beginPath: () => {},
        arc: () => {},
        fill: () => {},
        stroke: () => {},
        moveTo: () => {},
        lineTo: () => {},
        save: () => {},
        restore: () => {},
        measureText: (txt) => ({ width: (txt || '').length * 10 }),
        fillText: () => {},
        createLinearGradient: () => ({ addColorStop: () => {} }),
        drawImage: () => {},
        setLineDash: () => {},
        roundRect: () => {}
      }),
      width: 400,
      height: 600,
      getBoundingClientRect: () => ({ width: 400, height: 600, top: 0, left: 0 })
    };
  }

  const dom = new JSDOM(indexHtml, {
    runScripts: "dangerously",
    resources: "usable",
    url: "file://" + path.join(__dirname, 'www', 'index.html')
  });

  const { window } = dom;

  // Polyfills for JSDOM
  window.HTMLCanvasElement.prototype.getContext = CanvasMock().getContext;
  window.requestAnimationFrame = (cb) => setTimeout(cb, 16);
  window.cancelAnimationFrame = (id) => clearTimeout(id);
  window.AudioContext = function() {
    return {
      state: 'running',
      currentTime: 0,
      createOscillator: () => ({
        connect: () => {},
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, linearRampToValueAtTime: () => {} },
        start: () => {},
        stop: () => {}
      }),
      createGain: () => ({
        connect: () => {},
        gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }
      }),
      destination: {}
    };
  };

  // Wait for scripts to execute
  await new Promise(r => setTimeout(r, 600));

  // --- SUITE 1: GAME SOUND EFFECTS & SYNTHESIS ---
  console.log("--- TEST SUITE 1: GAME SOUND EFFECTS & SYNTHESIS ---");
  const engine = window.GamesEngine;
  assert(typeof engine === 'object' && engine !== null, "GamesEngine is initialized on window");
  assert(typeof engine.playSound === 'function', "engine.playSound is exported as a callable function");

  let soundThrew = false;
  try {
    engine.playSound('hit');
    engine.playSound('pop');
    engine.playSound('type');
    engine.playSound('error');
    engine.playSound('wrong');
    engine.playSound('mistake');
    engine.playSound('bonus');
    engine.playSound('miss');
  } catch (e) {
    soundThrew = true;
  }
  assert(!soundThrew, "All sound effect triggers (hit, pop, type, error, bonus, miss) execute without error");

  const initialSoundState = engine.soundEnabled;
  const toggledState = engine.toggleSound();
  assert(toggledState === !initialSoundState, "toggleSound() toggles soundEnabled boolean properly");
  engine.toggleSound(); // restore

  // --- SUITE 2: BUBBLE WORD CHALLENGE SPAWNING & CONCURRENCY ---
  console.log("\n--- TEST SUITE 2: BUBBLE WORD CHALLENGE SPAWNING & MULTI-BUBBLE MATCHING ---");
  engine.start('bubble', 'en', 'qwerty');
  assert(engine.gameType === 'bubble', "Bubble Word Challenge started");
  assert(engine.activeWords.length >= 1, "At least 1 bubble spawned on game start");

  // Check lane assignment
  const firstBubble = engine.activeWords[0];
  assert(firstBubble.lane !== undefined && firstBubble.lane >= 0 && firstBubble.lane < 4, `First bubble assigned to a valid lane (lane: ${firstBubble.lane})`);

  // Progressive speed check
  const speedAtStart = engine.getSpeedForWord();
  assert(speedAtStart >= 0.40 && speedAtStart <= 0.60, `Bubble starts slow and student-friendly (speed: ${speedAtStart} px/frame)`);

  // Multi-bubble concurrent spawning
  engine.spawnWord();
  engine.spawnWord();
  assert(engine.activeWords.length <= 4, `Concurrent bubble capacity constrained to fair maximum (count: ${engine.activeWords.length})`);

  // Verify non-overlapping lanes
  const lanes = engine.activeWords.map(w => w.lane);
  const uniqueLanes = new Set(lanes);
  assert(uniqueLanes.size === lanes.length, `Bubbles spawned across independent non-overlapping lanes (lanes: ${lanes.join(', ')})`);

  // Multi-bubble letter targeting test
  // If user types the first letter of activeWords[1], engine locks onto that bubble
  if (engine.activeWords.length >= 2) {
    const targetWord2 = engine.activeWords[1];
    const letterToType = targetWord2.graphemes[0];
    const initialScore = engine.score;
    engine.handleKeystroke(letterToType);
    assert(engine.score === initialScore + 1, `Typing letter '${letterToType}' popped target bubble directly (score: ${engine.score})`);
  }

  // --- SUITE 3: FALLING WORDS ACCURACY & 1:1 WORD SYNC ---
  console.log("\n--- TEST SUITE 3: FALLING WORDS ACCURACY & SYNCHRONIZATION ---");
  engine.start('falling', 'en', 'qwerty');
  assert(engine.gameType === 'falling', "Falling Words Challenge started");
  assert(engine.activeWords.length === 1, "Falling words enforces strictly 1 active word falling in chute");
  const fallingWord = engine.activeWords[0];
  assert(fallingWord && fallingWord.text && fallingWord.graphemes.length > 0, `Falling word entity valid: '${fallingWord.text}'`);

  // --- SUITE 4: DOTE EXAMINATION BRANDING & EMBLEM ---
  console.log("\n--- TEST SUITE 4: DOTE EXAMINATION BRANDING & EMBLEM ---");
  const doteCards = window.document.querySelectorAll('.dote-prep-card, .dote-prep-pill');
  assert(doteCards.length >= 2, `DoTE examination preparation branding present across screens (found ${doteCards.length})`);

  const doteEmblemImg = window.document.querySelector('img[src="img/dote_emblem.png"]');
  assert(doteEmblemImg !== null, "Official DoTE emblem image element (img/dote_emblem.png) rendered");

  const brandText = window.document.body.textContent;
  const officialStatement = "Specially designed for DOT Typewriting Examination preparation — practice smarter";
  assert(brandText.includes(officialStatement), "Official DoTE preparation purpose statement embedded");

  // --- SUITE 5: INTERACTIVE KEYBOARD KEY MAP MODAL ---
  console.log("\n--- TEST SUITE 5: INTERACTIVE KEYBOARD KEY MAP MODAL ---");
  const modalKeyMap = window.document.getElementById('modalKeyMap');
  assert(modalKeyMap !== null, "#modalKeyMap modal element exists in DOM");

  assert(typeof window.openKeyMapModal === 'function', "openKeyMapModal is exported to window");
  assert(typeof window.closeKeyMapModal === 'function', "closeKeyMapModal is exported to window");
  assert(typeof window.switchKeyMapTab === 'function', "switchKeyMapTab is exported to window");
  assert(typeof window.onKeyMapSearch === 'function', "onKeyMapSearch is exported to window");

  window.openKeyMapModal('tamil99');
  assert(modalKeyMap.style.display === 'flex', "Key Map modal opened via openKeyMapModal('tamil99')");

  // Search lookup test
  window.onKeyMapSearch('க்');
  const searchResultsBody = window.document.getElementById('kmContentBody');
  assert(searchResultsBody && searchResultsBody.textContent.includes('h + f'), "Tamil99 character search for 'க்' resolves to 'h + f' (க + புள்ளி)");

  window.switchKeyMapTab('typewriter');
  window.onKeyMapSearch('க்');
  assert(searchResultsBody && searchResultsBody.textContent.includes('; + f'), "Typewriter search for 'க்' resolves to '; + f' (புள்ளி + க)");

  window.closeKeyMapModal();
  assert(modalKeyMap.style.display === 'none', "Key Map modal closed cleanly via closeKeyMapModal()");

  // --- SUITE 6: PRACTICE CURRICULUM SEPARATION & ADAPTIVE REINFORCEMENT ---
  console.log("\n--- TEST SUITE 6: PRACTICE CURRICULUM SEPARATION & DRILLS OVERHAUL ---");
  const PRAC = window.PRAC;
  assert(typeof PRAC === 'object' && PRAC !== null, "PRAC curriculum object exists");
  assert(Array.isArray(PRAC.tamil99) && PRAC.tamil99.length === 16, `PRAC.tamil99 contains exactly 16 comprehensive lessons (found ${PRAC.tamil99.length})`);
  assert(Array.isArray(PRAC.typewriter) && PRAC.typewriter.length === 16, `PRAC.typewriter contains exactly 16 comprehensive lessons (found ${PRAC.typewriter.length})`);
  assert(Array.isArray(PRAC.en) && PRAC.en.length === 16, `PRAC.en contains exactly 16 comprehensive lessons (found ${PRAC.en.length})`);
  assert(PRAC.ta === PRAC.tamil99, "PRAC.ta is aliased to PRAC.tamil99 for backwards compatibility");

  // Ensure NO single-line exercises exist
  let singleLineFound = false;
  ['tamil99', 'typewriter', 'en'].forEach(track => {
    PRAC[track].forEach((lesson, lIdx) => {
      const lineCount = (lesson.text.match(/\n/g) || []).length + 1;
      if (lineCount < 2) {
        singleLineFound = true;
        console.error(`  Single line found in track ${track} lesson ${lIdx + 1}`);
      }
    });
  });
  assert(!singleLineFound, "Zero single-line exercises: All 48 lessons across 3 tracks contain complete multi-line drills (4-8 lines)");

  // Adaptive Reinforcement Generator Test
  assert(typeof window.generateAdaptiveReinforcement === 'function', "generateAdaptiveReinforcement is exported");
  const reinforcementDrill = window.generateAdaptiveReinforcement('ta', 'tamil99', 2);
  assert(reinforcementDrill && reinforcementDrill.text && reinforcementDrill.text.includes('\n'), "generateAdaptiveReinforcement combines vocabulary into multi-line reinforcement drill");
  assert(reinforcementDrill.lesson.includes('Reinforcement'), `Reinforcement drill title formatted correctly (${reinforcementDrill.lesson})`);

  // Dynamic layout switching test
  window.setPracLang('ta');
  window.setPracLayout('typewriter');
  const activeTwLessons = window.getPracLessons();
  assert(activeTwLessons === PRAC.typewriter, "getPracLessons() dynamically switches to typewriter curriculum when layout changed to typewriter");

  window.setPracLayout('tamil99');
  const activeT99Lessons = window.getPracLessons();
  assert(activeT99Lessons === PRAC.tamil99, "getPracLessons() dynamically switches to Tamil99 curriculum when layout changed to tamil99");

  // Completion modal test
  const modalComp = window.document.getElementById('modalPracComplete');
  assert(modalComp !== null, "#modalPracComplete modal exists in DOM");
  window.showPracCompleteModal();
  assert(modalComp.style.display === 'flex', "Practice Completion modal displayed on exercise completion");
  window.closePracCompleteModal();
  assert(modalComp.style.display === 'none', "Practice Completion modal closed cleanly");

  // --- SUITE 7: MOBILE HEADER LAYOUT & TYPOGRAPHY ---
  console.log("\n--- TEST SUITE 7: MOBILE HEADER LAYOUT & TYPOGRAPHY ---");
  const brandTitle = window.document.querySelector('.brand-text h1');
  assert(brandTitle !== null, ".brand-text h1 exists");
  assert(brandTitle.textContent.includes('Typing') && brandTitle.textContent.includes('Thalaiva'), "Brand title contains 'Typing Thalaiva'");

  console.log("\n======================================================================");
  console.log(`   TEST EXECUTION COMPLETE: ${passed} TESTS RUN`);
  console.log(`   PASSED: ${passed} | FAILED: ${failed}`);
  console.log("======================================================================\n");

  process.exit(failed === 0 ? 0 : 1);
}

runTestSuite().catch(err => {
  console.error("TEST EXECUTION FAILED:", err);
  process.exit(1);
});
