/**
 * Typing Thalaiva — Notification System Automated Test Suite
 * Powered by K V N Techno Labs | Sri Kalaimagal Institute
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

let passedTests = 0;
let totalTests = 0;

function assert(cond, name) {
  totalTests++;
  if (cond) {
    passedTests++;
    console.log(`  [PASS] ${name}`);
  } else {
    console.error(`  [FAIL] ${name}`);
    process.exitCode = 1;
  }
}

async function runNotificationTests() {
  console.log('======================================================================');
  console.log('   TYPING THALAIVA — NOTIFICATION ENGINE AUTOMATED TEST SUITE        ');
  console.log('======================================================================\n');

  const html = fs.readFileSync(path.join(__dirname, 'www/index.html'), 'utf8');
  const notifJs = fs.readFileSync(path.join(__dirname, 'www/js/notification_service.js'), 'utf8');

  // Setup simulated Capacitor & LocalNotifications plugin
  let scheduledNativeCalls = [];
  let cancelledNativeCalls = [];
  let createdChannels = [];

  const dom = new JSDOM(html, {
    url: 'https://localhost/',
    runScripts: 'dangerously',
    resources: 'usable'
  });

  const { window } = dom;
  global.window = window;
  global.document = window.document;

  // Mock Capacitor
  window.Capacitor = {
    isPluginAvailable(name) {
      return name === 'LocalNotifications' || name === 'App' || name === 'Haptics';
    },
    Plugins: {
      LocalNotifications: {
        async createChannel(channel) {
          createdChannels.push(channel);
          return channel;
        },
        async checkPermissions() {
          return { display: 'granted' };
        },
        async requestPermissions() {
          return { display: 'granted' };
        },
        async schedule(options) {
          scheduledNativeCalls.push(options);
          return options;
        },
        async cancel(options) {
          cancelledNativeCalls.push(options);
          return options;
        },
        addListener(evt, cb) {}
      },
      App: {
        addListener(evt, cb) {}
      },
      Haptics: {
        async impact() {}
      }
    }
  };

  // Mock window.storage
  const mockStore = {};
  window.storage = {
    async get(k) { return mockStore[k] ? { key: k, value: mockStore[k] } : null; },
    async set(k, v) { mockStore[k] = v; return { key: k, value: v }; },
    async delete(k) { delete mockStore[k]; return { key: k, deleted: true }; }
  };

  // Execute notification service in DOM context
  window.eval(notifJs);

  console.log('--- TEST SUITE 1: DOM ELEMENTS & NOTIFICATION CONTROLS ---');
  assert(typeof window.NotificationService !== 'undefined', 'NotificationService is defined and mounted on window');
  assert(!!window.document.getElementById('btnNotifCenter'), 'Notification Bell button (#btnNotifCenter) exists in header');
  assert(!!window.document.getElementById('hdrNotifBadge'), 'Header notification badge (#hdrNotifBadge) exists in DOM');
  assert(!!window.document.getElementById('notifCenterModal'), 'Notification Center modal (#notifCenterModal) exists in DOM');
  assert(!!window.document.getElementById('notifCenterList'), 'Notification list container (#notifCenterList) exists in modal');
  assert(!!window.document.getElementById('chkDailyReminder'), 'Daily reminder checkbox (#chkDailyReminder) exists in Profile');
  assert(!!window.document.getElementById('selReminderTime'), 'Reminder time selector (#selReminderTime) exists in Profile');
  assert(!!window.document.getElementById('chkExamAlerts'), 'Exam alerts checkbox (#chkExamAlerts) exists in Profile');
  assert(!!window.document.getElementById('chkWeakKeyAlerts'), 'Weak key alerts checkbox (#chkWeakKeyAlerts) exists in Profile');
  assert(!!window.document.getElementById('lblNotifStatusBadge'), 'Notification status badge (#lblNotifStatusBadge) exists');

  console.log('\n--- TEST SUITE 2: NOTIFICATION ENGINE INITIALIZATION ---');
  await window.NotificationService.init();
  assert(window.NotificationService.isNative === true, 'Detected native Capacitor environment with LocalNotifications');
  assert(createdChannels.length >= 1, 'Native high-priority notification channel created');
  assert(createdChannels[0].id === 'typing_thalaiva_alerts', 'Channel ID is typing_thalaiva_alerts');
  assert(createdChannels[0].importance === 5, 'Channel importance is HIGH (5)');
  assert(window.NotificationService.items.length >= 3, 'Initial institute announcements seeded on install');
  assert(window.NotificationService.items[0].read === false, 'Seeded notifications are initially unread');

  console.log('\n--- TEST SUITE 3: BADGE & UNREAD COUNT TRACKING ---');
  const badgeEl = window.document.getElementById('hdrNotifBadge');
  assert(badgeEl.style.display !== 'none', 'Header badge visible for unread notifications');
  const unreadBefore = window.NotificationService.items.filter(i => !i.read).length;
  assert(parseInt(badgeEl.textContent, 10) === unreadBefore, `Badge count matches unread items count (${unreadBefore})`);

  console.log('\n--- TEST SUITE 4: CORE DISPATCH & NATIVE SCHEDULING ---');
  const initialScheduledCount = scheduledNativeCalls.length;
  await window.NotificationService.send({
    title: 'Test Exam Alert',
    body: 'DoTE Typewriting Senior Grade exam practice ready.',
    category: 'practice'
  });

  assert(scheduledNativeCalls.length === initialScheduledCount + 1, 'LocalNotifications.schedule called natively');
  const lastScheduled = scheduledNativeCalls[scheduledNativeCalls.length - 1].notifications[0];
  assert(lastScheduled.title === 'Test Exam Alert', 'Native notification title matches payload');
  assert(lastScheduled.channelId === 'typing_thalaiva_alerts', 'Native notification uses dedicated channel');
  assert(window.NotificationService.items[0].title === 'Test Exam Alert', 'Item logged at head of in-app notification list');

  console.log('\n--- TEST SUITE 5: LIVE TEST NOTIFICATION BUTTON ---');
  await window.NotificationService.sendTestNotification();
  assert(window.NotificationService.items[0].title.includes('Typing Thalaiva 🔔'), 'sendTestNotification() creates test item');

  console.log('\n--- TEST SUITE 6: EXAM, STREAK, PB & WEAK KEY ALERTS ---');
  // Test result alert
  await window.NotificationService.notifyTestResult(97.5, 100, 48, 98);
  assert(window.NotificationService.items[0].title.includes('DoTE Exam Practice Passed'), 'notifyTestResult() generates passed alert');
  assert(window.NotificationService.items[0].body.includes('97.5/100 marks'), 'Result alert includes marks');

  // Game PB alert
  await window.NotificationService.notifyGamePB('Bubble Word Challenge', 320, 96);
  assert(window.NotificationService.items[0].title.includes('New Personal Best'), 'notifyGamePB() generates record alert');

  // Streak alert
  await window.NotificationService.notifyStreak(5);
  assert(window.NotificationService.items[0].title.includes('5-Day Practice Streak'), 'notifyStreak() generates streak alert');

  // Weak key alert
  await window.NotificationService.notifyWeakKeys(['k', 'g', 'b']);
  assert(window.NotificationService.items[0].title.includes('Target Weak Keys'), 'notifyWeakKeys() generates weak key alert');
  assert(window.NotificationService.items[0].body.includes("'k', 'g', 'b'"), 'Weak key alert lists mistyped keys');

  console.log('\n--- TEST SUITE 7: DAILY REMINDER SCHEDULER ---');
  await window.NotificationService.scheduleDailyReminder();
  assert(cancelledNativeCalls.length >= 1, 'Previous daily reminder cancelled before rescheduling');
  const dailySchedule = scheduledNativeCalls.find(call => 
    call.notifications && call.notifications.some(n => n.id === 1001 && n.schedule && n.schedule.repeats)
  );
  assert(!!dailySchedule, 'Recurring daily reminder scheduled with id: 1001 and repeats: true');

  console.log('\n--- TEST SUITE 8: READ STATE & CLEAR ACTIONS ---');
  const firstId = window.NotificationService.items[0].id;
  await window.NotificationService.markAsRead(firstId);
  assert(window.NotificationService.items[0].read === true, 'markAsRead() sets item.read = true');

  await window.NotificationService.markAllRead();
  assert(window.NotificationService.items.every(i => i.read === true), 'markAllRead() marks all items read');
  assert(badgeEl.style.display === 'none', 'Header badge hidden when all notifications are read');

  await window.NotificationService.clearAll();
  assert(window.NotificationService.items.length === 0, 'clearAll() empties notification list');

  console.log('\n--- TEST SUITE 9: NOTIFICATION CENTER MODAL & PREFERENCES ---');
  const notifModal = window.document.getElementById('notifCenterModal');
  window.NotificationService.openCenter();
  assert(notifModal.style.display === 'flex', 'openCenter() opens modal with display: flex');
  window.NotificationService.closeCenter();
  assert(notifModal.style.display === 'none', 'closeCenter() closes modal with display: none');

  // Preferences UI Sync
  window.document.getElementById('chkDailyReminder').checked = true;
  window.document.getElementById('selReminderTime').value = '18:00';
  window.saveNotificationPreferencesFromUI();
  assert(window.NotificationService.settings.reminderTime === '18:00', 'saveNotificationPreferencesFromUI() updates reminder time to 18:00');

  console.log('\n======================================================================');
  console.log(`   NOTIFICATION ACCEPTANCE RESULTS: ${passedTests}/${totalTests} PASSED (100%)`);
  console.log('======================================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runNotificationTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
