/**
 * Typing Thalaiva — Notification Engine & Alert Service
 * Powered by K V N Techno Labs | Sri Kalaimagal Institute
 * 
 * Supports:
 *  - Native Android Local Notifications via @capacitor/local-notifications
 *  - High-priority notification channels (vibration, sound, badge)
 *  - Web Notification API fallback for browsers/desktop
 *  - In-App Notification Center & Floating Toast Alerts
 *  - Scheduled Daily Practice Reminders
 *  - Dynamic DoTE Exam, Streak & Result Milestone Alerts
 */

const NotificationService = {
  isNative: false,
  hasPermission: false,
  channelId: 'typing_thalaiva_alerts',
  
  settings: {
    enabled: true,
    reminderTime: '09:00', // 24-hr format HH:MM (legacy sync)
    reminderMorning: '09:00',
    reminderAfternoon: '14:00',
    reminderEvening: '20:00',
    examAlerts: true,
    streakAlerts: true,
    resultAlerts: true,
    weakKeyAlerts: true
  },
  
  items: [],
  activeFilter: 'all',

  /**
   * Initialize notification engine on app startup
   */
  async init() {
    try {
      // 1. Detect Capacitor environment
      this.isNative = !!(
        window.Capacitor &&
        window.Capacitor.isPluginAvailable &&
        window.Capacitor.isPluginAvailable('LocalNotifications')
      );

      // 2. Load stored settings & history
      await this.loadState();

      // 3. Setup Native Android Notification Channel
      if (this.isNative) {
        await this.setupNativeChannel();
        await this.checkNativePermission();
      } else if ('Notification' in window) {
        this.hasPermission = (Notification.permission === 'granted');
      }

      // 4. Seed initial institute announcements on fresh install
      if (!this.items || this.items.length === 0) {
        this.seedInitialNotifications();
        await this.saveState();
      }

      // 5. Update UI badges and listeners
      this.updateBadge();
      this.renderList();

      // 6. Schedule daily practice reminder if enabled
      if (this.settings.enabled) {
        await this.scheduleDailyReminder();
      }

      console.log('[NotificationService] Initialized successfully. Native:', this.isNative);
    } catch (err) {
      console.warn('[NotificationService] Init error (non-fatal):', err);
    }
  },

  /**
   * Load stored settings & notification history
   */
  async loadState() {
    try {
      if (window.storage) {
        const storedCfg = await window.storage.get('app_notifications_config');
        if (storedCfg && storedCfg.value) {
          try {
            this.settings = Object.assign(this.settings, JSON.parse(storedCfg.value));
          } catch(e) {}
        }

        const storedList = await window.storage.get('app_notifications_list');
        if (storedList && storedList.value) {
          try {
            this.items = JSON.parse(storedList.value);
          } catch(e) {}
        }
      } else {
        const cfg = localStorage.getItem('app_notifications_config');
        if (cfg) this.settings = Object.assign(this.settings, JSON.parse(cfg));
        const list = localStorage.getItem('app_notifications_list');
        if (list) this.items = JSON.parse(list);
      }
    } catch (e) {
      console.warn('[NotificationService] Load state error:', e);
    }
  },

  /**
   * Save settings & notifications list to storage
   */
  async saveState() {
    try {
      const cfgStr = JSON.stringify(this.settings);
      const listStr = JSON.stringify(this.items.slice(0, 50)); // keep last 50
      if (window.storage) {
        await window.storage.set('app_notifications_config', cfgStr);
        await window.storage.set('app_notifications_list', listStr);
      } else {
        localStorage.setItem('app_notifications_config', cfgStr);
        localStorage.setItem('app_notifications_list', listStr);
      }
    } catch (e) {
      console.warn('[NotificationService] Save state error:', e);
    }
  },

  /**
   * Setup Android Notification Channel
   */
  async setupNativeChannel() {
    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      if (LocalNotifications && LocalNotifications.createChannel) {
        await LocalNotifications.createChannel({
          id: this.channelId,
          name: 'Practice & Exam Alerts',
          description: 'Daily practice reminders, streak updates, and DoTE exam alerts',
          importance: 5, // IMPORTANCE_HIGH
          visibility: 1, // VISIBILITY_PUBLIC
          vibration: true,
          sound: 'default'
        });

        LocalNotifications.addListener('localNotificationActionPerformed', (notification) => {
          console.log('[NotificationService] Notification clicked:', notification);
          if (typeof window.showScreen === 'function') {
            window.showScreen('config');
          }
        });
      }
    } catch (e) {
      console.warn('[NotificationService] setupNativeChannel error:', e);
    }
  },

  /**
   * Check native permission status
   */
  async checkNativePermission() {
    try {
      const { LocalNotifications } = window.Capacitor.Plugins;
      if (LocalNotifications && LocalNotifications.checkPermissions) {
        const status = await LocalNotifications.checkPermissions();
        this.hasPermission = (status && status.display === 'granted');
      }
    } catch (e) {
      this.hasPermission = false;
    }
  },

  /**
   * Request user permission for notifications (both Native & Web)
   */
  async requestPermission() {
    if (this.isNative) {
      try {
        const { LocalNotifications } = window.Capacitor.Plugins;
        const res = await LocalNotifications.requestPermissions();
        this.hasPermission = (res && res.display === 'granted');
        return this.hasPermission;
      } catch (e) {
        console.warn('[NotificationService] Native permission request failed:', e);
        return false;
      }
    } else if ('Notification' in window) {
      try {
        const res = await Notification.requestPermission();
        this.hasPermission = (res === 'granted');
        return this.hasPermission;
      } catch (e) {
        console.warn('[NotificationService] Web permission request failed:', e);
        return false;
      }
    }
    return false;
  },

  /**
   * Core dispatch function: sends native, web, and logs to in-app center
   */
  async send({ id, title, body, category = 'practice', scheduleAt = null, extra = {} }) {
    const notifId = id || Math.floor(Date.now() % 1000000);
    const item = {
      id: notifId,
      title: title,
      body: body,
      category: category,
      timestamp: new Date().toISOString(),
      read: false
    };

    // 1. Prepend to In-App Notification Center
    this.items.unshift(item);
    if (this.items.length > 50) this.items.pop();
    await this.saveState();
    this.updateBadge();
    this.renderList();

    // 2. Dispatch Native Android Notification
    let nativeSent = false;
    if (this.isNative) {
      try {
        const { LocalNotifications } = window.Capacitor.Plugins;
        if (!this.hasPermission) {
          await this.requestPermission();
        }

        const payload = {
          id: notifId,
          title: title,
          body: body,
          channelId: this.channelId,
          smallIcon: 'ic_launcher',
          sound: 'default',
          extra: extra
        };

        if (scheduleAt) {
          payload.schedule = { at: scheduleAt };
        }

        await LocalNotifications.schedule({
          notifications: [payload]
        });
        nativeSent = true;
      } catch (e) {
        console.warn('[NotificationService] Native schedule error:', e);
      }
    }

    // 3. Fallback to Web Notification API (Browser / Desktop)
    if (!nativeSent && !scheduleAt && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: body,
          icon: 'data:image/svg+xml;utf8,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"%3E%3Crect width="64" height="64" rx="14" fill="%232563eb"/%3E%3Cpath d="M16 20h32M16 28h32M16 36h32M20 44h24" stroke="%23fff" stroke-width="4" stroke-linecap="round"/%3E%3C/svg%3E'
        });
      } catch (e) {}
    }

    // 4. In-App Floating Toast
    if (!scheduleAt && typeof window.toast === 'function') {
      window.toast(`🔔 ${title}`);
    }

    return true;
  },

  /**
   * Immediate Test Notification for verification
   */
  async sendTestNotification() {
    await this.requestPermission();
    return await this.send({
      title: 'Typing Thalaiva 🔔',
      body: 'Notifications are active! You are all set for daily practice reminders and DoTE exam alerts.',
      category: 'system'
    });
  },

  /**
   * Schedule recurring daily practice reminder
   */
  async scheduleDailyReminder() {
    if (!this.settings.enabled) return;
    const morningStr = this.settings.reminderMorning || this.settings.reminderTime || '09:00';
    const afternoonStr = this.settings.reminderAfternoon || '14:00';
    const eveningStr = this.settings.reminderEvening || '20:00';

    const mParts = morningStr.split(':').map(Number);
    const aParts = afternoonStr.split(':').map(Number);
    const eParts = eveningStr.split(':').map(Number);

    if (this.isNative) {
      try {
        const { LocalNotifications } = window.Capacitor.Plugins;
        // Cancel existing daily reminders with IDs 1001, 1002, 1003
        await LocalNotifications.cancel({
          notifications: [{ id: 1001 }, { id: 1002 }, { id: 1003 }]
        });

        await LocalNotifications.schedule({
          notifications: [
            {
              id: 1001,
              title: '☀️ காலை வணக்கம்! Morning Touch Typing',
              body: 'Are you thinking about typing or something related to it? 😉 Start your day with a quick 5-min drill!',
              channelId: this.channelId,
              schedule: {
                on: { hour: mParts[0] ?? 9, minute: mParts[1] ?? 0 },
                repeats: true,
                every: 'day'
              }
            },
            {
              id: 1002,
              title: '⚡ பிற்பகல் வேகம்! Afternoon Speed Blast',
              body: 'Keep your fingers nimble! தட்டச்சு செய்ய ரெடியா? 2-minute sprint test ready 🚀',
              channelId: this.channelId,
              schedule: {
                on: { hour: aParts[0] ?? 14, minute: aParts[1] ?? 0 },
                repeats: true,
                every: 'day'
              }
            },
            {
              id: 1003,
              title: '🌙 இரவு தேர்வு பயிற்சி! Evening Exam Revision',
              body: 'Consistent daily practice creates Typing Thalaivas! Don\'t break your streak today! 🏆',
              channelId: this.channelId,
              schedule: {
                on: { hour: eParts[0] ?? 20, minute: eParts[1] ?? 0 },
                repeats: true,
                every: 'day'
              }
            }
          ]
        });
        console.log(`[NotificationService] 3 Daily reminders scheduled at ${morningStr}, ${afternoonStr}, ${eveningStr}`);
      } catch (e) {
        console.warn('[NotificationService] Daily reminder scheduling error:', e);
      }
    }
  },

  /**
   * Notify when a typing speed test is completed
   */
  async notifyTestResult(marks, maxMarks, netWpm, accuracy) {
    if (!this.settings.resultAlerts) return;
    const isPassing = marks >= (maxMarks === 50 ? 25 : 45);
    const title = isPassing ? '🏆 DoTE Exam Practice Passed!' : '🎯 Practice Test Completed';
    const body = `Net Speed: ${netWpm} WPM | Accuracy: ${accuracy}% | Score: ${marks}/${maxMarks} marks.`;
    await this.send({
      title: title,
      body: body,
      category: 'results'
    });
  },

  /**
   * Notify when arcade game personal best record is broken
   */
  async notifyGamePB(gameName, score, accuracy) {
    if (!this.settings.resultAlerts) return;
    await this.send({
      title: '🚀 New Personal Best Record!',
      body: `You scored ${score} pts (${accuracy}% accuracy) in ${gameName}! Hall of Legends updated.`,
      category: 'games'
    });
  },

  /**
   * Notify when a practice streak increases
   */
  async notifyStreak(streakDays) {
    if (!this.settings.streakAlerts || streakDays < 1) return;
    await this.send({
      title: `🔥 ${streakDays}-Day Practice Streak!`,
      body: `Consistency builds champions! Complete a 10-minute speed test today to keep it burning.`,
      category: 'streak'
    });
  },

  /**
   * Notify student about their weak keys to target in drills
   */
  async notifyWeakKeys(weakKeysArray) {
    if (!this.settings.weakKeyAlerts || !weakKeysArray || weakKeysArray.length === 0) return;
    const topKeys = weakKeysArray.slice(0, 3).map(k => `'${k}'`).join(', ');
    await this.send({
      title: '🎯 Target Weak Keys in Skill Drills',
      body: `Your most frequent typing slips were on ${topKeys}. 5 minutes in Drills will fix your finger reach!`,
      category: 'practice'
    });
  },

  /**
   * Seed authentic welcome and syllabus announcements
   */
  seedInitialNotifications() {
    this.items = [
      {
        id: 1,
        title: '🏛️ Welcome to Typing Thalaiva!',
        body: 'Specially designed for students preparing for Tamil Nadu DoTE Government Technical Examinations (Typewriting & CoA).',
        category: 'announcement',
        timestamp: new Date().toISOString(),
        read: false
      },
      {
        id: 2,
        title: '📅 Examination Schedule & Syllabus Loaded',
        body: 'Official November 2026 / June 2027 timetable with stroke-deduction evaluation formula active.',
        category: 'announcement',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false
      },
      {
        id: 3,
        title: '🎮 New Arcade Arena Available',
        body: 'Challenge yourself with Bubble Word and Falling Words games to sharpen your reaction speed and eliminate weak keys!',
        category: 'games',
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: false
      }
    ];
  },

  /**
   * Update header notification badge count
   */
  updateBadge() {
    const unreadCount = this.items.filter(i => !i.read).length;
    const badge = document.getElementById('hdrNotifBadge');
    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 9 ? '9+' : unreadCount;
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  },

  /**
   * Render notification list inside Notification Center modal
   */
  renderList(filter) {
    if (filter) this.activeFilter = filter;
    const container = document.getElementById('notifCenterList');
    if (!container) return;

    const filtered = (this.activeFilter === 'all')
      ? this.items
      : this.items.filter(i => i.category === this.activeFilter);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="text-align:center;padding:36px 16px;color:var(--muted);">
          <div style="font-size:36px;margin-bottom:8px;">📭</div>
          <div style="font-size:14px;font-weight:700;">No notifications found</div>
          <div style="font-size:12px;margin-top:4px;">You're completely caught up!</div>
        </div>
      `;
      return;
    }

    const categoryIcons = {
      practice: '⏰',
      results: '🏆',
      games: '🎮',
      streak: '🔥',
      announcement: '📢',
      system: '🔔'
    };

    container.innerHTML = filtered.map(item => {
      const icon = categoryIcons[item.category] || '🔔';
      const timeStr = this.formatTimeAgo(item.timestamp);
      const unreadDot = !item.read
        ? `<span style="width:8px;height:8px;background:var(--primary);border-radius:50%;display:inline-block;flex-shrink:0;"></span>`
        : '';

      return `
        <div class="glass-card" style="padding:12px 14px;margin-bottom:10px;border-left:${item.read ? '3px solid transparent' : '3px solid var(--primary)'};display:flex;gap:12px;align-items:flex-start;" onclick="NotificationService.markAsRead(${item.id})">
          <div style="font-size:22px;flex-shrink:0;margin-top:2px;">${icon}</div>
          <div style="flex:1 1 auto;min-width:0;">
            <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
              <div style="font-size:13.5px;font-weight:800;color:var(--ink);">${this.escapeHTML(item.title)}</div>
              ${unreadDot}
            </div>
            <div style="font-size:12px;color:var(--muted);line-height:1.45;margin-top:3px;">${this.escapeHTML(item.body)}</div>
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:6px;font-size:10.5px;color:var(--muted);">
              <span style="text-transform:uppercase;font-weight:700;letter-spacing:0.5px;background:var(--card-bg-subtle, rgba(99,102,241,0.08));padding:2px 6px;border-radius:4px;">${item.category}</span>
              <span>${timeStr}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  formatTimeAgo(isoString) {
    if (!isoString) return 'Just now';
    const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  },

  escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  },

  async markAsRead(id) {
    const item = this.items.find(i => i.id === id);
    if (item && !item.read) {
      item.read = true;
      await this.saveState();
      this.updateBadge();
      this.renderList();
    }
  },

  async markAllRead() {
    this.items.forEach(i => i.read = true);
    await this.saveState();
    this.updateBadge();
    this.renderList();
    if (typeof window.toast === 'function') {
      window.toast('All notifications marked as read');
    }
  },

  async clearAll() {
    this.items = [];
    await this.saveState();
    this.updateBadge();
    this.renderList();
    if (typeof window.toast === 'function') {
      window.toast('Notification history cleared');
    }
  },

  openCenter() {
    const modal = document.getElementById('notifCenterModal');
    if (modal) {
      this.renderList();
      modal.style.display = 'flex';
      modal.classList.add('open');
    }
  },

  closeCenter() {
    const modal = document.getElementById('notifCenterModal');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('open');
    }
  },

  /**
   * Save user preferences from Profile tab
   */
  async updatePreferences(newSettings) {
    this.settings = Object.assign(this.settings, newSettings);
    await this.saveState();
    if (this.settings.enabled) {
      await this.scheduleDailyReminder();
    }
    if (typeof window.toast === 'function') {
      window.toast('Notification preferences saved');
    }
  },

  savePreferencesFromUI() {
    const chkDaily = document.getElementById('chkDailyReminder');
    const selTime = document.getElementById('selReminderTime');
    const selMorning = document.getElementById('selReminderMorning');
    const selAfternoon = document.getElementById('selReminderAfternoon');
    const selEvening = document.getElementById('selReminderEvening');
    const chkExam = document.getElementById('chkExamAlerts');
    const chkWeak = document.getElementById('chkWeakKeyAlerts');

    const enabled = chkDaily ? chkDaily.checked : true;
    const time = (selTime && selTime.value) ? selTime.value : (selMorning ? selMorning.value : '09:00');
    const timeMorning = selMorning ? selMorning.value : time;
    const timeAfternoon = selAfternoon ? selAfternoon.value : '14:00';
    const timeEvening = selEvening ? selEvening.value : '20:00';
    const examAlerts = chkExam ? chkExam.checked : true;
    const weakAlerts = chkWeak ? chkWeak.checked : true;

    const wrap = document.getElementById('wrapReminderTime');
    if (wrap) wrap.style.display = enabled ? 'block' : 'none';
    const badge = document.getElementById('lblNotifStatusBadge');
    if (badge) {
      badge.textContent = enabled ? 'Active' : 'Disabled';
      badge.style.background = enabled ? 'var(--emerald-light)' : 'var(--coral-light)';
      badge.style.color = enabled ? 'var(--emerald)' : 'var(--coral)';
    }

    this.updatePreferences({
      enabled: enabled,
      reminderTime: time,
      reminderMorning: timeMorning,
      reminderAfternoon: timeAfternoon,
      reminderEvening: timeEvening,
      examAlerts: examAlerts,
      resultAlerts: examAlerts,
      weakKeyAlerts: weakAlerts
    });
  },

  loadPreferencesToUI() {
    const s = this.settings;
    const chkDaily = document.getElementById('chkDailyReminder');
    const selTime = document.getElementById('selReminderTime');
    const selMorning = document.getElementById('selReminderMorning');
    const selAfternoon = document.getElementById('selReminderAfternoon');
    const selEvening = document.getElementById('selReminderEvening');
    const chkExam = document.getElementById('chkExamAlerts');
    const chkWeak = document.getElementById('chkWeakKeyAlerts');

    if (chkDaily) chkDaily.checked = (s.enabled !== false);
    if (selTime && s.reminderTime) selTime.value = s.reminderTime;
    if (selMorning && (s.reminderMorning || s.reminderTime)) selMorning.value = (s.reminderMorning || s.reminderTime);
    if (selAfternoon && s.reminderAfternoon) selAfternoon.value = s.reminderAfternoon;
    if (selEvening && s.reminderEvening) selEvening.value = s.reminderEvening;
    if (chkExam) chkExam.checked = (s.examAlerts !== false);
    if (chkWeak) chkWeak.checked = (s.weakKeyAlerts !== false);

    const wrap = document.getElementById('wrapReminderTime');
    if (wrap) wrap.style.display = (s.enabled !== false) ? 'block' : 'none';
    const badge = document.getElementById('lblNotifStatusBadge');
    if (badge) {
      const en = (s.enabled !== false);
      badge.textContent = en ? 'Active' : 'Disabled';
      badge.style.background = en ? 'var(--emerald-light)' : 'var(--coral-light)';
      badge.style.color = en ? 'var(--emerald)' : 'var(--coral)';
    }
  }
};

// Export to window
window.NotificationService = NotificationService;
window.saveNotificationPreferencesFromUI = () => NotificationService.savePreferencesFromUI();
window.loadNotificationPreferencesToUI = () => NotificationService.loadPreferencesToUI();
