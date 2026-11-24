/**
 * =====================================================================
 * TYPING THALAIVA — OTG PHYSICAL KEYBOARD & USB HID ENGINE
 * =====================================================================
 * Dedicated service for:
 * 1. Physical USB OTG keyboard detection via Android native bridge
 * 2. Real-time connect / disconnect event monitoring
 * 3. Virtual IME / soft keyboard suppression when physical keyboard is active
 * 4. Mid-exam disconnect safety & seamless focus restoration
 * 5. Modifier key state tracking (Shift, Caps Lock) & event deduplication
 * =====================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.OTGKeyboardService = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var state = {
    connected: false,
    deviceName: 'No Physical Keyboard Detected',
    isSimulated: false,
    virtualKeyboardSuppressed: false,
    capsLockOn: false,
    shiftKeyDown: false,
    disconnectAlertShown: false,
    history: []
  };

  var listeners = [];

  function logState(type, msg) {
    var entry = { time: new Date().toISOString(), type: type, message: msg };
    state.history.unshift(entry);
    if (state.history.length > 50) state.history.pop();
  }

  function checkNativeStatus() {
    if (typeof window !== 'undefined' && window.AndroidKeyboardBridge && typeof window.AndroidKeyboardBridge.isPhysicalKeyboardConnected === 'function') {
      try {
        var isConn = window.AndroidKeyboardBridge.isPhysicalKeyboardConnected();
        var name = window.AndroidKeyboardBridge.getConnectedKeyboardName() || 'USB Physical Keyboard';
        updateConnectionState(Boolean(isConn), name);
        return isConn;
      } catch (e) {
        console.warn('[OTGService] Native bridge query failed:', e);
      }
    }
    return state.connected;
  }

  function updateConnectionState(isConnected, deviceName) {
    var wasConnected = state.connected;
    state.connected = Boolean(isConnected);
    state.deviceName = isConnected ? (deviceName || 'USB Physical Keyboard') : 'No Physical Keyboard Detected';

    logState(isConnected ? 'CONNECT' : 'DISCONNECT', state.deviceName);

    // Apply soft keyboard suppression based on connection
    applyVirtualKeyboardSuppression(state.connected);

    // Update UI Badges
    updateUI();

    // Trigger registered callbacks
    notifyListeners({
      connected: state.connected,
      deviceName: state.deviceName,
      wasConnected: wasConnected
    });

    // Check if disconnected mid-test
    handleMidTestInterruption(wasConnected, state.connected);
  }

  function applyVirtualKeyboardSuppression(suppress) {
    state.virtualKeyboardSuppressed = suppress;
    if (typeof document === 'undefined') return;

    var ta = document.getElementById('typingArea');
    var pracInput = document.getElementById('practiceInput');
    var gameInput = document.getElementById('gameKeyInput');

    var targetMode = suppress ? 'none' : 'text';

    if (ta) ta.setAttribute('inputmode', targetMode);
    if (pracInput) pracInput.setAttribute('inputmode', targetMode);
    if (gameInput) gameInput.setAttribute('inputmode', targetMode);

    if (suppress && typeof window !== 'undefined' && window.AndroidKeyboardBridge && typeof window.AndroidKeyboardBridge.hideVirtualKeyboard === 'function') {
      try {
        window.AndroidKeyboardBridge.hideVirtualKeyboard();
      } catch (err) {}
    }
  }

  function handleMidTestInterruption(wasConnected, isNowConnected) {
    if (typeof window === 'undefined') return;
    var isTestActive = Boolean(window.started && !window.submitted);

    if (wasConnected && !isNowConnected && isTestActive) {
      // Disconnected during an active test!
      state.disconnectAlertShown = true;
      if (typeof window.toast === 'function') {
        window.toast('⚠️ OTG Keyboard Disconnected! Reconnect to continue typing.', 5000);
      }
      var badge = document.getElementById('otgCockpitBadge');
      if (badge) {
        badge.className = 'otg-badge otg-disconnected';
        badge.innerHTML = '⚠️ OTG Disconnected';
      }
    } else if (!wasConnected && isNowConnected && isTestActive) {
      // Reconnected during active test!
      if (state.disconnectAlertShown) {
        state.disconnectAlertShown = false;
        if (typeof window.toast === 'function') {
          window.toast('✅ OTG Keyboard Reconnected! Resuming typing.', 3000);
        }
      }
      // Re-focus typing area immediately
      focusTypingArea();
    }
  }

  function focusTypingArea() {
    if (typeof document === 'undefined') return;
    var ta = document.getElementById('typingArea');
    if (ta && !ta.disabled) {
      ta.focus();
      // Keep cursor at end of input
      var len = ta.value.length;
      try {
        ta.setSelectionRange(len, len);
      } catch (e) {}
    }
  }

  function updateUI() {
    if (typeof document === 'undefined') return;

    // Header OTG indicator button
    var btn = document.getElementById('btnOTGStatus');
    var dot = document.getElementById('hdrOTGDot');
    if (btn) {
      btn.title = 'OTG Keyboard: ' + state.deviceName;
      if (state.connected) {
        btn.classList.add('otg-active');
        btn.classList.remove('otg-inactive');
      } else {
        btn.classList.remove('otg-active');
        btn.classList.add('otg-inactive');
      }
    }
    if (dot) {
      dot.className = state.connected ? 'otg-dot connected' : 'otg-dot disconnected';
    }

    // Cockpit badge in active test
    var cockpitBadge = document.getElementById('otgCockpitBadge');
    if (cockpitBadge) {
      if (state.connected) {
        cockpitBadge.className = 'otg-badge otg-connected';
        cockpitBadge.innerHTML = '⌨️ ' + (state.deviceName.length > 20 ? 'OTG USB' : state.deviceName);
        cockpitBadge.title = state.deviceName;
      } else {
        cockpitBadge.className = 'otg-badge otg-fallback';
        cockpitBadge.innerHTML = '⌨️ Virtual/Touch';
        cockpitBadge.title = 'No physical keyboard detected. Connect USB keyboard via OTG.';
      }
    }

    // Drills badge
    var drillBadge = document.getElementById('otgDrillBadge');
    if (drillBadge) {
      if (state.connected) {
        drillBadge.className = 'otg-badge otg-connected';
        drillBadge.innerHTML = '⌨️ OTG Active';
        drillBadge.title = state.deviceName;
      } else {
        drillBadge.className = 'otg-badge otg-fallback';
        drillBadge.innerHTML = '⌨️ Touch Input';
        drillBadge.title = 'Touch input mode';
      }
    }

    if (typeof updateConnectScreenStatus === 'function') {
      updateConnectScreenStatus();
    }
    if (typeof updateTesterScreenStatus === 'function') {
      updateTesterScreenStatus();
    }
  }

  function notifyListeners(payload) {
    for (var i = 0; i < listeners.length; i++) {
      try {
        listeners[i](payload);
      } catch (e) {
        console.error('[OTGService] Listener error:', e);
      }
    }
  }

  function onPhysicalKeyEvent(event) {
    if (!event) return;

    // Track Caps Lock and Shift
    if (typeof event.getModifierState === 'function') {
      state.capsLockOn = event.getModifierState('CapsLock');
    }
    if (event.key === 'Shift') {
      state.shiftKeyDown = (event.type === 'keydown');
    }

    // Heuristic detection: if an actual physical key event with hardware code arrives
    // and we are not yet marked as connected, upgrade to connected!
    if (!state.connected && event.code && event.code !== 'Unidentified' && event.key !== 'Process') {
      updateConnectionState(true, 'USB Hardware Keyboard');
    }
  }

  function showInfoModal() {
    if (typeof document === 'undefined') return;
    var modal = document.getElementById('otgInfoModal');
    if (!modal) {
      createModalDOM();
      modal = document.getElementById('otgInfoModal');
    }
    if (modal) {
      var statusEl = document.getElementById('otgModalStatus');
      var nameEl = document.getElementById('otgModalDevice');
      if (statusEl) {
        statusEl.innerHTML = state.connected 
          ? '<span style="color:#10b981;font-weight:700;">● Connected (Physical USB OTG)</span>' 
          : '<span style="color:#ef4444;font-weight:700;">○ Disconnected (Touch / Virtual Mode)</span>';
      }
      if (nameEl) {
        nameEl.textContent = state.deviceName;
      }
      modal.style.display = 'flex';
    }
  }

  function hideInfoModal() {
    if (typeof document === 'undefined') return;
    var modal = document.getElementById('otgInfoModal');
    if (modal) modal.style.display = 'none';
  }

  function createModalDOM() {
    var div = document.createElement('div');
    div.id = 'otgInfoModal';
    div.className = 'modal-backdrop';
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(15,23,42,0.6);backdrop-filter:blur(4px);display:none;align-items:center;justify-content:center;z-index:9999;padding:16px;';
    div.innerHTML = 
      '<div style="background:var(--card-bg, #fff);border-radius:18px;max-width:420px;width:100%;padding:22px;box-shadow:0 20px 40px rgba(0,0,0,0.25);border:1.5px solid var(--card-border, #e2e8f0);font-family:inherit;">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">' +
          '<h3 style="margin:0;font-size:17px;font-weight:800;color:var(--text, #0f172a);display:flex;align-items:center;gap:8px;">' +
            '<span>⌨️</span> Physical Keyboard & OTG Status' +
          '</h3>' +
          '<button type="button" onclick="OTGKeyboardService.hideInfoModal()" style="background:none;border:none;font-size:22px;color:var(--subtext, #64748b);cursor:pointer;padding:0 4px;">×</button>' +
        '</div>' +
        '<div style="background:var(--subtle-bg, #f8fafc);border-radius:12px;padding:14px;margin-bottom:14px;border:1px solid var(--card-border, #e2e8f0);">' +
          '<div style="font-size:12px;color:var(--subtext, #64748b);margin-bottom:4px;">Status</div>' +
          '<div id="otgModalStatus" style="font-size:14px;margin-bottom:10px;">Detecting…</div>' +
          '<div style="font-size:12px;color:var(--subtext, #64748b);margin-bottom:4px;">Detected Device</div>' +
          '<div id="otgModalDevice" style="font-size:14px;font-weight:600;color:var(--text, #0f172a);">' + state.deviceName + '</div>' +
        '</div>' +
        '<div style="font-size:12px;color:var(--subtext, #64748b);line-height:1.5;margin-bottom:18px;">' +
          '<b>Exam Mode Instructions:</b> Connect any standard 104-key or compact USB keyboard via an OTG adapter. The on-screen soft keyboard is automatically suppressed during examinations for maximum screen visibility.' +
        '</div>' +
        '<div style="display:flex;gap:10px;">' +
          '<button type="button" onclick="OTGKeyboardService.testFocus()" style="flex:1;background:var(--primary, #2563eb);color:#fff;border:none;padding:10px 14px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">Check Keyboard Focus</button>' +
          '<button type="button" onclick="OTGKeyboardService.hideInfoModal()" style="background:var(--subtle-bg, #e2e8f0);color:var(--text, #0f172a);border:none;padding:10px 14px;border-radius:10px;font-weight:700;font-size:13px;cursor:pointer;">Close</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(div);
  }

  function testFocus() {
    focusTypingArea();
    hideInfoModal();
    if (typeof window.toast === 'function') {
      window.toast('⌨️ Keyboard focus locked onto typing area');
    }
  }

  function init() {
    if (typeof window === 'undefined') return;

    // Listen to native Android bridge custom event
    window.addEventListener('otg-keyboard-status', function (evt) {
      if (evt && evt.detail) {
        updateConnectionState(evt.detail.connected, evt.detail.deviceName);
      }
    });

    // Native bridge direct callback
    window.onOTGKeyboardStateChanged = function (connected, deviceName) {
      updateConnectionState(connected, deviceName);
    };

    // Global keydown / keyup tracker for physical keyboard identification
    window.addEventListener('keydown', onPhysicalKeyEvent, true);
    window.addEventListener('keyup', onPhysicalKeyEvent, true);

    // Initial check from native bridge
    checkNativeStatus();

    // Initial UI render
    updateUI();

    // Tester key listeners
    window.addEventListener('keydown', function(e) {
      var testerScreen = document.getElementById('screen-keyboard-test');
      if (testerScreen && testerScreen.classList.contains('active')) {
        handleTesterKeyEvent(e, 'down');
      }
    }, true);

    window.addEventListener('keyup', function(e) {
      var testerScreen = document.getElementById('screen-keyboard-test');
      if (testerScreen && testerScreen.classList.contains('active')) {
        handleTesterKeyEvent(e, 'up');
      }
    }, true);
  }

  var testerState = {
    keysPressed: 0,
    lastKey: '—'
  };

  var currentConnectTab = 'wired';

  function setConnectTab(tab) {
    currentConnectTab = tab;
    var btnWired = document.getElementById('btnConnTabWired');
    var btnWireless = document.getElementById('btnConnTabWireless');
    var stepsWired = document.getElementById('connStepsWired');
    var stepsWireless = document.getElementById('connStepsWireless');

    if (btnWired) btnWired.classList.toggle('active', tab === 'wired');
    if (btnWireless) btnWireless.classList.toggle('active', tab === 'wireless');
    if (stepsWired) stepsWired.style.display = (tab === 'wired') ? 'block' : 'none';
    if (stepsWireless) stepsWireless.style.display = (tab === 'wireless') ? 'block' : 'none';
  }

  function openConnectScreen() {
    if (typeof window.showScreen === 'function') {
      window.showScreen('screen-connect-keyboard');
    }
    updateConnectScreenStatus();
    setConnectTab(currentConnectTab);
  }

  function openTesterScreen() {
    if (typeof window.showScreen === 'function') {
      window.showScreen('screen-keyboard-test');
    }
    updateTesterScreenStatus();
  }

  function updateConnectScreenStatus() {
    var badge = document.getElementById('connectKbLiveBadge');
    if (badge) {
      if (state.connected) {
        badge.className = 'kb-live-status-pill connected';
        badge.innerHTML = '🟢 Physical Keyboard Active: <b>' + (state.deviceName || 'USB/Bluetooth Keyboard') + '</b>';
      } else {
        badge.className = 'kb-live-status-pill disconnected';
        badge.innerHTML = '⚪ No external keyboard detected yet (Plug in OTG or pair Bluetooth)';
      }
    }
  }

  function updateTesterScreenStatus() {
    var card = document.getElementById('testerDetectionCard');
    if (card) {
      if (state.connected) {
        card.className = 'kb-test-status-box connected';
        card.innerHTML = 
          '<div style="display:flex;align-items:center;gap:10px;">' +
            '<span style="font-size:22px;color:#10b981;">✔</span>' +
            '<div>' +
              '<div style="font-weight:800;font-size:14px;color:var(--ink);">External keyboard connected</div>' +
              '<div style="font-size:12px;color:var(--muted);">' + (state.deviceName || 'USB Hardware Keyboard') + ' active &amp; ready</div>' +
            '</div>' +
          '</div>';
      } else {
        card.className = 'kb-test-status-box disconnected';
        card.innerHTML = 
          '<div style="display:flex;align-items:flex-start;gap:10px;">' +
            '<span style="font-size:20px;color:var(--primary);margin-top:2px;">ℹ</span>' +
            '<div>' +
              '<div style="font-weight:800;font-size:14px;color:var(--ink);">No external keyboard detected</div>' +
              '<div style="font-size:12px;color:var(--muted);line-height:1.4;">Connect a Bluetooth or USB-OTG keyboard from Android Settings, then come back here.</div>' +
            '</div>' +
          '</div>';
      }
    }
  }

  function handleTesterKeyEvent(e, action) {
    if (!e) return;

    var code = e.code || '';
    var key = e.key || '';

    // Mark as connected if hardware key is received
    if (!state.connected && code && code !== 'Unidentified') {
      updateConnectionState(true, 'Hardware Keyboard');
      updateTesterScreenStatus();
      updateConnectScreenStatus();
    }

    // Key lookup in tester DOM
    var selector = '';
    if (code) {
      selector = '[data-key="' + code + '"]';
    }
    var keyEl = selector ? document.querySelector(selector) : null;
    if (!keyEl && key && key.length === 1) {
      keyEl = document.querySelector('[data-char="' + key.toUpperCase() + '"]');
    }

    if (action === 'down') {
      testerState.keysPressed++;
      var formattedKey = key;
      if (code && code !== key) {
        formattedKey = (key.length === 1 ? key.toUpperCase() : key) + ' (' + code + ')';
      }
      testerState.lastKey = formattedKey;

      var countEl = document.getElementById('kbTestPressCount');
      var lastEl = document.getElementById('kbTestLastKey');
      if (countEl) countEl.textContent = testerState.keysPressed;
      if (lastEl) lastEl.textContent = testerState.lastKey;

      if (keyEl) {
        keyEl.classList.add('key-pressed');
      }

      // Play audio mechanical feedback
      if (typeof window !== 'undefined' && typeof window.AudioEngine !== 'undefined' && typeof window.AudioEngine.play === 'function') {
        try {
          window.AudioEngine.play('click');
        } catch(err) {}
      }
    } else if (action === 'up') {
      if (keyEl) {
        keyEl.classList.remove('key-pressed');
      }
    }
  }

  function resetTester() {
    testerState.keysPressed = 0;
    testerState.lastKey = '—';
    var countEl = document.getElementById('kbTestPressCount');
    var lastEl = document.getElementById('kbTestLastKey');
    if (countEl) countEl.textContent = '0';
    if (lastEl) lastEl.textContent = '—';

    document.querySelectorAll('.vkey.key-pressed').forEach(function(el) {
      el.classList.remove('key-pressed');
    });
  }

  return {
    init: init,
    checkNativeStatus: checkNativeStatus,
    updateConnectionState: updateConnectionState,
    isPhysicalKeyboardConnected: function () { return state.connected; },
    getDeviceName: function () { return state.deviceName; },
    isVirtualKeyboardSuppressed: function () { return state.virtualKeyboardSuppressed; },
    isCapsLockOn: function () { return state.capsLockOn; },
    isShiftKeyDown: function () { return state.shiftKeyDown; },
    focusTypingArea: focusTypingArea,
    showInfoModal: showInfoModal,
    hideInfoModal: hideInfoModal,
    testFocus: testFocus,
    openConnectScreen: openConnectScreen,
    openTesterScreen: openTesterScreen,
    setConnectTab: setConnectTab,
    resetTester: resetTester,
    updateConnectScreenStatus: updateConnectScreenStatus,
    updateTesterScreenStatus: updateTesterScreenStatus,
    handleTesterKeyEvent: handleTesterKeyEvent,
    subscribe: function (fn) {
      listeners.push(fn);
      return function () {
        var idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    },
    // Test simulator hook for Playwright / automated tests
    setSimulatedPhysicalKeyboard: function (connected, deviceName) {
      state.isSimulated = true;
      updateConnectionState(connected, deviceName);
    },
    getState: function () {
      return Object.assign({}, state);
    }
  };
});
