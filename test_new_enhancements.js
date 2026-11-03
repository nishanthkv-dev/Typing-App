const fs = require('fs');
const { JSDOM } = require('jsdom');

console.log("======================================================================");
console.log("   NEW ENHANCEMENTS UNIT & REGRESSION TEST SUITE                      ");
console.log("======================================================================\n");

const html = fs.readFileSync('www/index.html', 'utf8');

async function runTests() {
  const dom = new JSDOM(html, {
    runScripts: "dangerously",
    url: "https://localhost/"
  });

  const { window } = dom;
  const { document } = window;

  // Mock storage
  const mockStorage = {};
  window.storage = {
    get: async (k) => mockStorage[k] || null,
    set: async (k, v) => { mockStorage[k] = v; return true; },
    remove: async (k) => { delete mockStorage[k]; return true; }
  };
  window.AudioEngine = { play: () => {}, init: () => {} };
  window.requestAnimationFrame = (cb) => setTimeout(cb, 0);

  let passed = 0;
  let failed = 0;
  function check(cond, desc) {
    if (cond) {
      console.log(`  [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${desc}`);
      failed++;
    }
  }

  // 1. Bottom Nav Strict Single Active State
  console.log("\n--- TEST: Bottom Navigation Strict Single-Active State ---");
  window.switchTab('speed');
  let activeTabs = document.querySelectorAll('.nav-tab-item.active');
  check(activeTabs.length === 1 && activeTabs[0].id === 'btnTabSpeed', "Only Studio button is active after switchTab('speed')");

  window.switchTab('progress');
  activeTabs = document.querySelectorAll('.nav-tab-item.active');
  check(activeTabs.length === 1 && activeTabs[0].id === 'btnTabProgress', "Only Analytics button is active after switchTab('progress') (previous returned to default)");

  window.switchTab('profile');
  activeTabs = document.querySelectorAll('.nav-tab-item.active');
  check(activeTabs.length === 1 && activeTabs[0].id === 'btnTabProfile', "Only Profile button is active after switchTab('profile')");

  // 2. Real Daily Streak (No static/dummy data)
  console.log("\n--- TEST: Streak Tracking (Real User Data Only) ---");
  const hdrStreak = document.getElementById('hdrStreakVal');
  const homeStreak = document.getElementById('homeStreakBadge');
  check(hdrStreak && hdrStreak.textContent === '0', "Header streak starts at 0 for fresh user (no static 7d)");
  check(homeStreak && homeStreak.textContent.includes('0 days streak'), "Home streak badge displays 0 days streak");

  // 3. Theme Settings (Light / Dark Mode with Persistence)
  console.log("\n--- TEST: Theme Switching & Persistence ---");
  window.setAppTheme('dark');
  check(document.body.getAttribute('data-theme') === 'dark', "Body data-theme set to 'dark'");
  check(window.localStorage.getItem('app_theme') === 'dark', "localStorage persisted app_theme='dark'");
  check(document.getElementById('lblThemeBadge').textContent === 'Dark', "Theme badge updated to 'Dark'");

  window.setAppTheme('white');
  check(document.body.getAttribute('data-theme') === 'white', "Body data-theme restored to 'white'");
  check(window.localStorage.getItem('app_theme') === 'white', "localStorage persisted app_theme='white'");
  check(document.getElementById('lblThemeBadge').textContent === 'Light', "Theme badge updated to 'Light'");

  // 4. Exam Preparation Options
  console.log("\n--- TEST: Government Exam Options & Time Period ---");
  const examCourseSel = document.getElementById('profExamCourse');
  const examPeriodSel = document.getElementById('profExamPeriod');
  check(examCourseSel !== null, "profExamCourse dropdown exists");
  check(examPeriodSel !== null, "profExamPeriod dropdown exists");

  // Check 4 exam options
  const courseOptions = Array.from(examCourseSel.options).map(o => o.value);
  check(courseOptions.includes('typing_both') &&
        courseOptions.includes('typing_tamil') &&
        courseOptions.includes('typing_english') &&
        courseOptions.includes('coa_both'),
        "Exam Course has all 4 required options (Tamil 100m, English 100m, Both 100m, COA 50m)");

  // Check 3 exam period options
  const periodOptions = Array.from(examPeriodSel.options).map(o => o.value);
  check(periodOptions.includes('November 2026') &&
        periodOptions.includes('June 2027') &&
        periodOptions.includes('November 2027'),
        "Exam Period has all 3 required options (November 2026, June 2027, November 2027)");

  // Test COA exam sync (50 marks)
  examCourseSel.value = 'coa_both';
  window.syncExamCourseWithConfig();
  check(window.CFG.category === 'coa' && window.CFG.totalMarks === 50, "COA exam configured with 50 marks");

  // Test Typing exam sync (100 marks)
  examCourseSel.value = 'typing_tamil';
  window.syncExamCourseWithConfig();
  check(window.CFG.category === 'typing' && window.CFG.totalMarks === 100, "Tamil typing exam configured with 100 marks");

  // 5. Typing Text Size Scale Up to 35px
  console.log("\n--- TEST: Text Size Scale up to 35px ---");
  const textSizeSel = document.getElementById('ddTextSize');
  check(textSizeSel !== null, "Text size select exists");
  const sizeOptions = Array.from(textSizeSel.options).map(o => parseInt(o.value, 10));
  check(Math.max(...sizeOptions) === 35, `Max text size option is 35px (found options: ${sizeOptions.join(', ')})`);

  textSizeSel.value = '35';
  textSizeSel.dispatchEvent(new window.Event('change'));
  check(document.documentElement.style.getPropertyValue('--typesize') === '35px', "--typesize CSS variable successfully updated to 35px");

  // 6. Analytics Page: Q&A History, Sorting, Filtering & Mistake Analysis
  console.log("\n--- TEST: Analytics Page Q&A History, Sorting & Mistake Analysis ---");
  // Simulate a test result with question and answer
  const mockResult = {
    grossWpm: 42,
    netWpm: 38,
    marks: 95,
    accuracy: 94,
    passed: true,
    errors: 3,
    ops: [
      { type: 'match', orig: 'Hello', typed: 'Hello' },
      { type: 'sub', orig: 'world', typed: 'worlb' }
    ]
  };
  window.passageText = "Hello world of typing.";
  window.TA = { value: "Hello worlb of typing." };
  window.CFG.lang = 'en';
  window.CFG.layout = 'typewriter';

  await window.saveResult(mockResult);

  const stored = JSON.parse(await window.storage.get('recent-results'));
  check(stored.length === 1, "Result successfully saved to history");
  check(stored[0].questionText === "Hello world of typing.", "Original question passage text saved in record");
  check(stored[0].typedText === "Hello worlb of typing.", "Student typed text saved in record");
  check(stored[0].weakKeys && stored[0].weakKeys['d'] === 1, "Mistake key 'd' tracked in weakKeys");

  // Test Analytics Page Rendering
  window.renderAnalyticsPage();
  const anAvgSpeed = document.getElementById('anAvgSpeed');
  const anPeakSpeed = document.getElementById('anPeakSpeed');
  check(anAvgSpeed && anAvgSpeed.textContent === '38', `Analytics Average Speed calculated: ${anAvgSpeed ? anAvgSpeed.textContent : 'none'}`);
  check(anPeakSpeed && anPeakSpeed.textContent === '38', `Analytics Peak Speed calculated: ${anPeakSpeed ? anPeakSpeed.textContent : 'none'}`);

  const histContainer = document.getElementById('analyticsListContainer');
  check(histContainer && histContainer.innerHTML.includes('Exam Question / Reference Passage'), "Analytics list contains Question section");
  check(histContainer && histContainer.innerHTML.includes('Student Answer Typed'), "Analytics list contains Answer section");

  // Test Home Frequent Mistakes Container
  const weakContainer = document.getElementById('homeWeakKeysContainer');
  check(weakContainer && weakContainer.innerHTML.includes('mistake'), "Home page frequent mistakes container shows mistake chip");

  // 7. App Usage Time Tracker
  console.log("\n--- TEST: App Usage Time Tracking ---");
  const homeUsageTotal = document.getElementById('homeUsageTotal');
  const homeUsageToday = document.getElementById('homeUsageToday');
  check(homeUsageTotal !== null && homeUsageToday !== null, "Total and today app usage elements exist in DOM");

  console.log("\n======================================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("======================================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch(e => {
  console.error("Test error:", e);
  process.exit(1);
});
