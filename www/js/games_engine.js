/**
 * TYPING THALAIVA — ARCADE ARENA & ANTI-CHOKE GAMES ENGINE
 * Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute
 * 
 * Features:
 *  1. Bubble Letter Challenge (Letters only, falling bubbles defense)
 *  2. Falling Words Challenge (Adaptive speed, progressive word flow, zero mismatch)
 *  3. Word Typing Challenge (Target word at top, typing input at bottom, 35 words session)
 *  4. Surgical Letter-by-Letter progression (No advance on errors)
 *  5. 6-Miss Survival Rule (❤️❤️❤️❤️❤️❤️)
 *  6. Scoring: 1 pt / correct letter, +5 bonus / word, no negative points
 *  7. Tri-Language Engine: English QWERTY, Tamil99, Tamil Typewriter
 *  8. Synthesized Web Audio keyclick, hit, pop, completion chime, and error tones
 *  9. Anti-Choke Intelligent Mistake Heatmap & Diagnostic Report
 * 10. Fair-Play Personal Best Leaderboard with accuracy tie-breaker
 */

(function (window) {
  'use strict';

  // --- CURATED LETTER BANKS FOR BUBBLE CHALLENGE (INDIVIDUAL LETTERS ONLY) ---
  const LETTER_BANKS = {
    en: [
      "A", "B", "C", "D", "E", "F", "G", "H", "I", "J",
      "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T",
      "U", "V", "W", "X", "Y", "Z"
    ],
    ta: [
      "அ", "ஆ", "இ", "ஈ", "உ", "ஊ", "எ", "ஏ", "ஐ", "ஒ", "ஓ", "ஔ", "ஃ",
      "க", "ச", "ட", "த", "ப", "ற", "ங", "ஞ", "ண", "ந", "ம", "ன",
      "ய", "ர", "ல", "வ", "ழ", "ள"
    ]
  };

  // --- PROGRESSIVE WORD TIERS FOR WORD TYPING & FALLING CHALLENGES ---
  const WORD_TIERS = {
    en: {
      easy: [
        "type", "speed", "focus", "power", "skill", "learn", "rapid", "target", "hand", "fast",
        "mind", "star", "flow", "best", "word", "time", "task", "form", "page", "note"
      ],
      medium: [
        "master", "result", "future", "system", "engine", "action", "growth", "record", "energy", "screen",
        "school", "effort", "method", "wisdom", "habit", "smart", "steady", "timing", "senior", "junior",
        "course", "centre", "honor", "quick", "tempo", "active", "talent"
      ],
      hard: [
        "thalaiva", "practice", "accuracy", "keyboard", "victory", "champion", "progress", "director", "technical",
        "government", "discipline", "excellence", "confidence", "minute", "paper", "efficiency", "milestone"
      ]
    },
    ta: {
      easy: [
        "தமிழ்", "கல்வி", "அறிவு", "பாடம்", "பள்ளி", "நன்மை", "கலை", "அரசு", "நாடு", "புகழ்",
        "விரல்", "விசை", "காலம்", "கடமை", "அமைதி", "உறுதி", "இனிமை", "வளம்", "மலர்", "நடை"
      ],
      medium: [
        "வணக்கம்", "வெற்றி", "திறமை", "வேகம்", "தேர்வு", "முயற்சி", "பயிற்சி", "கணினி", "ஆவணம்", "தலைவா",
        "வளர்ச்சி", "ஒழுக்கம்", "ஆர்வம்", "நேர்த்தி", "உழைப்பு", "சாதிப்போம்", "சுடர்"
      ],
      hard: [
        "தட்டச்சு", "ஆசிரியர்", "துல்லியம்", "மதிப்பெண்", "சான்றிதழ்", "அலுவலகம்", "நம்பிக்கை", "முன்னேற்றம்",
        "தன்னம்பிக்கை", "தொழில்நுட்பம்", "சான்றோன்"
      ]
    }
  };

  // Curated flat word banks for general fallback & backward compatibility
  const WORD_BANKS = {
    en: [
      ...WORD_TIERS.en.easy,
      ...WORD_TIERS.en.medium,
      ...WORD_TIERS.en.hard
    ],
    ta: [
      ...WORD_TIERS.ta.easy,
      ...WORD_TIERS.ta.medium,
      ...WORD_TIERS.ta.hard
    ]
  };

  // --- GRAPHEME SEGMENTER HELPER (Safe fallback for Tamil compound letters) ---
  function splitGraphemes(text, lang) {
    if (!text) return [];
    if (typeof Intl !== 'undefined' && Intl.Segmenter) {
      try {
        const seg = new Intl.Segmenter(lang === 'ta' ? 'ta' : 'en', { granularity: 'grapheme' });
        return Array.from(seg.segment(text)).map(s => s.segment);
      } catch (e) {}
    }
    // Regex fallback for Tamil combining vowel signs & pulli virama
    if (lang === 'ta') {
      const matched = text.match(/[\u0B80-\u0BFF][\u0BBE-\u0BCD\u0BD7]*/g);
      if (matched && matched.length > 0) return matched;
    }
    return Array.from(text);
  }

  // --- SOUND EFFECTS SYNTHESIS (Zero latency Web Audio) ---
  let isGameSoundEnabled = true;
  let gameAudioCtx = null;
  let lastErrorSoundTime = 0;

  function getGameAudioContext() {
    try {
      if (window.AudioEngine && window.AudioEngine.ctx) {
        return window.AudioEngine.ctx;
      }
      if (!gameAudioCtx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) {
          gameAudioCtx = new AudioCtx();
        }
      }
      return gameAudioCtx;
    } catch (e) {
      return null;
    }
  }

  function playSound(type) {
    if (!isGameSoundEnabled) return;
    try {
      const ctx = getGameAudioContext();
      if (!ctx) return;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'type') {
        // Crisp subtle mechanical key click (~12ms)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(1400, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.012);
        gain.gain.setValueAtTime(0.08, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.012);
        osc.start(t);
        osc.stop(t + 0.012);
      } else if (type === 'hit' || type === 'correct_char') {
        // Pleasant high-pitch blip for correct letter
        osc.type = 'sine';
        osc.frequency.setValueAtTime(650, t);
        osc.frequency.exponentialRampToValueAtTime(980, t + 0.035);
        gain.gain.setValueAtTime(0.12, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
        osc.start(t);
        osc.stop(t + 0.035);
      } else if (type === 'bonus' || type === 'word_complete') {
        // Melodic arpeggio chime for correct word completion
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, t); // C5
        osc.frequency.setValueAtTime(659.25, t + 0.05); // E5
        osc.frequency.setValueAtTime(783.99, t + 0.10); // G5
        osc.frequency.setValueAtTime(1046.50, t + 0.15); // C6
        gain.gain.setValueAtTime(0.18, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
        osc.start(t);
        osc.stop(t + 0.28);
      } else if (type === 'error' || type === 'wrong' || type === 'mistake') {
        // Subtle, pleasant low-tone dual frequency feedback for incorrect letter / word
        const now = Date.now();
        if (now - lastErrorSoundTime < 80) return; // Prevent excessive overlapping sounds
        lastErrorSoundTime = now;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(180, t);
        osc.frequency.exponentialRampToValueAtTime(110, t + 0.07);
        gain.gain.setValueAtTime(0.14, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
        osc.start(t);
        osc.stop(t + 0.07);
      } else if (type === 'miss') {
        // Descending warning swoop for missed boundary
        osc.type = 'sine';
        osc.frequency.setValueAtTime(380, t);
        osc.frequency.exponentialRampToValueAtTime(150, t + 0.18);
        gain.gain.setValueAtTime(0.2, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
        osc.start(t);
        osc.stop(t + 0.18);
      } else if (type === 'pop') {
        // Soft, crisp bubble pop
        osc.type = 'sine';
        osc.frequency.setValueAtTime(820, t);
        osc.frequency.exponentialRampToValueAtTime(260, t + 0.04);
        gain.gain.setValueAtTime(0.16, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
        osc.start(t);
        osc.stop(t + 0.04);
      }
    } catch (e) {}
  }

  // Trigger tactile vibration on Android
  function triggerHaptic(type) {
    try {
      if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Haptics) {
        if (type === 'error') window.Capacitor.Plugins.Haptics.impact({ style: 'heavy' });
        else if (type === 'miss') window.Capacitor.Plugins.Haptics.vibrate();
      } else if (navigator && typeof navigator.vibrate === 'function') {
        if (type === 'error') navigator.vibrate(30);
        else if (type === 'miss') navigator.vibrate([60, 40, 60]);
      }
    } catch (e) {}
  }

  // --- DEFAULT LEADERBOARD BENCHMARKS ---
  const DEFAULT_LEADERBOARD = {
    bubble: {
      en: [
        { name: "Suresh Kumar", score: 285, accuracy: 98.5, date: "08 Nov 2026" },
        { name: "Priya Dharshini", score: 260, accuracy: 97.8, date: "07 Nov 2026" },
        { name: "Karthik Raja", score: 235, accuracy: 96.4, date: "06 Nov 2026" },
        { name: "Ananya S.", score: 210, accuracy: 95.9, date: "05 Nov 2026" },
        { name: "Vignesh M.", score: 185, accuracy: 94.2, date: "04 Nov 2026" }
      ],
      tamil99: [
        { name: "Kavitha R.", score: 270, accuracy: 98.1, date: "08 Nov 2026" },
        { name: "Manikandan P.", score: 245, accuracy: 96.8, date: "07 Nov 2026" },
        { name: "Senthamizh Selvi", score: 220, accuracy: 96.0, date: "06 Nov 2026" },
        { name: "Murugan T.", score: 195, accuracy: 94.5, date: "05 Nov 2026" },
        { name: "Gokulraj V.", score: 175, accuracy: 93.8, date: "04 Nov 2026" }
      ],
      typewriter: [
        { name: "Palanisamy K.", score: 260, accuracy: 97.5, date: "08 Nov 2026" },
        { name: "Devi Meenakshi", score: 240, accuracy: 96.2, date: "07 Nov 2026" },
        { name: "Subramanian N.", score: 215, accuracy: 95.0, date: "06 Nov 2026" },
        { name: "Radha Krishnan", score: 190, accuracy: 93.9, date: "05 Nov 2026" },
        { name: "Balamurugan S.", score: 170, accuracy: 92.5, date: "04 Nov 2026" }
      ]
    },
    falling: {
      en: [
        { name: "Nandhini Devi", score: 310, accuracy: 99.1, date: "08 Nov 2026" },
        { name: "Rajesh Kannan", score: 280, accuracy: 98.0, date: "07 Nov 2026" },
        { name: "Deepa Lakshmi", score: 255, accuracy: 96.9, date: "06 Nov 2026" },
        { name: "Praveen Kumar", score: 230, accuracy: 95.5, date: "05 Nov 2026" },
        { name: "Harishankar B.", score: 200, accuracy: 94.0, date: "04 Nov 2026" }
      ],
      tamil99: [
        { name: "Vasanthakumar", score: 290, accuracy: 98.4, date: "08 Nov 2026" },
        { name: "Bharathi K.", score: 265, accuracy: 97.2, date: "07 Nov 2026" },
        { name: "Kalaiselvan S.", score: 235, accuracy: 95.8, date: "06 Nov 2026" },
        { name: "Revathi M.", score: 210, accuracy: 94.7, date: "05 Nov 2026" },
        { name: "Arunmozhi T.", score: 180, accuracy: 93.2, date: "04 Nov 2026" }
      ],
      typewriter: [
        { name: "Chandrasekar G.", score: 275, accuracy: 97.9, date: "08 Nov 2026" },
        { name: "Vijayalakshmi", score: 250, accuracy: 96.5, date: "07 Nov 2026" },
        { name: "Thangaraj P.", score: 225, accuracy: 95.2, date: "06 Nov 2026" },
        { name: "Meena Kumari", score: 200, accuracy: 93.8, date: "05 Nov 2026" },
        { name: "Sathish Kumar", score: 175, accuracy: 92.0, date: "04 Nov 2026" }
      ]
    },
    word_typing: {
      en: [
        { name: "Suresh Kumar", score: 320, accuracy: 99.4, date: "08 Nov 2026" },
        { name: "Nandhini Devi", score: 295, accuracy: 98.6, date: "07 Nov 2026" },
        { name: "Karthik Raja", score: 270, accuracy: 97.5, date: "06 Nov 2026" },
        { name: "Priya Dharshini", score: 245, accuracy: 96.8, date: "05 Nov 2026" },
        { name: "Vignesh M.", score: 210, accuracy: 95.2, date: "04 Nov 2026" }
      ],
      tamil99: [
        { name: "Kavitha R.", score: 305, accuracy: 98.8, date: "08 Nov 2026" },
        { name: "Vasanthakumar", score: 280, accuracy: 97.9, date: "07 Nov 2026" },
        { name: "Senthamizh Selvi", score: 250, accuracy: 96.5, date: "06 Nov 2026" },
        { name: "Manikandan P.", score: 225, accuracy: 95.4, date: "05 Nov 2026" },
        { name: "Murugan T.", score: 195, accuracy: 94.1, date: "04 Nov 2026" }
      ],
      typewriter: [
        { name: "Palanisamy K.", score: 290, accuracy: 98.2, date: "08 Nov 2026" },
        { name: "Chandrasekar G.", score: 265, accuracy: 97.1, date: "07 Nov 2026" },
        { name: "Devi Meenakshi", score: 240, accuracy: 96.0, date: "06 Nov 2026" },
        { name: "Thangaraj P.", score: 210, accuracy: 94.8, date: "05 Nov 2026" },
        { name: "Subramanian N.", score: 185, accuracy: 93.5, date: "04 Nov 2026" }
      ]
    }
  };

  // --- CORE GAME ENGINE CLASS ---
  class GamesEngine {
    constructor() {
      this.gameType = 'bubble'; // 'bubble' | 'falling' | 'word_typing'
      this.lang = 'en'; // 'en' | 'ta'
      this.layout = 'qwerty'; // 'qwerty' | 'tamil99' | 'typewriter'
      this.score = 0;
      this.maxLives = 6; // 6 chances matching reference UI
      this.lives = 6;
      this.targetWordsCount = 35; // 30-40 words per complete session
      this.wordsCompleted = 0;
      this.wordsMissed = 0;
      this.wordsAttempted = 0;
      this.wordsCorrect = 0;
      this.wordsIncorrect = 0;
      this.correctChars = 0;
      this.incorrectChars = 0;
      this.keystrokeMistakes = 0;
      this.currentWordHadMistake = false;

      // Adaptive speed variables
      this.adaptiveBaseSpeed = 0.48; // px/frame (~29 px/sec, comfortable student baseline)
      this.recentWordTimes = [];

      // Word typing challenge state
      this.wordTypingList = [];
      this.wordTypingIndex = 0;

      this.startTime = null;
      this.endTime = null;
      this.active = false;
      this.paused = false;

      this.activeWords = [];
      this.currentWordIdx = 0; // Word being actively typed
      this.charIndex = 0; // Current letter/grapheme index inside active word
      this.particles = [];
      this.floatingTips = [];

      this.composer = { raw: '', outLen: 0 };
      this.mistakesLog = [];
      this.weakKeysMap = {};
      this.wordMistakesMap = {};

      this.animFrameId = null;
      this.lastSpawnTime = 0;
      this.spawnInterval = 3000; // ms

      this.canvas = null;
      this.ctx = null;
      this.inputEl = null;

      this.canvasWidth = 360;
      this.canvasHeight = 600;
      this.pixelRatio = window.devicePixelRatio || 1;
      this.soundEnabled = true;
      this.playSound = playSound;
    }

    toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      isGameSoundEnabled = this.soundEnabled;
      const soundBtn = document.getElementById('gameSoundBtn');
      if (soundBtn) {
        soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        soundBtn.title = this.soundEnabled ? 'Sound Effects: ON' : 'Sound Effects: MUTED';
      }
      if (typeof window.toast === 'function') {
        window.toast(this.soundEnabled ? '🔊 Game Sound Effects: Enabled' : '🔇 Game Sound Effects: Muted');
      }
      return this.soundEnabled;
    }

    getSpeedForWord(wordObj) {
      const elapsedSec = Math.max(0, (Date.now() - (this.startTime || Date.now())) / 1000);
      if (this.gameType === 'word_typing') {
        return 0; // Static target
      } else if (this.gameType === 'falling') {
        // 25-second student-friendly progressive ramp from 0.55 to 1.15 px/frame
        const timeProgress = Math.min(1.0, elapsedSec / 25.0);
        const smoothProgress = timeProgress * (2 - timeProgress); // quadratic ease-out
        const rampSpeed = 0.55 + (smoothProgress * 0.60);
        const scoreBonus = Math.min(0.70, ((this.score || 0) / 100) * 0.35);

        // Adaptive pace delta: 0 baseline at start (adaptiveBaseSpeed 0.48), adjusted by student performance
        const adaptiveDelta = (this.adaptiveBaseSpeed !== undefined ? (this.adaptiveBaseSpeed - 0.48) : 0);

        // Word length compensation: longer words fall proportionally slower to allow sufficient typing time
        let lengthFactor = 1.0;
        if (wordObj && wordObj.graphemes && wordObj.graphemes.length) {
          const len = wordObj.graphemes.length;
          if (len > 5) {
            lengthFactor = Math.max(0.70, 5.0 / len);
          } else if (len < 5) {
            lengthFactor = Math.min(1.15, 5.0 / Math.max(3, len));
          }
        }

        const finalSpeed = (rampSpeed + scoreBonus + adaptiveDelta) * lengthFactor;
        return Number(finalSpeed.toFixed(2));
      } else {
        // Bubble Challenge: Starts slow at 0.45 px/frame, gentle progression up to 0.70 px/frame
        const timeProgress = Math.min(1.0, elapsedSec / 35.0);
        const rampSpeed = 0.45 + (timeProgress * 0.20);
        const scoreBonus = Math.min(0.12, ((this.score || 0) / 150) * 0.12);
        return Number((rampSpeed + scoreBonus).toFixed(2));
      }
    }

    init() {
      this.canvas = document.getElementById('gameCanvas');
      this.inputEl = document.getElementById('gameKeyInput');
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.bindEvents();
      this.resizeCanvas();

      // Load authentic Sri Kalaimagal Institute watermark for game arena
      if (typeof Image !== 'undefined') {
        this.watermarkImg = new Image();
        this.watermarkImg.src = 'img/kalaimagal_watermark.png';
      }
      this.initAmbientDust();

      window.addEventListener('resize', () => {
        this.resizeCanvas();
        this.initAmbientDust();
      });
      window.addEventListener('orientationchange', () => setTimeout(() => {
        this.resizeCanvas();
        this.initAmbientDust();
      }, 150));
    }

    initAmbientDust() {
      this.ambientDust = [];
      const count = 32;
      const w = this.canvasWidth || 800;
      const h = this.canvasHeight || 600;
      for (let i = 0; i < count; i++) {
        this.ambientDust.push({
          x: Math.random() * w,
          y: Math.random() * h,
          radius: 1.0 + Math.random() * 1.6,
          alpha: 0.15 + Math.random() * 0.4,
          speed: 0.15 + Math.random() * 0.3
        });
      }
    }

    resizeCanvas() {
      if (!this.canvas) return;
      const arena = document.getElementById('gameArenaContainer');
      if (!arena) return;

      const rect = arena.getBoundingClientRect();
      this.canvasWidth = Math.round(rect.width) || window.innerWidth || 360;
      this.canvasHeight = Math.round(rect.height) || (window.innerHeight - 60) || 600;

      this.pixelRatio = window.devicePixelRatio || 1;
      this.canvas.width = Math.round(this.canvasWidth * this.pixelRatio);
      this.canvas.height = Math.round(this.canvasHeight * this.pixelRatio);

      if (this.ctx) {
        if (typeof this.ctx.setTransform === 'function') {
          this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0);
        } else if (typeof this.ctx.scale === 'function') {
          this.ctx.scale(this.pixelRatio, this.pixelRatio);
        }
      }
    }

    bindEvents() {
      if (!this.inputEl) return;

      // Focus input whenever canvas is tapped
      if (this.canvas) {
        this.canvas.addEventListener('click', () => {
          if (this.active && !this.paused) this.inputEl.focus();
        });
        this.canvas.addEventListener('touchstart', () => {
          if (this.active && !this.paused) this.inputEl.focus();
        }, { passive: true });
      }

      // Intercept keydown for desktop/physical keyboards
      this.inputEl.addEventListener('keydown', (e) => {
        if (!this.active || this.paused) return;
        if (e.ctrlKey || e.metaKey || e.altKey) return;
        if (e.key === 'Backspace' || e.key === 'Tab' || e.key === 'Enter') {
          e.preventDefault();
          return;
        }
      });

      // Handle character input from both physical & virtual/soft keyboards
      this.inputEl.addEventListener('input', (e) => {
        if (!this.active || this.paused) {
          this.inputEl.value = '';
          return;
        }
        const val = this.inputEl.value;
        this.inputEl.value = '';
        if (!val) return;

        for (let i = 0; i < val.length; i++) {
          this.handleKeystroke(val[i]);
        }
      });
    }

    start(gameType, lang, layout) {
      this.gameType = gameType || 'bubble';
      this.lang = lang || 'en';
      this.layout = layout || (lang === 'ta' ? 'tamil99' : 'qwerty');

      this.score = 0;
      this.maxLives = 6;
      this.lives = 6;
      this.targetWordsCount = 35; // 35 words per session
      this.wordsCompleted = 0;
      this.wordsMissed = 0;
      this.wordsAttempted = 0;
      this.wordsCorrect = 0;
      this.wordsIncorrect = 0;
      this.keystrokeMistakes = 0;
      this.currentWordHadMistake = false;
      this.adaptiveBaseSpeed = 0.48;

      this.correctChars = 0;
      this.incorrectChars = 0;
      this.startTime = Date.now();
      this.endTime = null;
      this.active = true;
      this.paused = false;

      this.activeWords = [];
      this.currentWordIdx = 0;
      this.charIndex = 0;
      this.particles = [];
      this.floatingTips = [];
      this.mistakesLog = [];
      this.weakKeysMap = {};
      this.wordMistakesMap = {};
      this.composer = { raw: '', outLen: 0 };
      this.lastSpawnTime = 0;
      this.spawnInterval = 3000;

      // Initialize session list for Word Typing Challenge
      if (this.gameType === 'word_typing') {
        const tiers = WORD_TIERS[this.lang] || WORD_TIERS.en;
        const easyP = [...tiers.easy].sort(() => 0.5 - Math.random());
        const medP = [...tiers.medium].sort(() => 0.5 - Math.random());
        const hardP = [...tiers.hard].sort(() => 0.5 - Math.random());
        // Progression: 10 easy, 15 medium, 10 hard words = 35 words total
        this.wordTypingList = [
          ...easyP.slice(0, 10),
          ...medP.slice(0, 15),
          ...hardP.slice(0, 10)
        ];
        this.wordTypingIndex = 0;
      }

      // Show gaming screen FIRST so canvas has active DOM bounding box
      if (typeof window.showScreen === 'function') {
        window.showScreen('screen-games');
      } else {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const sc = document.getElementById('screen-games');
        if (sc) sc.classList.add('active');
      }

      this.resizeCanvas();
      this.updateHUD();

      // Spawn initial element immediately
      this.spawnWord();

      // Focus input
      setTimeout(() => {
        if (this.inputEl) this.inputEl.focus();
      }, 100);

      // Start main loop
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      this.loop = this.loop.bind(this);
      this.animFrameId = requestAnimationFrame(this.loop);
    }

    pause() {
      if (!this.active || this.paused) return;
      this.paused = true;
      const modal = document.getElementById('gamePauseModal');
      if (modal) modal.style.display = 'flex';
    }

    resume() {
      if (!this.active || !this.paused) return;
      this.paused = false;
      const modal = document.getElementById('gamePauseModal');
      if (modal) modal.style.display = 'none';
      if (this.inputEl) this.inputEl.focus();
      this.animFrameId = requestAnimationFrame(this.loop);
    }

    restart() {
      const modal = document.getElementById('gamePauseModal');
      if (modal) modal.style.display = 'none';
      const goModal = document.getElementById('gameOverModal');
      if (goModal) goModal.style.display = 'none';
      this.start(this.gameType, this.lang, this.layout);
    }

    quit() {
      this.active = false;
      this.paused = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      const modal = document.getElementById('gamePauseModal');
      if (modal) modal.style.display = 'none';
      const goModal = document.getElementById('gameOverModal');
      if (goModal) goModal.style.display = 'none';

      // Return to games hub
      this.openHub();
    }

    exitToApp() {
      this.active = false;
      this.paused = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      const modal = document.getElementById('gamePauseModal');
      if (modal) modal.style.display = 'none';
      const goModal = document.getElementById('gameOverModal');
      if (goModal) goModal.style.display = 'none';

      // Return to main app navigation (Studio or previous tab)
      if (typeof window.switchTab === 'function') {
        window.switchTab(window.previousAppTab || 'speed');
      } else if (typeof window.showScreen === 'function') {
        window.showScreen('screen-config');
      }
    }

    openHub() {
      this.active = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
      if (typeof window.showScreen === 'function') {
        window.showScreen('screen-games-hub');
      } else {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const sc = document.getElementById('screen-games-hub');
        if (sc) sc.classList.add('active');
      }
    }

    spawnWord() {
      const isBubble = (this.gameType === 'bubble');
      const isWordTyping = (this.gameType === 'word_typing');

      const BUBBLE_PALETTES = [
        { main: '#e11d48', dark: '#9f1239', light: '#fda4af' }, // Vivid ruby red
        { main: '#65a30d', dark: '#3f6212', light: '#bef264' }, // Apple green
        { main: '#4f46e5', dark: '#3730a3', light: '#a5b4fc' }, // Periwinkle blue
        { main: '#7c3aed', dark: '#5b21b6', light: '#c4b5fd' }, // Violet
        { main: '#ea580c', dark: '#9a3412', light: '#fdba74' }, // Amber
        { main: '#0284c7', dark: '#075985', light: '#7dd3fc' }, // Sky cyan
      ];

      if (isBubble) {
        // --- 1. BUBBLE WORD CHALLENGE: INDIVIDUAL LETTERS ONLY ---
        const letterBank = LETTER_BANKS[this.lang] || LETTER_BANKS.en;
        const activeLetters = new Set(this.activeWords.map(w => w.text));
        const available = letterBank.filter(l => !activeLetters.has(l));
        const letter = available.length > 0 ? available[Math.floor(Math.random() * available.length)] : letterBank[Math.floor(Math.random() * letterBank.length)];
        const graphemes = [letter];

        // 4 distinct vertical lanes across canvas
        const numLanes = 4;
        const padding = Math.max(45, this.canvasWidth * 0.10);
        const availableWidth = this.canvasWidth - padding * 2;
        const laneWidth = availableWidth / numLanes;

        if (this.activeWords.length >= 4) return;

        const occupiedLanes = new Set();
        this.activeWords.forEach(w => {
          if (w.lane !== undefined) occupiedLanes.add(w.lane);
        });

        const freeLanes = [];
        for (let l = 0; l < numLanes; l++) {
          if (!occupiedLanes.has(l)) freeLanes.push(l);
        }
        if (freeLanes.length === 0) return;
        const chosenLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];

        const bx = padding + (chosenLane + 0.5) * laneWidth;
        const palette = BUBBLE_PALETTES[Math.floor(Math.random() * BUBBLE_PALETTES.length)];
        const bubbleRadius = 28;
        const isFirst = (this.activeWords.length === 0);
        const startY = isFirst ? 45 : -35;

        const bubbleObj = {
          text: letter,
          graphemes: graphemes,
          lane: chosenLane,
          x: bx,
          baseX: bx,
          y: startY,
          width: 56,
          height: 56,
          radius: bubbleRadius,
          speed: this.getSpeedForWord(),
          color: palette,
          phase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.012,
          wobbleAmp: 4,
          shakeOffset: 0,
          shakeFrames: 0,
          spawnTime: Date.now(),
          popped: false
        };

        // For backward compatibility with tests
        bubbleObj.bubbles = [{
          char: letter,
          x: bx,
          y: bubbleObj.y,
          radius: bubbleRadius,
          popped: false,
          color: palette
        }];

        this.activeWords.push(bubbleObj);
        if (this.activeWords.length === 1) {
          this.currentWordIdx = 0;
          this.charIndex = 0;
          this.composer = { raw: '', outLen: 0 };
        }
      } else if (isWordTyping) {
        // --- 2. WORD TYPING CHALLENGE: PROMINENT TARGET WORD AT TOP ---
        if (this.wordTypingIndex >= this.targetWordsCount) {
          this.gameOver(true);
          return;
        }
        const wordText = this.wordTypingList[this.wordTypingIndex] || 'focus';
        const graphemes = splitGraphemes(wordText, this.lang);
        const wordObj = {
          text: wordText,
          graphemes: graphemes,
          x: this.canvasWidth / 2,
          y: 110,
          baseX: this.canvasWidth / 2,
          width: Math.min(this.canvasWidth * 0.88, 340),
          height: 84,
          speed: 0,
          shakeOffset: 0,
          shakeFrames: 0,
          spawnTime: Date.now()
        };
        this.activeWords = [wordObj];
        this.currentWordIdx = 0;
        this.charIndex = 0;
        this.currentWordHadMistake = false;
        this.composer = { raw: '', outLen: 0 };
      } else {
        // --- 3. FALLING WORDS CHALLENGE: EXACTLY 1 WORD FALLING AT A TIME ---
        this.activeWords = []; // Strictly ensure only 1 word falls at any time

        const tiers = WORD_TIERS[this.lang] || WORD_TIERS.en;
        const progress = this.wordsCompleted + this.wordsMissed;
        let pool = tiers.easy;
        if (progress >= 25) pool = tiers.hard;
        else if (progress >= 10) pool = tiers.medium;

        const wordText = pool[Math.floor(Math.random() * pool.length)];
        const graphemes = splitGraphemes(wordText, this.lang);
        const initialX = this.canvasWidth / 2;
        const initialY = 40;
        const boxWidth = Math.min(this.canvasWidth * 0.86, Math.max(140, graphemes.length * 32 + 60));

        const wordObj = {
          text: wordText,
          graphemes: graphemes,
          x: initialX,
          y: initialY,
          baseX: initialX,
          width: boxWidth,
          height: 48,
          phase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.025,
          wobbleAmp: 3,
          shakeOffset: 0,
          shakeFrames: 0,
          spawnTime: Date.now()
        };
        wordObj.speed = this.getSpeedForWord(wordObj);

        this.activeWords = [wordObj];
        this.currentWordIdx = 0;
        this.charIndex = 0;
        this.currentWordHadMistake = false;
        this.composer = { raw: '', outLen: 0 };
      }
    }

    getWordBubbles(wordObj) {
      if (!wordObj) return [];
      if (!wordObj.bubbles) {
        wordObj.bubbles = [{
          char: wordObj.text,
          x: wordObj.x,
          y: wordObj.y,
          radius: wordObj.radius || 28,
          popped: false,
          color: wordObj.color
        }];
      }
      return wordObj.bubbles;
    }

    handleKeystroke(char) {
      if (!this.active || this.paused || this.activeWords.length === 0) return;

      // Mechanical key click sound feedback on every keystroke by default
      playSound('type');

      let targetWord = this.activeWords[this.currentWordIdx] || this.activeWords[0];
      if (!targetWord) return;

      let typedChar = char;

      // Handle Tamil transliteration if Tamil layout is active
      if (this.lang === 'ta' && (this.layout === 'tamil99' || this.layout === 'typewriter')) {
        const keymap = (window.KEYMAPS && window.KEYMAPS[this.layout]) || (typeof KEYMAPS !== 'undefined' ? KEYMAPS[this.layout] : null) || {};
        const prefixes = (window.KEYMAP_PREFIXES && window.KEYMAP_PREFIXES[this.layout]) || (typeof KEYMAP_PREFIXES !== 'undefined' ? KEYMAP_PREFIXES[this.layout] : null) || new Set();

        const newBuf = this.composer.raw + char;

        if (Object.prototype.hasOwnProperty.call(keymap, newBuf)) {
          typedChar = keymap[newBuf];
          this.composer.raw = newBuf;
          this.composer.outLen = typedChar.length;
        } else if (prefixes.has(newBuf)) {
          this.composer.raw = newBuf;
          return; // Wait for resolving keystroke
        } else {
          if (Object.prototype.hasOwnProperty.call(keymap, char)) {
            typedChar = keymap[char];
            this.composer.raw = char;
            this.composer.outLen = typedChar.length;
          } else {
            this.composer.raw = '';
            this.composer.outLen = 0;
          }
        }
      }

      const checkLetterMatch = (tChar, expected) => {
        if (!expected) return false;
        return (this.lang === 'en')
          ? (tChar.toLowerCase() === expected.toLowerCase())
          : (tChar === expected || (expected.startsWith(tChar) && tChar.length < expected.length));
      };

      if (this.gameType === 'bubble') {
        // --- BUBBLE CHALLENGE: SUPPORTS INDIVIDUAL LETTERS (NATURAL) & PROGRESSIVE WORDS ---
        let matchedIndex = -1;
        let targetBubble = this.activeWords[this.currentWordIdx] || this.activeWords[0];

        // Check current focused bubble at charIndex
        if (targetBubble && targetBubble.graphemes) {
          const expected = targetBubble.graphemes[this.charIndex];
          if (checkLetterMatch(typedChar, expected)) {
            matchedIndex = this.currentWordIdx;
          }
        }

        // If not matched on current and student has not started typing it (charIndex === 0), search other active bubbles
        if (matchedIndex === -1 && this.charIndex === 0) {
          for (let idx = 0; idx < this.activeWords.length; idx++) {
            const b = this.activeWords[idx];
            if (b && !b.popped && b.graphemes && checkLetterMatch(typedChar, b.graphemes[0])) {
              matchedIndex = idx;
              this.currentWordIdx = idx;
              targetBubble = b;
              break;
            }
          }
        }

        if (matchedIndex !== -1 && targetBubble) {
          const expected = targetBubble.graphemes[this.charIndex];
          if (this.lang === 'ta' && typedChar !== expected && expected.startsWith(typedChar)) {
            return; // Wait for resolving Tamil keystroke
          }

          this.correctChars++;
          this.score += 1;
          this.charIndex++;
          this.composer = { raw: '', outLen: 0 };

          playSound('hit');
          playSound('pop');
          this.spawnBubblePopBurst(targetBubble.x, targetBubble.y);
          this.addFloatingTip(targetBubble.x, targetBubble.y - 18, '+1', '#fbbf24');

          // Check if bubble is fully completed
          if (this.charIndex >= targetBubble.graphemes.length) {
            if (targetBubble.graphemes.length > 1) {
              this.score += 5; // +5 bonus for multi-letter words
              this.addFloatingTip(targetBubble.x, targetBubble.y - 24, '+5 WORD BONUS! 🔥', '#fbbf24');
            }
            this.wordsCompleted++;
            this.wordsCorrect++;
            targetBubble.popped = true;
            if (targetBubble.bubbles) {
              targetBubble.bubbles.forEach(b => { b.popped = true; });
            }

            this.activeWords.splice(matchedIndex, 1);
            this.currentWordIdx = 0;
            this.charIndex = 0;
            this.updateHUD();

            if (this.activeWords.length === 0) {
              this.spawnWord();
            }
          } else {
            this.updateHUD();
          }
        } else {
          // Mistake in bubble mode
          this.incorrectChars++;
          this.keystrokeMistakes++;
          this.composer = { raw: '', outLen: 0 };

          const b = this.activeWords[this.currentWordIdx] || this.activeWords[0];
          const expected = (b && b.graphemes) ? b.graphemes[this.charIndex || 0] : '';
          const mistakeEntry = {
            expected: expected,
            actual: typedChar,
            word: b ? b.text : '',
            time: Date.now()
          };
          this.mistakesLog.push(mistakeEntry);
          if (expected) {
            this.weakKeysMap[expected] = (this.weakKeysMap[expected] || 0) + 1;
          }
          if (b && b.text) {
            this.wordMistakesMap[b.text] = (this.wordMistakesMap[b.text] || 0) + 1;
          }

          playSound('error');
          triggerHaptic('error');

          if (b) {
            b.shakeFrames = 14;
            this.addFloatingTip(b.x, b.y + 24, `Oops! Typed '${typedChar}'`, '#ef4444');
          }
          this.updateHUD();
        }
        return;
      }

      // --- FALLING WORDS OR WORD TYPING CHALLENGE ---
      let targetGrapheme = targetWord.graphemes[this.charIndex];
      if (!targetGrapheme) return;

      const isMatch = checkLetterMatch(typedChar, targetGrapheme);

      if (isMatch) {
        // If it's a partial prefix in Tamil, wait for resolving key
        if (this.lang === 'ta' && typedChar !== targetGrapheme && targetGrapheme.startsWith(typedChar)) {
          return;
        }

        this.correctChars++;
        this.score += 1;
        this.charIndex++;
        this.composer = { raw: '', outLen: 0 };

        playSound('hit');
        this.spawnSparks(targetWord.x, targetWord.y, '#10b981');
        this.updateHUD();

        // Check if word completed
        if (this.charIndex >= targetWord.graphemes.length) {
          // Word Complete Bonus (+5 points)
          this.score += 5;
          this.wordsCompleted++;
          if (!this.currentWordHadMistake) {
            this.wordsCorrect++;
          } else {
            this.wordsIncorrect++;
          }

          playSound('bonus');
          this.spawnWordExplosion(targetWord.x, targetWord.y);
          this.addFloatingTip(targetWord.x, targetWord.y - 20, '+5 WORD BONUS! 🔥', '#fbbf24');

          if (this.gameType === 'falling') {
            // Adaptive speed: slightly increase speed if typed without mistakes
            if (!this.currentWordHadMistake) {
              this.adaptiveBaseSpeed = Math.min(0.85, this.adaptiveBaseSpeed + 0.035);
            } else {
              this.adaptiveBaseSpeed = Math.max(0.40, this.adaptiveBaseSpeed - 0.02);
            }
            this.activeWords = [];
            this.charIndex = 0;
            this.currentWordIdx = 0;
            this.updateHUD();

            // Check if 35 words session reached
            if (this.wordsCompleted + this.wordsMissed >= this.targetWordsCount) {
              this.gameOver(true); // Session Victory!
            } else {
              this.spawnWord();
            }
          } else if (this.gameType === 'word_typing') {
            this.wordTypingIndex++;
            this.activeWords = [];
            this.charIndex = 0;
            this.currentWordIdx = 0;
            this.updateHUD();

            // Check if 35 words session reached
            if (this.wordTypingIndex >= this.targetWordsCount) {
              this.gameOver(true); // Session Victory!
            } else {
              this.spawnWord();
            }
          }
        }
      } else {
        // --- MISTAKE RECORDED (NO ADVANCE) ---
        this.incorrectChars++;
        this.keystrokeMistakes++;
        this.currentWordHadMistake = true;
        this.composer = { raw: '', outLen: 0 };

        // Adaptive speed: reduce speed slightly on mistake for student comfort
        if (this.gameType === 'falling') {
          this.adaptiveBaseSpeed = Math.max(0.38, this.adaptiveBaseSpeed - 0.035);
        }

        const mistakeEntry = {
          expected: targetGrapheme,
          actual: typedChar,
          word: targetWord.text,
          time: Date.now()
        };
        this.mistakesLog.push(mistakeEntry);
        this.weakKeysMap[targetGrapheme] = (this.weakKeysMap[targetGrapheme] || 0) + 1;
        this.wordMistakesMap[targetWord.text] = (this.wordMistakesMap[targetWord.text] || 0) + 1;

        targetWord.shakeFrames = 12;
        targetWord.shakeOffset = 10;
        this.addFloatingTip(targetWord.x, targetWord.y + 24, `Oops! Typed '${typedChar}' not '${targetGrapheme}'`, '#ef4444');

        playSound('error');
        triggerHaptic('error');
        this.updateHUD();
      }
    }

    spawnBubblePopBurst(x, y) {
      const colors = ['#fef08a', '#fbbf24', '#f59e0b', '#d97706', '#ffffff'];
      for (let i = 0; i < 16; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 4.5;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          radius: 2 + Math.random() * 2.5,
          alpha: 1.0,
          decay: 0.04
        });
      }
    }

    addFloatingTip(x, y, text, color) {
      this.floatingTips.push({
        x: x,
        y: y,
        text: text,
        color: color || '#ffffff',
        alpha: 1.0,
        dy: -1.2,
        life: 45
      });
    }

    spawnSparks(x, y, color) {
      for (let i = 0; i < 6; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: color,
          radius: 2 + Math.random() * 2,
          alpha: 1.0,
          decay: 0.05
        });
      }
    }

    spawnWordExplosion(x, y) {
      const colors = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'];
      for (let i = 0; i < 20; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 2 + Math.random() * 5;
        this.particles.push({
          x: x,
          y: y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          color: colors[Math.floor(Math.random() * colors.length)],
          radius: 3 + Math.random() * 3,
          alpha: 1.0,
          decay: 0.035
        });
      }
    }

    loop(timestamp) {
      if (!this.active) return;
      if (this.paused) return;

      this.update(timestamp);
      this.render();

      this.animFrameId = requestAnimationFrame(this.loop);
    }

    update(timestamp) {
      const isBubble = (this.gameType === 'bubble');
      const isWordTyping = (this.gameType === 'word_typing');
      const now = Date.now();

      // Ambient dust in bubble mode
      if (this.ambientDust && isBubble) {
        for (let i = 0; i < this.ambientDust.length; i++) {
          const d = this.ambientDust[i];
          d.y -= d.speed;
          if (d.y < 0) {
            d.y = this.canvasHeight;
            d.x = Math.random() * this.canvasWidth;
          }
        }
      }

      // Spawning periodic elements
      if (isBubble) {
        if (now - this.lastSpawnTime > 2200 && this.activeWords.length < 4) {
          this.spawnWord();
          this.lastSpawnTime = now;
        }
      } else if (!isWordTyping) {
        // Falling mode: only 1 word at a time
        if (this.activeWords.length === 0) {
          this.spawnWord();
        }
      }

      // Dynamic speed update
      for (let s = 0; s < this.activeWords.length; s++) {
        const w = this.activeWords[s];
        w.speed = this.getSpeedForWord(w);
      }

      // Update positions
      for (let i = this.activeWords.length - 1; i >= 0; i--) {
        const w = this.activeWords[i];

        // Wobble physics
        if (w.wobbleSpeed) {
          w.phase = (w.phase || 0) + w.wobbleSpeed;
          w.x = w.baseX + Math.sin(w.phase) * (w.wobbleAmp || 3);
        }

        // Shake physics on error
        if (w.shakeFrames > 0) {
          w.shakeFrames--;
          w.shakeOffset = (w.shakeFrames % 2 === 0 ? 1 : -1) * (w.shakeFrames * 0.8);
        } else {
          w.shakeOffset = 0;
        }

        if (isBubble) {
          // Bubble moves downward
          w.y += w.speed;
          if (w.bubbles && w.bubbles.length > 0) {
            w.bubbles[0].x = w.x;
            w.bubbles[0].y = w.y;
            w.bubbles[0].shakeOffset = w.shakeOffset;
            w.bubbles[0].shakeFrames = w.shakeFrames;
          }

          const floorBoundary = this.canvasHeight - 65;
          if (w.y >= floorBoundary) {
            this.handleWordMiss(i);
          }
        } else if (!isWordTyping) {
          // Falling words move downward
          w.y += w.speed;
          if (w.y >= this.canvasHeight - 110) {
            this.handleWordMiss(i);
          }
        }
      }

      // Update particles
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.alpha -= p.decay;
        if (p.alpha <= 0) this.particles.splice(i, 1);
      }

      // Update floating tips
      for (let i = this.floatingTips.length - 1; i >= 0; i--) {
        const tip = this.floatingTips[i];
        tip.y += tip.dy;
        tip.life--;
        tip.alpha = Math.max(0, tip.life / 45);
        if (tip.life <= 0) this.floatingTips.splice(i, 1);
      }
    }

    handleWordMiss(wordIndex) {
      const missedWord = this.activeWords[wordIndex];
      this.wordsMissed++;
      this.lives--;

      playSound('miss');
      triggerHaptic('miss');
      const missX = missedWord ? missedWord.x : this.canvasWidth / 2;
      const missY = missedWord ? missedWord.y : 50;
      this.spawnSparks(missX, missY, '#ef4444');
      this.addFloatingTip(missX, missY, 'BOUNDARY MISSED! 💔', '#ef4444');

      if (missedWord) {
        this.wordMistakesMap[missedWord.text] = (this.wordMistakesMap[missedWord.text] || 0) + 1;
      }

      this.activeWords.splice(wordIndex, 1);
      this.currentWordIdx = 0;
      this.charIndex = 0;
      this.composer = { raw: '', outLen: 0 };
      this.updateHUD();

      // Check Game Over
      if (this.lives <= 0) {
        this.gameOver(false);
      } else if (this.gameType === 'falling' && (this.wordsCompleted + this.wordsMissed >= this.targetWordsCount)) {
        this.gameOver(true); // Completed session
      } else if (this.activeWords.length === 0) {
        this.spawnWord();
      }
    }

    skipWord() {
      if (!this.active || this.paused || this.activeWords.length === 0) return;
      this.wordsMissed++;
      playSound('miss');
      triggerHaptic('miss');

      if (this.gameType === 'word_typing') {
        this.wordTypingIndex++;
        this.activeWords = [];
        this.charIndex = 0;
        this.composer = { raw: '', outLen: 0 };
        this.updateHUD();
        if (this.wordTypingIndex >= this.targetWordsCount) {
          this.gameOver(true);
        } else {
          this.spawnWord();
        }
      } else {
        this.lives--;
        this.activeWords.splice(this.currentWordIdx, 1);
        this.currentWordIdx = 0;
        this.charIndex = 0;
        this.composer = { raw: '', outLen: 0 };
        this.updateHUD();
        if (this.lives <= 0) {
          this.gameOver(false);
        } else if (this.gameType === 'falling' && (this.wordsCompleted + this.wordsMissed >= this.targetWordsCount)) {
          this.gameOver(true);
        } else if (this.activeWords.length === 0) {
          this.spawnWord();
        }
      }
    }

    updateHUD() {
      const scoreEl = document.getElementById('gameScoreDisplay');
      if (scoreEl) scoreEl.textContent = this.score;

      const totalStrokes = this.correctChars + this.incorrectChars;
      const acc = totalStrokes > 0 ? Math.round((this.correctChars / totalStrokes) * 100) : 100;
      const accEl = document.getElementById('gameAccuracyDisplay');
      if (accEl) accEl.textContent = `${acc}%`;

      const speedEl = document.getElementById('gameSpeedDisplay');
      if (speedEl) {
        if (this.gameType === 'word_typing') {
          speedEl.textContent = `${this.wordTypingIndex + 1}/${this.targetWordsCount}`;
        } else {
          const speedTier = 1 + Math.min(Math.floor(this.score / 25), 4);
          speedEl.textContent = speedTier;
        }
      }

      const heartsContainer = document.getElementById('gameHeartsDisplay');
      if (heartsContainer) {
        let heartsHtml = '';
        const totalSlots = this.maxLives || 6;
        for (let i = 0; i < totalSlots; i++) {
          if (i < this.wordsMissed) {
            heartsHtml += `<span class="game-miss-slot missed" title="Missed" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:2px solid #ef4444;background:rgba(239,68,68,0.18);color:#ef4444;font-size:13px;font-weight:900;line-height:1;margin:0 1px;">Ø</span>`;
          } else {
            heartsHtml += `<span class="game-miss-slot open" title="Life available" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:2px solid #3b82f6;background:transparent;color:#3b82f6;font-size:13px;font-weight:700;line-height:1;margin:0 1px;">Ø</span>`;
          }
        }
        heartsContainer.innerHTML = heartsHtml;
      }

      const corEl = document.getElementById('gameCorrectStrokes');
      if (corEl) corEl.textContent = this.correctChars;
      const wrgEl = document.getElementById('gameWrongStrokes');
      if (wrgEl) wrgEl.textContent = this.incorrectChars;
    }

    render() {
      if (!this.ctx) return;
      const ctx = this.ctx;
      const w = this.canvasWidth;
      const h = this.canvasHeight;
      const isBubble = (this.gameType === 'bubble');
      const isWordTyping = (this.gameType === 'word_typing');

      ctx.clearRect(0, 0, w, h);

      if (isBubble) {
        // --- BUBBLE MODE BACKGROUND ---
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0.0, '#b8c6fa');
        skyGrad.addColorStop(0.5, '#a8b6fc');
        skyGrad.addColorStop(1.0, '#9cb0f6');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        if (this.watermarkImg && this.watermarkImg.complete && this.watermarkImg.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = 0.12;
          const wmWidth = Math.min(w * 0.55, 260);
          const wmAspect = this.watermarkImg.naturalWidth / this.watermarkImg.naturalHeight;
          const wmHeight = wmWidth / wmAspect;
          const wmX = (w - wmWidth) / 2;
          const wmY = (h - wmHeight) / 2;
          ctx.drawImage(this.watermarkImg, wmX, wmY, wmWidth, wmHeight);
          ctx.restore();
        }

        if (this.ambientDust) {
          ctx.save();
          for (let i = 0; i < this.ambientDust.length; i++) {
            const d = this.ambientDust[i];
            ctx.fillStyle = `rgba(255, 255, 255, ${d.alpha * 1.2})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // Baseline defense boundary
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, h - 1);
        ctx.lineTo(w, h - 1);
        ctx.stroke();

        // Render letter bubbles
        this.activeWords.forEach((bubbleObj, idx) => {
          this.renderBubble(ctx, bubbleObj, true);
        });

      } else if (isWordTyping) {
        // --- NEW GAME: WORD TYPING CHALLENGE ARENA ---
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(0, 0, w, h);

        const trackWidth = Math.min(w * 0.90, 360);
        const trackX = (w - trackWidth) / 2;

        // 1. Header Banner
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 15px system-ui, -apple-system, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('⌨️ WORD TYPING CHALLENGE', w / 2, 16);

        // Progress pill
        const progStr = `Word ${this.wordTypingIndex + 1} of ${this.targetWordsCount}`;
        ctx.fillStyle = '#2563eb';
        ctx.font = 'bold 12px system-ui, sans-serif';
        ctx.fillText(progStr, w / 2, 40);

        // Progress bar background & fill
        const pbarW = trackWidth * 0.85;
        const pbarH = 6;
        const pbarX = (w - pbarW) / 2;
        const pbarY = 58;
        ctx.fillStyle = '#e2e8f0';
        this.drawRoundRect(ctx, pbarX, pbarY, pbarW, pbarH, 3);
        ctx.fill();

        const pct = Math.min(1.0, (this.wordTypingIndex + 1) / this.targetWordsCount);
        ctx.fillStyle = '#2563eb';
        this.drawRoundRect(ctx, pbarX, pbarY, pbarW * pct, pbarH, 3);
        ctx.fill();
        ctx.restore();

        // 2. Central Prominent Target Word Card
        const targetWord = this.activeWords[0];
        if (targetWord) {
          const cardW = trackWidth;
          const cardH = 92;
          const cardX = trackX + (targetWord.shakeOffset || 0);
          const cardY = 76;

          ctx.save();
          ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
          ctx.shadowBlur = 14;
          ctx.shadowOffsetY = 4;
          ctx.fillStyle = '#ffffff';
          this.drawRoundRect(ctx, cardX, cardY, cardW, cardH, 16);
          ctx.fill();
          ctx.restore();

          ctx.strokeStyle = '#cbd5e1';
          ctx.lineWidth = 1.5;
          this.drawRoundRect(ctx, cardX, cardY, cardW, cardH, 16);
          ctx.stroke();

          // Render target word letters with high legibility
          ctx.save();
          const isTamil = (this.lang === 'ta');
          const fontSize = isTamil ? 25 : 28;
          ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", "Mukta Malar", system-ui, serif`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          const targetGraphemes = targetWord.graphemes || [];
          const gWidths = targetGraphemes.map(g => ctx.measureText(g).width);
          const totalW = gWidths.reduce((a, b) => a + b, 0);
          let curX = cardX + (cardW - totalW) / 2;
          const textY = cardY + cardH / 2;

          for (let g = 0; g < targetGraphemes.length; g++) {
            const char = targetGraphemes[g];
            const cw = gWidths[g];
            if (g < this.charIndex) {
              // Typed letter: emerald green
              ctx.fillStyle = '#16a34a';
              ctx.fillText(char, curX, textY);
            } else if (g === this.charIndex) {
              // Current target letter: vivid blue with underline
              ctx.fillStyle = '#2563eb';
              ctx.fillText(char, curX, textY);
              ctx.save();
              ctx.fillStyle = '#2563eb';
              ctx.fillRect(curX, textY + fontSize * 0.45, cw, 2.5);
              ctx.restore();
            } else {
              // Upcoming letter: slate
              ctx.fillStyle = '#64748b';
              ctx.fillText(char, curX, textY);
            }
            curX += cw;
          }
          ctx.restore();

          // 3. Bottom Typing Input Slot (Clean & accessible above soft keyboard)
          const dockW = trackWidth;
          const dockH = 54;
          const dockX = trackX;
          const dockY = cardY + cardH + 20;

          ctx.save();
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(37, 99, 235, 0.12)';
          ctx.shadowBlur = 10;
          this.drawRoundRect(ctx, dockX, dockY, dockW, dockH, 12);
          ctx.fill();
          ctx.strokeStyle = '#93c5fd';
          ctx.lineWidth = 1.5;
          this.drawRoundRect(ctx, dockX, dockY, dockW, dockH, 12);
          ctx.stroke();

          // Typed text preview inside slot
          ctx.font = `bold ${isTamil ? 20 : 22}px Georgia, "Times New Roman", "Mukta Malar", system-ui, serif`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'center';
          ctx.fillStyle = '#1e293b';

          const typedSubstr = targetWord.text.slice(0, this.charIndex);
          const cursorBlink = Math.floor(Date.now() / 450) % 2 === 0 ? '|' : '';
          ctx.fillText((typedSubstr || 'Type here...') + (typedSubstr ? cursorBlink : ''), w / 2, dockY + dockH / 2);
          ctx.restore();
        }

      } else {
        // --- FALLING WORDS CHALLENGE ---
        ctx.fillStyle = '#eef2f9';
        ctx.fillRect(0, 0, w, h);

        const trackWidth = Math.min(w * 0.84, 340);
        const trackX = (w - trackWidth) / 2;
        const trackY = 12;
        const trackHeight = h - 24;

        ctx.save();
        ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#f8faff';
        this.drawRoundRect(ctx, trackX, trackY, trackWidth, trackHeight, 10);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#d5defc';
        ctx.lineWidth = 1.5;
        this.drawRoundRect(ctx, trackX, trackY, trackWidth, trackHeight, 10);
        ctx.stroke();

        // Bottom U-shaped container / dock
        const dockWidth = trackWidth * 0.94;
        const dockHeight = 110;
        const dockX = trackX + (trackWidth - dockWidth) / 2;
        const dockY = trackY + trackHeight - dockHeight - 8;
        const wallThickness = 14;

        ctx.save();
        ctx.fillStyle = '#9cb0f8';
        ctx.shadowColor = 'rgba(99, 102, 241, 0.25)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        this.drawRoundRect(ctx, dockX, dockY, dockWidth, dockHeight, 12);
        ctx.fill();
        ctx.restore();

        ctx.fillStyle = '#f8faff';
        this.drawRoundRect(ctx, dockX + wallThickness, dockY, dockWidth - (wallThickness * 2), dockHeight - wallThickness, 6);
        ctx.fill();

        ctx.strokeStyle = '#7c8fe6';
        ctx.lineWidth = 1.5;
        this.drawRoundRect(ctx, dockX, dockY, dockWidth, dockHeight, 12);
        ctx.stroke();

        // Landing slot
        const baseBarWidth = dockWidth - (wallThickness * 2) - 10;
        const baseBarHeight = 36;
        const baseBarX = dockX + wallThickness + 5;
        const baseBarY = dockY + dockHeight - wallThickness - baseBarHeight - 4;

        const baseBarGrad = ctx.createLinearGradient(baseBarX, baseBarY, baseBarX, baseBarY + baseBarHeight);
        baseBarGrad.addColorStop(0, '#ffffff');
        baseBarGrad.addColorStop(1, '#e2e8f0');
        ctx.fillStyle = baseBarGrad;
        this.drawRoundRect(ctx, baseBarX, baseBarY, baseBarWidth, baseBarHeight, 6);
        ctx.fill();
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 1;
        this.drawRoundRect(ctx, baseBarX, baseBarY, baseBarWidth, baseBarHeight, 6);
        ctx.stroke();

        // Target word text inside landing slot - guaranteed 100% synchronized with active falling word!
        const curTarget = this.activeWords[0];
        if (curTarget) {
          ctx.save();
          const targetGraphemes = curTarget.graphemes || [];
          const isTamil = (this.lang === 'ta');
          const fontSize = isTamil ? 16 : 17;
          ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", "Mukta Malar", system-ui, serif`;
          ctx.textBaseline = 'middle';
          ctx.textAlign = 'left';

          const gWidths = targetGraphemes.map(g => ctx.measureText(g).width);
          const totalW = gWidths.reduce((a, b) => a + b, 0);
          let startX = dockX + (dockWidth - totalW) / 2;
          const slotTextY = baseBarY + baseBarHeight / 2;

          for (let g = 0; g < targetGraphemes.length; g++) {
            const char = targetGraphemes[g];
            const cw = gWidths[g];
            if (g < this.charIndex) {
              ctx.fillStyle = '#16a34a';
              ctx.fillText(char, startX, slotTextY);
            } else if (g === this.charIndex) {
              ctx.fillStyle = '#2563eb';
              ctx.fillText(char, startX, slotTextY);
              ctx.save();
              ctx.fillStyle = '#2563eb';
              ctx.fillRect(startX, slotTextY + 9, cw, 2);
              ctx.restore();
            } else {
              ctx.fillStyle = '#64748b';
              ctx.fillText(char, startX, slotTextY);
            }
            startX += cw;
          }
          ctx.restore();
        }

        // Render Falling Word block
        if (this.activeWords.length > 0) {
          this.renderFallingWordEntity(this.activeWords[0], true);
        }
      }

      // Render Particles
      this.particles.forEach(p => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // Render Floating Callout Tips
      this.floatingTips.forEach(tip => {
        ctx.save();
        ctx.globalAlpha = tip.alpha;
        ctx.fillStyle = tip.color;
        ctx.font = 'bold 13px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.85)';
        ctx.shadowBlur = 6;
        ctx.fillText(tip.text, tip.x, tip.y);
        ctx.restore();
      });
    }

    renderBubble(ctx, b, isCurrentTarget) {
      if (b.popped) return;

      const bx = b.x + (b.shakeOffset || 0);
      const by = b.y;
      const palette = b.color || { main: '#4f46e5', dark: '#3730a3', light: '#a5b4fc' };
      const textToDisplay = b.text || b.char || '';
      const isTamil = (this.lang === 'ta');
      const fontSize = isTamil ? 20 : 22;
      const r = b.radius || 28;

      ctx.save();

      // Outer glow / shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // 3D Spherical Circular Gradient
      const grad = ctx.createRadialGradient(
        bx - r * 0.3, by - r * 0.3, r * 0.1,
        bx, by, r
      );
      grad.addColorStop(0.0, palette.light);
      grad.addColorStop(0.5, palette.main);
      grad.addColorStop(1.0, palette.dark);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      // Delicate rim stroke
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.lineWidth = 1.8;
      ctx.stroke();

      // Specular Glossy Highlight
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
      ctx.beginPath();
      ctx.ellipse(bx - r * 0.25, by - r * 0.4, r * 0.35, r * 0.18, -Math.PI / 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.restore(); // Restore shadow

      // Render centered letter
      ctx.save();
      ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", "Mukta Malar", system-ui, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1.5;
      ctx.fillText(textToDisplay, bx, by + 1);
      ctx.restore();
    }

    renderFallingWordEntity(wordObj, isActiveTarget) {
      const ctx = this.ctx;
      const w = this.canvasWidth;
      const trackWidth = Math.min(w * 0.84, 340);
      const trackX = (w - trackWidth) / 2;
      const blockWidth = trackWidth * 0.88;
      const blockHeight = 44;
      const bx = trackX + (trackWidth - blockWidth) / 2 + (wordObj.shakeOffset || 0);
      const by = wordObj.y;

      ctx.save();

      ctx.shadowColor = 'rgba(101, 163, 13, 0.45)';
      ctx.shadowBlur = 14;
      ctx.shadowOffsetY = 4;

      const blockGrad = ctx.createLinearGradient(bx, by, bx, by + blockHeight);
      blockGrad.addColorStop(0.0, '#7cb305');
      blockGrad.addColorStop(0.4, '#65a30d');
      blockGrad.addColorStop(1.0, '#4d7c0f');

      ctx.fillStyle = blockGrad;
      this.drawRoundRect(ctx, bx, by, blockWidth, blockHeight, 6);
      ctx.fill();

      ctx.strokeStyle = '#3f6212';
      ctx.lineWidth = 1.5;
      this.drawRoundRect(ctx, bx, by, blockWidth, blockHeight, 6);
      ctx.stroke();

      ctx.restore(); // Restore shadow

      // Render Word inside the block
      ctx.save();
      const isTamil = (this.lang === 'ta');
      const fontSize = isTamil ? 20 : 21;
      ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", "Mukta Malar", system-ui, serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      const graphemes = wordObj.graphemes;
      const graphemeWidths = graphemes.map(g => ctx.measureText(g).width);
      const totalTextWidth = graphemeWidths.reduce((a, b) => a + b, 0);

      let curX = bx + (blockWidth - totalTextWidth) / 2;
      const textY = by + blockHeight / 2 + 1;

      for (let i = 0; i < graphemes.length; i++) {
        const char = graphemes[i];
        const charW = graphemeWidths[i];

        if (i < this.charIndex) {
          ctx.fillStyle = '#fef08a';
          ctx.shadowColor = 'rgba(254, 240, 138, 0.8)';
          ctx.shadowBlur = 6;
        } else if (i === this.charIndex) {
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
          ctx.shadowBlur = 10;
          ctx.save();
          ctx.fillStyle = '#fef08a';
          ctx.fillRect(curX, textY + 11, charW, 2.5);
          ctx.restore();
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
          ctx.shadowBlur = 2;
        }

        ctx.fillText(char, curX, textY);
        curX += charW;
      }

      ctx.restore();
    }

    drawRoundRect(ctx, x, y, width, height, radius) {
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.lineTo(x + width - radius, y);
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      ctx.lineTo(x + width, y + height - radius);
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
      ctx.lineTo(x + radius, y + height);
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      ctx.lineTo(x, y + radius);
      ctx.quadraticCurveTo(x, y, x + radius, y);
      ctx.closePath();
    }

    gameOver(isSessionVictory) {
      this.active = false;
      this.paused = false;
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

      this.endTime = Date.now();
      const durationSec = Math.max(1, Math.round((this.endTime - (this.startTime || this.endTime)) / 1000));
      const totalStrokes = this.correctChars + this.incorrectChars;
      const accuracy = totalStrokes > 0 ? Number(((this.correctChars / totalStrokes) * 100).toFixed(1)) : 100;
      const wpm = Number(((this.correctChars / 5) / (durationSec / 60)).toFixed(1));

      let title = 'Bubble Letter Challenge';
      if (this.gameType === 'falling') title = 'Falling Words Challenge';
      else if (this.gameType === 'word_typing') title = 'Word Typing Challenge';

      const wordsAttempted = Math.max(this.wordsCompleted + this.wordsMissed, (this.gameType === 'word_typing' ? this.wordTypingIndex : 0));

      const report = {
        id: `game_${Date.now()}`,
        gameType: this.gameType,
        gameTitle: title,
        lang: this.lang,
        layout: this.layout,
        score: this.score,
        accuracy: accuracy,
        wpm: wpm,
        durationSec: durationSec,
        wordsAttempted: wordsAttempted,
        wordsCompleted: this.wordsCompleted,
        wordsCorrect: this.wordsCorrect,
        wordsIncorrect: this.wordsIncorrect,
        wordsMissed: this.wordsMissed,
        keystrokeMistakes: this.keystrokeMistakes || this.incorrectChars,
        correctChars: this.correctChars,
        incorrectChars: this.incorrectChars,
        isVictory: !!isSessionVictory,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        weakKeys: Object.entries(this.weakKeysMap).map(([k, c]) => ({ key: k, count: c })).sort((a, b) => b.count - a.count),
        troubleWords: Object.entries(this.wordMistakesMap).map(([w, c]) => ({ word: w, count: c })).sort((a, b) => b.count - a.count)
      };

      // Persist to history and leaderboard
      this.saveGameSession(report);

      // Render Modal
      this.renderGameOverModal(report);
    }

    async saveGameSession(report) {
      try {
        let history = [];
        if (window.storage) {
          const res = await window.storage.get('games_history', false);
          const val = (res && typeof res === 'object' && res.value !== undefined) ? res.value : res;
          if (val) history = typeof val === 'string' ? JSON.parse(val) : val;
        } else {
          const local = localStorage.getItem('games_history');
          if (local) history = JSON.parse(local);
        }

        history.unshift(report);
        if (history.length > 100) history.pop();

        if (window.storage) {
          await window.storage.set('games_history', JSON.stringify(history), false);
        } else {
          localStorage.setItem('games_history', JSON.stringify(history));
        }

        await this.updateLeaderboardRecord(report);
      } catch (err) {
        console.error('Error saving game session:', err);
      }
    }

    async updateLeaderboardRecord(report) {
      try {
        let board = DEFAULT_LEADERBOARD;
        if (window.storage) {
          const res = await window.storage.get('games_leaderboard', false);
          const val = (res && typeof res === 'object' && res.value !== undefined) ? res.value : res;
          if (val) board = typeof val === 'string' ? JSON.parse(val) : val;
        } else {
          const local = localStorage.getItem('games_leaderboard');
          if (local) board = JSON.parse(local);
        }

        const studentName = (window.STUDENT_PROFILE && window.STUDENT_PROFILE.name && window.STUDENT_PROFILE.name.trim()) || 'You';
        const gameKey = report.gameType; // 'bubble' | 'falling' | 'word_typing'
        const trackKey = (report.lang === 'ta') ? report.layout : 'en';

        if (!board[gameKey]) board[gameKey] = {};
        if (!board[gameKey][trackKey]) board[gameKey][trackKey] = [];

        const list = board[gameKey][trackKey];
        const existingIdx = list.findIndex(item => item.name.toLowerCase() === studentName.toLowerCase() || item.isCurrentStudent);

        let isNewPB = false;

        if (existingIdx !== -1) {
          const existing = list[existingIdx];
          if (report.score > existing.score || (report.score === existing.score && report.accuracy > existing.accuracy)) {
            list[existingIdx] = {
              name: studentName,
              score: report.score,
              accuracy: report.accuracy,
              date: report.date,
              isCurrentStudent: true
            };
            isNewPB = true;
          }
        } else {
          list.push({
            name: studentName,
            score: report.score,
            accuracy: report.accuracy,
            date: report.date,
            isCurrentStudent: true
          });
          isNewPB = true;
        }

        list.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.accuracy - a.accuracy;
        });

        if (window.storage) {
          await window.storage.set('games_leaderboard', JSON.stringify(board), false);
        } else {
          localStorage.setItem('games_leaderboard', JSON.stringify(board));
        }

        report.isNewPB = isNewPB;
        if (isNewPB && window.NotificationService) {
          NotificationService.notifyGamePB(report.gameTitle, report.score, report.accuracy);
        }
      } catch (err) {
        console.error('Error updating leaderboard:', err);
      }
    }

    renderGameOverModal(report) {
      const modal = document.getElementById('gameOverModal');
      if (!modal) return;

      const titleEl = document.getElementById('goGameTitle');
      if (titleEl) {
        if (report.isVictory) {
          titleEl.textContent = `🎉 ${report.gameTitle} Completed!`;
        } else {
          titleEl.textContent = `${report.gameTitle} (${report.lang === 'ta' ? (report.layout === 'tamil99' ? 'Tamil99' : 'Tamil Typewriter') : 'English QWERTY'})`;
        }
      }

      const scoreEl = document.getElementById('goScoreValue');
      if (scoreEl) scoreEl.textContent = report.score;

      const accEl = document.getElementById('goAccValue');
      if (accEl) accEl.textContent = `${report.accuracy}%`;

      const wpmEl = document.getElementById('goWpmValue');
      if (wpmEl) wpmEl.textContent = `${report.wpm} WPM`;

      const wordsEl = document.getElementById('goWordsCleared');
      if (wordsEl) {
        if (report.isVictory) {
          wordsEl.textContent = `Session Complete: ${report.wordsCompleted} Cleared / ${report.wordsMissed} Missed`;
        } else {
          wordsEl.textContent = `${report.wordsCompleted} Cleared / ${report.wordsMissed} Missed`;
        }
      }

      // Populate dedicated results metrics if present in modal DOM
      const timeEl = document.getElementById('goTimeValue');
      if (timeEl) {
        const mins = Math.floor(report.durationSec / 60);
        const secs = report.durationSec % 60;
        timeEl.textContent = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      }
      const wordsAttEl = document.getElementById('goWordsAttempted');
      if (wordsAttEl) wordsAttEl.textContent = report.wordsAttempted;
      const wordsCorEl = document.getElementById('goWordsCorrect');
      if (wordsCorEl) wordsCorEl.textContent = report.wordsCorrect;
      const wordsIncorEl = document.getElementById('goWordsIncorrect');
      if (wordsIncorEl) wordsIncorEl.textContent = report.wordsIncorrect;
      const wordsMisEl = document.getElementById('goWordsMissed');
      if (wordsMisEl) wordsMisEl.textContent = report.wordsMissed;
      const mistEl = document.getElementById('goKeystrokeMistakes');
      if (mistEl) mistEl.textContent = report.keystrokeMistakes;

      // New PB Banner
      const pbBanner = document.getElementById('goPbBanner');
      if (pbBanner) {
        pbBanner.style.display = report.isNewPB ? 'block' : 'none';
      }

      // Weak Keys Heatmap
      const weakListEl = document.getElementById('goWeakKeysList');
      if (weakListEl) {
        if (report.weakKeys.length === 0) {
          weakListEl.innerHTML = '<span style="color:#10b981;font-weight:700;">🔥 God-tier typing! Zero mistyped keys!</span>';
        } else {
          weakListEl.innerHTML = report.weakKeys.slice(0, 5).map(item => `
            <span class="anti-choke-chip">
              <strong>${item.key}</strong>: ${item.count} ${item.count === 1 ? 'error' : 'errors'}
            </span>
          `).join('');
        }
      }

      // Trouble Words
      const troubleEl = document.getElementById('goTroubleWords');
      if (troubleEl) {
        if (report.troubleWords.length === 0) {
          troubleEl.innerHTML = '<span style="color:#10b981;">No hesitation detected on any word!</span>';
        } else {
          troubleEl.innerHTML = report.troubleWords.slice(0, 4).map(item => `
            <span style="display:inline-block;background:rgba(239,68,68,0.12);color:#ef4444;border-radius:6px;padding:3px 8px;font-size:12px;font-weight:700;margin:2px 4px;">
              ${item.word} (${item.count} ${item.count === 1 ? 'error' : 'errors'})
            </span>
          `).join('');
        }
      }

      modal.style.display = 'flex';
    }
  }

  // Instantiate singleton
  const engine = new GamesEngine();
  engine.playSound = playSound;
  window.GamesEngine = engine;

  // Global helper functions
  window.launchGame = function (gameType) {
    const selLang = document.getElementById('gameSetupLang') ? document.getElementById('gameSetupLang').value : 'en';
    const selLayout = document.getElementById('gameSetupLayout') ? document.getElementById('gameSetupLayout').value : (selLang === 'ta' ? 'tamil99' : 'qwerty');
    
    const setupModal = document.getElementById('gameSetupModal');
    if (setupModal) setupModal.style.display = 'none';

    engine.start(gameType, selLang, selLayout);
  };

  window.openGameSetup = function (gameType) {
    const modal = document.getElementById('gameSetupModal');
    if (!modal) return;
    const titleEl = document.getElementById('gameSetupTitle');
    if (titleEl) {
      if (gameType === 'bubble') titleEl.textContent = '🫧 Bubble Letter Challenge';
      else if (gameType === 'word_typing') titleEl.textContent = '🎯 Word Typing Challenge';
      else titleEl.textContent = '☄️ Falling Words Challenge';
    }
    const startBtn = document.getElementById('gameSetupStartBtn');
    if (startBtn) {
      startBtn.setAttribute('onclick', `launchGame('${gameType}')`);
    }
    modal.style.display = 'flex';
  };

  window.closeGameSetup = function () {
    const modal = document.getElementById('gameSetupModal');
    if (modal) modal.style.display = 'none';
  };

  window.pauseGame = function () {
    engine.pause();
  };

  window.resumeGame = function () {
    engine.resume();
  };

  window.restartGame = function () {
    engine.restart();
  };

  window.quitGame = function () {
    engine.quit();
  };

  window.exitGames = function () {
    engine.exitToApp();
  };

  window.toggleGameSound = function () {
    return engine.toggleSound();
  };

  // --- LEADERBOARD & HISTORY MODALS ---
  window.openLeaderboardModal = async function (preferredGame) {
    const modal = document.getElementById('gamesLeaderboardModal');
    if (!modal) return;
    modal.style.display = 'flex';
    window.renderLeaderboard(preferredGame || 'bubble', 'en');
  };

  window.closeLeaderboardModal = function () {
    const modal = document.getElementById('gamesLeaderboardModal');
    if (modal) modal.style.display = 'none';
  };

  window.renderLeaderboard = async function (gameType, trackKey) {
    gameType = gameType || 'bubble';
    trackKey = trackKey || 'en';

    const btnBubble = document.getElementById('lbTabBubble');
    const btnFalling = document.getElementById('lbTabFalling');
    const btnWordTyping = document.getElementById('lbTabWordTyping');
    if (btnBubble) btnBubble.classList.toggle('active', gameType === 'bubble');
    if (btnFalling) btnFalling.classList.toggle('active', gameType === 'falling');
    if (btnWordTyping) btnWordTyping.classList.toggle('active', gameType === 'word_typing');

    const btnEn = document.getElementById('lbTrackEn');
    const btnTa99 = document.getElementById('lbTrackTamil99');
    const btnTw = document.getElementById('lbTrackTypewriter');
    if (btnEn) btnEn.classList.toggle('active', trackKey === 'en');
    if (btnTa99) btnTa99.classList.toggle('active', trackKey === 'tamil99');
    if (btnTw) btnTw.classList.toggle('active', trackKey === 'typewriter');

    let board = DEFAULT_LEADERBOARD;
    try {
      if (window.storage) {
        const res = await window.storage.get('games_leaderboard', false);
        const val = (res && typeof res === 'object' && res.value !== undefined) ? res.value : res;
        if (val) board = typeof val === 'string' ? JSON.parse(val) : val;
      } else {
        const local = localStorage.getItem('games_leaderboard');
        if (local) board = JSON.parse(local);
      }
    } catch (e) {}

    const entries = (board[gameType] && board[gameType][trackKey]) || [];
    const listContainer = document.getElementById('lbEntriesList');
    if (!listContainer) return;

    if (entries.length === 0) {
      listContainer.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);">No records yet for this track. Be the first champion!</div>';
      return;
    }

    let html = '';
    entries.forEach((item, index) => {
      const rank = index + 1;
      let badge = `#${rank}`;
      let rowStyle = 'background:var(--card-bg);';
      if (rank === 1) {
        badge = '🥇';
        rowStyle = 'background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(251,191,36,0.05));border:1.5px solid #f59e0b;';
      } else if (rank === 2) {
        badge = '🥈';
        rowStyle = 'background:linear-gradient(135deg,rgba(148,163,184,0.15),rgba(203,213,225,0.05));border:1.5px solid #94a3b8;';
      } else if (rank === 3) {
        badge = '🥉';
        rowStyle = 'background:linear-gradient(135deg,rgba(217,119,6,0.15),rgba(245,158,11,0.05));border:1.5px solid #d97706;';
      }

      html += `
        <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:12px;margin-bottom:6px;${rowStyle}">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-size:16px;font-weight:900;min-width:24px;text-align:center;">${badge}</span>
            <div>
              <div style="font-weight:800;font-size:13.5px;color:var(--ink);">${item.name} ${item.isCurrentStudent ? '⭐ (You)' : ''}</div>
              <div style="font-size:11px;color:var(--muted);">${item.date || ''} • Accuracy: ${item.accuracy}%</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:900;color:#2563eb;">${item.score} <span style="font-size:10px;font-weight:700;">PTS</span></div>
          </div>
        </div>
      `;
    });
    listContainer.innerHTML = html;
  };

  window.openGameHistoryModal = async function () {
    const modal = document.getElementById('gamesHistoryModal');
    if (!modal) return;
    modal.style.display = 'flex';

    let history = [];
    try {
      if (window.storage) {
        const res = await window.storage.get('games_history', false);
        const val = (res && typeof res === 'object' && res.value !== undefined) ? res.value : res;
        if (val) history = typeof val === 'string' ? JSON.parse(val) : val;
      } else {
        const local = localStorage.getItem('games_history');
        if (local) history = JSON.parse(local);
      }
    } catch (e) {}

    const container = document.getElementById('historyEntriesList');
    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);">No arcade match history yet. Play a game to record your session diagnostics!</div>';
      return;
    }

    let html = '';
    history.forEach(item => {
      html += `
        <div style="background:var(--card-bg);border:1px solid var(--card-border);border-radius:14px;padding:12px 14px;margin-bottom:8px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <span style="font-weight:800;font-size:13.5px;color:var(--ink);">${item.gameTitle || 'Typing Game'}</span>
            <span style="font-size:11px;color:var(--muted);">${item.date || ''}</span>
          </div>
          <div style="display:flex;gap:12px;font-size:12px;color:var(--ink-soft);flex-wrap:wrap;">
            <span>Score: <b style="color:#2563eb;">${item.score}</b></span>
            <span>Accuracy: <b style="color:#10b981;">${item.accuracy}%</b></span>
            <span>Speed: <b style="color:#f59e0b;">${item.wpm} WPM</b></span>
            <span>Words: <b>${item.wordsCompleted || 0} Cleared</b></span>
          </div>
        </div>
      `;
    });
    container.innerHTML = html;
  };

  window.closeGameHistoryModal = function () {
    const modal = document.getElementById('gamesHistoryModal');
    if (modal) modal.style.display = 'none';
  };

  // Auto-init on DOMContentLoaded or immediate if document already ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.init());
  } else {
    engine.init();
  }

})(window);
