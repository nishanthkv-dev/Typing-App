/**
 * TYPING THALAIVA — ARCADE ARENA & ANTI-CHOKE GAMES ENGINE
 * Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute
 * 
 * Features:
 *  1. Bubble Word Challenge (Rising flotation defense)
 *  2. Falling Words Challenge (Gravity cascade survival)
 *  3. Surgical Letter-by-Letter progression (No advance on errors)
 *  4. 5-Miss Survival Rule (❤️❤️❤️❤️❤️)
 *  5. Scoring: 1 pt / correct letter, +5 bonus / word, no negative points
 *  6. Tri-Language Engine: English QWERTY, Tamil99, Tamil Typewriter
 *  7. Anti-Choke Intelligent Mistake Heatmap & Diagnostic Report
 *  8. Dedicated Student Game History with comparison metrics
 *  9. Fair-Play Personal Best Leaderboard with accuracy tie-breaker
 */

(function (window) {
  'use strict';

  // --- CURATED WORD BANKS FOR PRACTICE ---
  const WORD_BANKS = {
    en: [
      // Fast high-frequency DoTE syllabus words
      "type", "speed", "focus", "power", "skill", "learn", "rapid", "target", "finger", "rhythm",
      "office", "letter", "stroke", "master", "result", "future", "button", "system", "engine", "action",
      "growth", "record", "energy", "screen", "school", "thalaiva", "practice", "accuracy", "keyboard", "victory",
      "champion", "progress", "director", "technical", "government", "discipline", "excellence", "confidence",
      "minute", "paper", "exam", "report", "effort", "method", "wisdom", "habit", "smart", "steady",
      "timing", "senior", "junior", "course", "centre", "honor", "quick", "tempo", "active", "talent"
    ],
    ta: [
      // Pure Tamil grapheme vocabulary suitable for syllabus training
      "தமிழ்", "கல்வி", "அறிவு", "வணக்கம்", "பாடம்", "வெற்றி", "தட்டச்சு", "ஆசிரியர்", "பள்ளி", "நன்மை",
      "கலை", "உழைப்பு", "திறமை", "வேகம்", "துல்லியம்", "அரசு", "தேர்வு", "மதிப்பெண்", "முயற்சி", "சான்றிதழ்",
      "பயிற்சி", "கணினி", "ஆவணம்", "அலுவலகம்", "விரல்", "விசை", "காலம்", "கற்போம்", "சாதிப்போம்", "தலைவா",
      "நாடு", "புகழ்", "வளர்ச்சி", "ஒழுக்கம்", "கடமை", "ஆர்வம்", "அமைதி", "நம்பிக்கை", "உறுதி", "இனிமை"
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

  // --- SOUND EFFECTS SYNTHESIS ---
  let isGameSoundEnabled = true;

  function playSound(type) {
    if (!isGameSoundEnabled) return;
    try {
      if (window.AudioEngine && typeof window.AudioEngine.play === 'function') {
        const ctx = window.AudioEngine.ctx || (window.AudioContext && new (window.AudioContext || window.webkitAudioContext)());
        if (!ctx) return;
        if (ctx.state === 'suspended') ctx.resume();
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
        } else if (type === 'hit') {
          // Pleasant high-pitch blip for correct letter
          osc.type = 'sine';
          osc.frequency.setValueAtTime(650, t);
          osc.frequency.exponentialRampToValueAtTime(980, t + 0.035);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
          osc.start(t);
          osc.stop(t + 0.035);
        } else if (type === 'bonus') {
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
        } else if (type === 'error') {
          // Subtle low buzz error sound for incorrect letter
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.linearRampToValueAtTime(95, t + 0.06);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
          osc.start(t);
          osc.stop(t + 0.06);
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
          // Soft bubble pop
          osc.type = 'sine';
          osc.frequency.setValueAtTime(800, t);
          osc.frequency.exponentialRampToValueAtTime(260, t + 0.035);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.035);
          osc.start(t);
          osc.stop(t + 0.035);
        }
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
    }
  };

  // --- CORE GAME ENGINE CLASS ---
  class GamesEngine {
    constructor() {
      this.gameType = 'bubble'; // 'bubble' | 'falling'
      this.lang = 'en'; // 'en' | 'ta'
      this.layout = 'qwerty'; // 'qwerty' | 'tamil99' | 'typewriter'
      this.score = 0;
      this.lives = 5; // 5 misses max
      this.wordsCompleted = 0;
      this.wordsMissed = 0;
      this.correctChars = 0;
      this.incorrectChars = 0;
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
      this.spawnInterval = 3200; // ms

      this.canvas = null;
      this.ctx = null;
      this.inputEl = null;

      this.canvasWidth = 360;
      this.canvasHeight = 600;
      this.pixelRatio = window.devicePixelRatio || 1;
      this.soundEnabled = true;
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

    getSpeedForWord() {
      const elapsedSec = Math.max(0, (Date.now() - (this.startTime || Date.now())) / 1000);
      const isBubble = (this.gameType === 'bubble');
      if (!isBubble) {
        // Falling Words: Starts slow & student-friendly at 0.55 px/frame (~33 px/sec)
        // Over the first 25 seconds, smoothly ramps from 0.55 to 1.15 px/frame
        const timeProgress = Math.min(1.0, elapsedSec / 25.0);
        const smoothProgress = timeProgress * (2 - timeProgress); // quadratic ease-out
        const rampSpeed = 0.55 + (smoothProgress * 0.60);
        // Score bonus scales smoothly
        const scoreBonus = Math.min(0.70, (this.score / 100) * 0.35);
        return Number((rampSpeed + scoreBonus).toFixed(2));
      } else {
        const timeProgress = Math.min(1.0, elapsedSec / 30.0);
        return Number((0.60 + (timeProgress * 0.35) + Math.min(0.5, this.score / 150)).toFixed(2));
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
      this.maxLives = 6; // 6 chances matching reference UI
      this.lives = 6;
      this.wordsCompleted = 0;
      this.wordsMissed = 0;
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

      // Spawn initial word immediately
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

      // Return to games hub or studio
      this.openHub();
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
      const bank = WORD_BANKS[this.lang] || WORD_BANKS.en;
      // Pick random word not currently on screen
      const currentTexts = new Set(this.activeWords.map(w => w.text));
      const candidates = bank.filter(w => !currentTexts.has(w));
      const wordText = candidates.length > 0 ? candidates[Math.floor(Math.random() * candidates.length)] : bank[Math.floor(Math.random() * bank.length)];

      const graphemes = splitGraphemes(wordText, this.lang);
      const isBubble = (this.gameType === 'bubble');

      // Dynamic progressive speed (student-friendly 25s curve + score bonus)
      const speed = this.getSpeedForWord();

      const numLetters = graphemes.length;
      // Dynamically adapt bubble radius to letter count so bubbles never crowd
      const bubbleRadius = (numLetters >= 8) ? 24 : ((this.canvasWidth <= 500) ? 28 : 32);
      const isFirstSpawn = (this.activeWords.length === 0 && this.score === 0);

      const BUBBLE_PALETTES = [
        { main: '#e11d48', dark: '#9f1239', light: '#fda4af' }, // Vivid ruby red/pink ('i' in reference)
        { main: '#65a30d', dark: '#3f6212', light: '#bef264' }, // Apple/lime green ('l' and 'k' in reference)
        { main: '#4f46e5', dark: '#3730a3', light: '#a5b4fc' }, // Periwinkle/royal blue ('h' and 't' in reference)
        { main: '#7c3aed', dark: '#5b21b6', light: '#c4b5fd' }, // Purple/violet
        { main: '#ea580c', dark: '#9a3412', light: '#fdba74' }, // Vibrant amber/orange
        { main: '#0284c7', dark: '#075985', light: '#7dd3fc' }, // Sky cyan
      ];

      const bubbles = [];
      const padding = bubbleRadius + 18;
      const minX = padding;
      const maxX = this.canvasWidth - padding;
      const minY = 60;
      const maxY = Math.min(this.canvasHeight - 160, 380);

      // Distribute bubbles organically across screen avoiding collisions
      // Letter 0 is positioned lower (closer to danger boundary), subsequent letters are staggered higher
      for (let i = 0; i < numLetters; i++) {
        let bx, by;
        let attempts = 0;
        let valid = false;

        const progressFrac = i / Math.max(numLetters - 1, 1);
        const baseLayerY = isFirstSpawn
          ? (minY + (maxY - minY) * (0.85 - progressFrac * 0.7))
          : (minY + (maxY - minY) * (0.65 - progressFrac * 0.55));

        const colIndex = (i * 2 + 1) % 4;
        const colWidth = (maxX - minX) / 4;

        while (attempts < 60 && !valid) {
          attempts++;
          bx = minX + (colIndex + 0.5) * colWidth + (Math.random() - 0.5) * (colWidth * 0.6);
          bx = Math.max(minX, Math.min(maxX, bx));
          by = baseLayerY + (Math.random() - 0.5) * 35;
          by = Math.max(minY, Math.min(maxY, by));

          valid = true;
          for (let j = 0; j < bubbles.length; j++) {
            const dist = Math.hypot(bx - bubbles[j].x, by - bubbles[j].y);
            if (dist < bubbleRadius * 2.15) {
              valid = false;
              break;
            }
          }
        }

        bubbles.push({
          char: graphemes[i],
          x: bx,
          baseX: bx,
          y: by,
          radius: bubbleRadius,
          phase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.018 + Math.random() * 0.012,
          wobbleAmp: 8 + Math.random() * 4,
          color: BUBBLE_PALETTES[i % BUBBLE_PALETTES.length],
          popped: false,
          shakeFrames: 0,
          shakeOffset: 0
        });
      }

      const initialX = bubbles[0] ? bubbles[0].x : this.canvasWidth / 2;
      const initialY = isBubble ? (bubbles[0] ? bubbles[0].y : 60) : 40;
      const boxWidth = Math.max(80, graphemes.length * 50);

      const wordObj = {
        text: wordText,
        graphemes: graphemes,
        bubbles: bubbles,
        x: initialX,
        y: initialY,
        baseX: initialX,
        width: boxWidth,
        height: 48,
        speed: speed,
        phase: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.03 + Math.random() * 0.02,
        wobbleAmp: isBubble ? 10 : 4,
        shakeOffset: 0,
        shakeFrames: 0,
        spawnTime: Date.now()
      };

      this.activeWords.push(wordObj);

      // If no active word target set, lock onto this one
      if (this.activeWords.length === 1) {
        this.currentWordIdx = 0;
        this.charIndex = 0;
        this.composer = { raw: '', outLen: 0 };
      }
    }

    getWordBubbles(wordObj) {
      if (!wordObj) return [];
      if (!wordObj.bubbles || wordObj.bubbles.length !== (wordObj.graphemes || []).length) {
        const numLetters = (wordObj.graphemes || []).length;
        const bubbleRadius = (numLetters >= 8) ? 24 : ((this.canvasWidth <= 500) ? 28 : 32);
        const padding = bubbleRadius + 18;
        const minX = padding;
        const maxX = this.canvasWidth - padding;
        const minY = 60;
        const maxY = Math.min(this.canvasHeight - 160, 380);

        const BUBBLE_PALETTES = [
          { main: '#e11d48', dark: '#9f1239', light: '#fda4af' },
          { main: '#65a30d', dark: '#3f6212', light: '#bef264' },
          { main: '#4f46e5', dark: '#3730a3', light: '#a5b4fc' },
          { main: '#7c3aed', dark: '#5b21b6', light: '#c4b5fd' },
          { main: '#ea580c', dark: '#9a3412', light: '#fdba74' },
          { main: '#0284c7', dark: '#075985', light: '#7dd3fc' }
        ];

        const bubbles = [];
        (wordObj.graphemes || []).forEach((char, i) => {
          const progressFrac = i / Math.max(numLetters - 1, 1);
          const baseLayerY = (wordObj.y || minY) + (maxY - minY) * (0.75 - progressFrac * 0.6);
          const colIndex = (i * 2 + 1) % 4;
          const colWidth = (maxX - minX) / 4;

          let bx, by;
          let attempts = 0;
          let valid = false;

          while (attempts < 60 && !valid) {
            attempts++;
            bx = minX + (colIndex + 0.5) * colWidth + (Math.random() - 0.5) * (colWidth * 0.6);
            bx = Math.max(minX, Math.min(maxX, bx));
            by = baseLayerY + (Math.random() - 0.5) * 35;
            by = Math.max(minY, Math.min(maxY, by));

            valid = true;
            for (let j = 0; j < bubbles.length; j++) {
              const dist = Math.hypot(bx - bubbles[j].x, by - bubbles[j].y);
              if (dist < bubbleRadius * 2.15) {
                valid = false;
                break;
              }
            }
          }

          bubbles.push({
            char: char,
            x: bx,
            baseX: bx,
            y: by,
            radius: bubbleRadius,
            phase: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.018 + Math.random() * 0.012,
            wobbleAmp: 8 + Math.random() * 4,
            color: BUBBLE_PALETTES[i % BUBBLE_PALETTES.length],
            popped: false,
            shakeFrames: 0,
            shakeOffset: 0
          });
        });
        wordObj.bubbles = bubbles;
      }
      return wordObj.bubbles;
    }

    handleKeystroke(char) {
      if (!this.active || this.paused || this.activeWords.length === 0) return;

      // Typing key sound feedback on every keystroke by default
      playSound('type');

      const targetWord = this.activeWords[this.currentWordIdx];
      if (!targetWord) return;

      const targetGrapheme = targetWord.graphemes[this.charIndex];
      if (!targetGrapheme) return;

      let typedChar = char;

      // Handle Tamil transliteration if Tamil track is active
      if (this.lang === 'ta' && (this.layout === 'tamil99' || this.layout === 'typewriter')) {
        const keymap = (window.KEYMAPS && window.KEYMAPS[this.layout]) || (typeof KEYMAPS !== 'undefined' ? KEYMAPS[this.layout] : null) || {};
        const prefixes = (window.KEYMAP_PREFIXES && window.KEYMAP_PREFIXES[this.layout]) || (typeof KEYMAP_PREFIXES !== 'undefined' ? KEYMAP_PREFIXES[this.layout] : null) || new Set();

        const newBuf = this.composer.raw + char;

        if (Object.prototype.hasOwnProperty.call(keymap, newBuf)) {
          // Output resolved!
          typedChar = keymap[newBuf];
          this.composer.raw = newBuf;
          this.composer.outLen = typedChar.length;
        } else if (prefixes.has(newBuf)) {
          // Incomplete composition prefix (e.g. ';' in typewriter or dead key)
          this.composer.raw = newBuf;
          return; // Wait for resolving keystroke
        } else {
          // Try single character direct mapping
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

      // Compare typed character with expected target grapheme
      const isMatch = (this.lang === 'en')
        ? (typedChar.toLowerCase() === targetGrapheme.toLowerCase())
        : (typedChar === targetGrapheme || (targetGrapheme.startsWith(typedChar) && typedChar.length < targetGrapheme.length));

      if (isMatch) {
        // If it's a partial prefix in Tamil, wait for next key to complete full grapheme
        if (this.lang === 'ta' && typedChar !== targetGrapheme && targetGrapheme.startsWith(typedChar)) {
          return;
        }

        // --- SUCCESS STRIKE ---
        this.correctChars++;
        this.score += 1; // 1 point per correct letter

        let strikeX = targetWord.x;
        let strikeY = targetWord.y;

        if (this.gameType === 'bubble') {
          const bubbles = this.getWordBubbles(targetWord);
          const poppedBubble = bubbles[this.charIndex];
          if (poppedBubble) {
            poppedBubble.popped = true;
            strikeX = poppedBubble.x;
            strikeY = poppedBubble.y;
            this.spawnBubblePopBurst(poppedBubble.x, poppedBubble.y);
            this.addFloatingTip(poppedBubble.x, poppedBubble.y - 20, '+1', '#fbbf24');
          }
        }

        this.charIndex++;
        this.composer = { raw: '', outLen: 0 };

        playSound('hit');
        playSound('pop');
        this.spawnSparks(strikeX, strikeY, '#10b981');
        this.updateHUD();

        // Check if word completed
        if (this.charIndex >= targetWord.graphemes.length) {
          // --- WORD BONUS COMPLETION ---
          this.score += 5; // 5 bonus points for completing a word
          this.wordsCompleted++;
          playSound('bonus');
          this.spawnWordExplosion(strikeX, strikeY);
          this.addFloatingTip(strikeX, strikeY - 24, '+5 WORD BONUS! 🔥', '#fbbf24');

          // Remove completed word
          this.activeWords.splice(this.currentWordIdx, 1);
          this.charIndex = 0;
          this.currentWordIdx = 0;
          this.updateHUD();

          // Spawn next word if empty
          if (this.activeWords.length === 0) {
            this.spawnWord();
          }
        }
      } else {
        // --- MISTAKE RECORDED (NO ADVANCEMENT) ---
        this.incorrectChars++;
        this.composer = { raw: '', outLen: 0 };

        if (this.gameType === 'bubble') {
          const bubbles = this.getWordBubbles(targetWord);
          const activeBubble = bubbles[this.charIndex];
          if (activeBubble) {
            activeBubble.shakeFrames = 14;
            this.addFloatingTip(activeBubble.x, activeBubble.y + 26, `Oops! Typed '${typedChar}' not '${targetGrapheme}'`, '#ef4444');
          }
        }

        // Log exact mistake for anti-choke diagnostic
        const mistakeEntry = {
          expected: targetGrapheme,
          actual: typedChar,
          word: targetWord.text,
          time: Date.now()
        };
        this.mistakesLog.push(mistakeEntry);
        this.weakKeysMap[targetGrapheme] = (this.weakKeysMap[targetGrapheme] || 0) + 1;
        this.wordMistakesMap[targetWord.text] = (this.wordMistakesMap[targetWord.text] || 0) + 1;

        // Visual error shake & warning
        targetWord.shakeFrames = 12;
        targetWord.shakeOffset = 10;
        if (this.gameType !== 'bubble') {
          this.addFloatingTip(targetWord.x, targetWord.y + 24, `Oops! Typed '${typedChar}' not '${targetGrapheme}'`, '#ef4444');
        }

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
      const now = Date.now();

      // Update ambient dust motes
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

      // Spawn periodic words if below max concurrent words
      // In Falling Words, exactly 1 word block falls at a time to prevent any overlaps, bunching, or target mismatch!
      const maxConcurrent = 1;
      if (now - this.lastSpawnTime > this.spawnInterval && this.activeWords.length < maxConcurrent) {
        this.spawnWord();
        this.lastSpawnTime = now;
      }

      // Smooth progressive speed update (no sudden jumps, 25s ramp + score bonus)
      const dynamicSpeed = this.getSpeedForWord();
      for (let s = 0; s < this.activeWords.length; s++) {
        this.activeWords[s].speed = dynamicSpeed;
      }

      // Update active words
      for (let i = this.activeWords.length - 1; i >= 0; i--) {
        const w = this.activeWords[i];

        // Wobble physics for base word
        w.phase += w.wobbleSpeed;
        w.x = w.baseX + Math.sin(w.phase) * w.wobbleAmp;

        // Shake physics on error
        if (w.shakeFrames > 0) {
          w.shakeFrames--;
          w.shakeOffset = (w.shakeFrames % 2 === 0 ? 1 : -1) * (w.shakeFrames * 0.8);
        } else {
          w.shakeOffset = 0;
        }

        // Movement
        if (isBubble) {
          const bubbles = this.getWordBubbles(w);
          let floorHit = false;
          const floorBoundary = this.canvasHeight - 65;

          for (let bIdx = 0; bIdx < bubbles.length; bIdx++) {
            const b = bubbles[bIdx];
            b.phase += b.wobbleSpeed;
            b.x = b.baseX + Math.sin(b.phase) * b.wobbleAmp;

            if (b.shakeFrames > 0) {
              b.shakeFrames--;
              b.shakeOffset = (b.shakeFrames % 2 === 0 ? 1 : -1) * (b.shakeFrames * 0.8);
            } else {
              b.shakeOffset = 0;
            }

            // Move letter bubble downwards toward the bottom baseline
            b.y += w.speed;

            // Check if any unpopped letter bubble hits the bottom boundary
            if (!b.popped && b.y >= floorBoundary) {
              floorHit = true;
            }
          }

          // Keep w.y aligned with leading unpopped bubble
          const unpopped = bubbles.filter(b => !b.popped);
          if (unpopped.length > 0) {
            w.y = unpopped[0].y;
            w.x = unpopped[0].x;
          } else {
            w.y += w.speed;
          }

          if (floorHit || w.y >= floorBoundary) {
            this.handleWordMiss(i);
          }
        } else {
          // Falling downward
          w.y += w.speed;
          // Floor boundary collision: word reached bottom dock incomplete!
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

      // Record in word mistakes
      if (missedWord) {
        this.wordMistakesMap[missedWord.text] = (this.wordMistakesMap[missedWord.text] || 0) + 1;
      }

      // Remove missed word
      this.activeWords.splice(wordIndex, 1);

      // Reset target if the active word was missed
      if (this.currentWordIdx === wordIndex || this.currentWordIdx >= this.activeWords.length) {
        this.currentWordIdx = 0;
        this.charIndex = 0;
        this.composer = { raw: '', outLen: 0 };
      }

      this.updateHUD();

      // Check if Game Over condition reached (6 chances exhausted)
      if (this.lives <= 0) {
        this.gameOver();
      } else if (this.activeWords.length === 0) {
        this.spawnWord();
      }
    }

    skipWord() {
      if (!this.active || this.paused || this.activeWords.length === 0) return;
      this.wordsMissed++;
      this.lives--;
      playSound('miss');
      triggerHaptic('miss');
      this.activeWords.splice(this.currentWordIdx, 1);
      this.currentWordIdx = 0;
      this.charIndex = 0;
      this.composer = { raw: '', outLen: 0 };
      this.updateHUD();
      if (this.lives <= 0) {
        this.gameOver();
      } else if (this.activeWords.length === 0) {
        this.spawnWord();
      }
    }

    updateHUD() {
      // Score
      const scoreEl = document.getElementById('gameScoreDisplay');
      if (scoreEl) scoreEl.textContent = this.score;

      // Accuracy
      const totalStrokes = this.correctChars + this.incorrectChars;
      const acc = totalStrokes > 0 ? Math.round((this.correctChars / totalStrokes) * 100) : 100;
      const accEl = document.getElementById('gameAccuracyDisplay');
      if (accEl) accEl.textContent = `${acc}%`;

      // Speed Pill (1..5)
      const speedEl = document.getElementById('gameSpeedDisplay');
      if (speedEl) {
        const speedTier = 1 + Math.min(Math.floor(this.score / 25), 4);
        speedEl.textContent = speedTier;
      }

      // Misses Tracker (6 slots matching reference UI: Missed Ø Ø Ø Ø Ø Ø)
      const heartsContainer = document.getElementById('gameHeartsDisplay');
      if (heartsContainer) {
        let heartsHtml = '';
        const totalSlots = this.maxLives || 6;
        for (let i = 0; i < totalSlots; i++) {
          if (i < this.wordsMissed) {
            // Missed slot: Red circle with slash Ø
            heartsHtml += `<span class="game-miss-slot missed" title="Missed" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:2px solid #ef4444;background:rgba(239,68,68,0.18);color:#ef4444;font-size:13px;font-weight:900;line-height:1;margin:0 1px;">Ø</span>`;
          } else {
            // Open life slot: Blue outline circle with slash Ø matching reference
            heartsHtml += `<span class="game-miss-slot open" title="Life available" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:2px solid #3b82f6;background:transparent;color:#3b82f6;font-size:13px;font-weight:700;line-height:1;margin:0 1px;">Ø</span>`;
          }
        }
        heartsContainer.innerHTML = heartsHtml;
      }

      // Correct / Wrong
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

      // Clear frame
      ctx.clearRect(0, 0, w, h);

      // Render Arena Ambience Background
      if (isBubble) {
        // Soft pastel lavender/periwinkle background matching media_1795477409140_b427bece.png
        const skyGrad = ctx.createLinearGradient(0, 0, 0, h);
        skyGrad.addColorStop(0.0, '#b8c6fa');
        skyGrad.addColorStop(0.5, '#a8b6fc');
        skyGrad.addColorStop(1.0, '#9cb0f6');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, w, h);

        // Center Sri Kalaimagal Institute Watermark (subtle soft blend)
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

        // Ambient white sparkle dust motes drifting gently (matching reference)
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

        // Baseline defense boundary line at bottom of canvas
        ctx.strokeStyle = '#2563eb';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, h - 1);
        ctx.lineTo(w, h - 1);
        ctx.stroke();
      } else {
        // Falling mode: Clean vertical chute with bottom container matching media_1795477576059_bea0a671.png
        ctx.fillStyle = '#eef2f9';
        ctx.fillRect(0, 0, w, h);

        // Vertical Play Chute / Track
        const trackWidth = Math.min(w * 0.84, 340);
        const trackX = (w - trackWidth) / 2;
        const trackY = 12;
        const trackHeight = h - 24;

        ctx.save();
        // Track background: Crisp white card with soft shadow
        ctx.shadowColor = 'rgba(15, 23, 42, 0.08)';
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 4;
        ctx.fillStyle = '#f8faff';
        this.drawRoundRect(ctx, trackX, trackY, trackWidth, trackHeight, 10);
        ctx.fill();
        ctx.restore();

        // Track border
        ctx.strokeStyle = '#d5defc';
        ctx.lineWidth = 1.5;
        this.drawRoundRect(ctx, trackX, trackY, trackWidth, trackHeight, 10);
        ctx.stroke();

        // Bottom U-shaped container / dock matching reference
        const dockWidth = trackWidth * 0.94;
        const dockHeight = 110;
        const dockX = trackX + (trackWidth - dockWidth) / 2;
        const dockY = trackY + trackHeight - dockHeight - 8;
        const wallThickness = 14;

        ctx.save();
        // Draw U-dock outer shape
        ctx.fillStyle = '#9cb0f8';
        ctx.shadowColor = 'rgba(99, 102, 241, 0.25)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetY = 4;
        this.drawRoundRect(ctx, dockX, dockY, dockWidth, dockHeight, 12);
        ctx.fill();
        ctx.restore();

        // Inner cut-out for U-dock cavity
        ctx.fillStyle = '#f8faff';
        this.drawRoundRect(ctx, dockX + wallThickness, dockY, dockWidth - (wallThickness * 2), dockHeight - wallThickness, 6);
        ctx.fill();

        // Dock rim outline
        ctx.strokeStyle = '#7c8fe6';
        ctx.lineWidth = 1.5;
        this.drawRoundRect(ctx, dockX, dockY, dockWidth, dockHeight, 12);
        ctx.stroke();

        // Dock base bar / landing slot matching reference (showing dinosaur-style target)
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

        // Target word text inside landing slot - guaranteed synchronized with falling word!
        const curTarget = this.activeWords[this.currentWordIdx] || this.activeWords[0];
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
              // Typed letter: emerald green
              ctx.fillStyle = '#16a34a';
              ctx.fillText(char, startX, slotTextY);
            } else if (g === this.charIndex) {
              // Current target letter: vivid blue with underline
              ctx.fillStyle = '#2563eb';
              ctx.fillText(char, startX, slotTextY);
              ctx.save();
              ctx.fillStyle = '#2563eb';
              ctx.fillRect(startX, slotTextY + 9, cw, 2);
              ctx.restore();
            } else {
              // Untyped letter: slate grey
              ctx.fillStyle = '#64748b';
              ctx.fillText(char, startX, slotTextY);
            }
            startX += cw;
          }
          ctx.restore();
        }
      }

      // Render Words / Bubbles
      if (isBubble) {
        this.activeWords.forEach((wordObj, idx) => {
          const isActiveWord = (idx === this.currentWordIdx);
          const bubbles = this.getWordBubbles(wordObj);

          bubbles.forEach((b, bIdx) => {
            if (b.popped) return;
            const isCurrentTarget = isActiveWord && (bIdx === this.charIndex);
            this.renderBubble(ctx, b, isCurrentTarget);
          });
        });
      } else {
        this.activeWords.forEach((wordObj, idx) => {
          const isActiveTarget = (idx === this.currentWordIdx);
          this.renderFallingWordEntity(wordObj, isActiveTarget);
        });
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
      const r = b.radius || 30;
      const palette = b.color || { main: '#4f46e5', dark: '#3730a3', light: '#a5b4fc' };

      ctx.save();

      // Outer glow / shadow
      if (isCurrentTarget) {
        ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
        ctx.shadowBlur = 18;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = 3;
      }

      // 3D Spherical Radial Gradient (Light source at top-left)
      const grad = ctx.createRadialGradient(
        bx - r * 0.35, by - r * 0.35, r * 0.08,
        bx, by, r
      );
      grad.addColorStop(0.0, palette.light); // Bright highlight
      grad.addColorStop(0.35, palette.main);  // Core vibrant color
      grad.addColorStop(1.0, palette.dark);  // Deep shadow rim

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      // Delicate outer rim stroke
      ctx.strokeStyle = isCurrentTarget ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = isCurrentTarget ? 2.5 : 1.2;
      ctx.stroke();

      // Signature Glossy Specular Reflection (top-left shiny oval dot from reference)
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.88)';
      ctx.beginPath();
      ctx.arc(bx - r * 0.36, by - r * 0.36, r * 0.22, 0, Math.PI * 2);
      ctx.fill();

      // Mini secondary highlight dot
      ctx.beginPath();
      ctx.arc(bx - r * 0.18, by - r * 0.52, r * 0.09, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Active Target Pulsating Aura
      if (isCurrentTarget) {
        ctx.save();
        const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.5 + pulse * 0.5})`;
        ctx.lineWidth = 2.5;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(bx, by, r + 5 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); // Restore shadow

      // Render crisp, bold white letter in the center
      ctx.save();
      const isTamil = (this.lang === 'ta');
      const fontSize = isTamil ? Math.round(r * 0.78) : Math.round(r * 0.88);
      ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", "Mukta Malar", system-ui, serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Crisp contrast drop shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
      ctx.shadowBlur = 3;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1.5;

      ctx.fillStyle = '#ffffff';
      const displayText = b.char; // Preserves case as in reference
      ctx.fillText(displayText, bx, by + 1);

      // Active letter underline indicator (like in reference screenshot)
      if (isCurrentTarget) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(bx - r * 0.28, by + fontSize * 0.44, r * 0.56, 2.5);
      }

      ctx.restore();
    }

    renderWordEntity(wordObj, isActiveTarget) {
      if (this.gameType === 'bubble') {
        const bubbles = this.getWordBubbles(wordObj);
        bubbles.forEach((b, bIdx) => {
          if (b.popped) return;
          const isCurrentTarget = isActiveTarget && (bIdx === this.charIndex);
          this.renderBubble(this.ctx, b, isCurrentTarget);
        });
      } else {
        this.renderFallingWordEntity(wordObj, isActiveTarget);
      }
    }

    renderFallingWordEntity(wordObj, isActiveTarget) {
      const ctx = this.ctx;
      const w = this.canvasWidth;
      const isBubble = (this.gameType === 'bubble');

      if (isBubble) return;

      // Vertical chute geometry matching reference
      const trackWidth = Math.min(w * 0.84, 340);
      const trackX = (w - trackWidth) / 2;
      const blockWidth = trackWidth * 0.88;
      const blockHeight = 44;
      const bx = trackX + (trackWidth - blockWidth) / 2 + (wordObj.shakeOffset || 0);
      const by = wordObj.y;

      ctx.save();

      // Block shadow
      if (isActiveTarget) {
        ctx.shadowColor = 'rgba(101, 163, 13, 0.45)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 4;
      } else {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 2;
      }

      // Vivid lime green block matching media_1795477576059_bea0a671.png
      const blockGrad = ctx.createLinearGradient(bx, by, bx, by + blockHeight);
      blockGrad.addColorStop(0.0, '#7cb305'); // Bright vibrant top bevel
      blockGrad.addColorStop(0.4, '#65a30d'); // Rich core apple green
      blockGrad.addColorStop(1.0, '#4d7c0f'); // Solid bottom edge shade

      ctx.fillStyle = blockGrad;
      this.drawRoundRect(ctx, bx, by, blockWidth, blockHeight, 6);
      ctx.fill();

      // Crisp outer stroke
      ctx.strokeStyle = isActiveTarget ? '#3f6212' : '#4d7c0f';
      ctx.lineWidth = 1.5;
      this.drawRoundRect(ctx, bx, by, blockWidth, blockHeight, 6);
      ctx.stroke();

      // Top subtle bevel highlight line
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(bx + 6, by + 1.5);
      ctx.lineTo(bx + blockWidth - 6, by + 1.5);
      ctx.stroke();
      ctx.restore();

      ctx.restore(); // Restore shadow

      // Render Word inside the block: perfectly centered, crisp bold white letters
      ctx.save();
      const isTamil = (this.lang === 'ta');
      const fontSize = isTamil ? 20 : 21;
      ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", "Mukta Malar", system-ui, serif`;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      // Drop shadow for text readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 2;
      ctx.shadowOffsetY = 1;

      const graphemes = wordObj.graphemes;
      const graphemeWidths = graphemes.map(g => ctx.measureText(g).width);
      const totalTextWidth = graphemeWidths.reduce((a, b) => a + b, 0);

      let curX = bx + (blockWidth - totalTextWidth) / 2;
      const textY = by + blockHeight / 2 + 1;

      for (let i = 0; i < graphemes.length; i++) {
        const char = graphemes[i];
        const charW = graphemeWidths[i];

        if (isActiveTarget) {
          if (i < this.charIndex) {
            // Already typed: Bright lime/gold checkmark highlight
            ctx.fillStyle = '#fef08a';
            ctx.shadowColor = 'rgba(254, 240, 138, 0.8)';
            ctx.shadowBlur = 6;
          } else if (i === this.charIndex) {
            // Current target letter: Bright glowing white with underline
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(255, 255, 255, 0.95)';
            ctx.shadowBlur = 10;

            // Target underline indicator
            ctx.save();
            ctx.fillStyle = '#fef08a';
            ctx.fillRect(curX, textY + 11, charW, 2.5);
            ctx.restore();
          } else {
            // Upcoming letter: Crisp bold white
            ctx.fillStyle = 'rgba(255, 255, 255, 0.92)';
            ctx.shadowBlur = 2;
          }
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
          ctx.shadowBlur = 0;
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

    gameOver() {
      this.active = false;
      this.endTime = Date.now();
      if (this.animFrameId) cancelAnimationFrame(this.animFrameId);

      const durationSec = Math.max(1, Math.round((this.endTime - this.startTime) / 1000));
      const totalStrokes = this.correctChars + this.incorrectChars;
      const accuracy = totalStrokes > 0 ? Math.round((this.correctChars / totalStrokes) * 1000) / 10 : 100;
      const wpm = Math.round((this.correctChars / 5) / (durationSec / 60));

      const report = {
        id: `game_${Date.now()}`,
        gameType: this.gameType,
        gameTitle: this.gameType === 'bubble' ? 'Bubble Word Challenge' : 'Falling Words Challenge',
        lang: this.lang,
        layout: this.layout,
        score: this.score,
        accuracy: accuracy,
        wpm: wpm,
        durationSec: durationSec,
        wordsCompleted: this.wordsCompleted,
        wordsMissed: this.wordsMissed,
        correctChars: this.correctChars,
        incorrectChars: this.incorrectChars,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        weakKeys: Object.entries(this.weakKeysMap).map(([k, c]) => ({ key: k, count: c })).sort((a, b) => b.count - a.count),
        troubleWords: Object.entries(this.wordMistakesMap).map(([w, c]) => ({ word: w, count: c })).sort((a, b) => b.count - a.count)
      };

      // Persist to history and leaderboard
      this.saveGameSession(report);

      // Render Anti-Choke Game Over Report Modal
      this.renderGameOverModal(report);
    }

    async saveGameSession(report) {
      try {
        // 1. Save to Games History (Keep up to 100 records)
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

        // 2. Check and Update Student Leaderboard Personal Best
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
        const gameKey = report.gameType; // 'bubble' | 'falling'
        const trackKey = (report.lang === 'ta') ? report.layout : 'en';

        if (!board[gameKey]) board[gameKey] = {};
        if (!board[gameKey][trackKey]) board[gameKey][trackKey] = [];

        const list = board[gameKey][trackKey];
        const existingIdx = list.findIndex(item => item.name.toLowerCase() === studentName.toLowerCase() || item.isCurrentStudent);

        let isNewPB = false;

        if (existingIdx !== -1) {
          const existing = list[existingIdx];
          // Update ONLY if new score is higher, or if score matches and accuracy is higher
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

        // Sort descending: Score first, then Accuracy as tiebreaker
        list.sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          return b.accuracy - a.accuracy;
        });

        // Persist
        if (window.storage) {
          await window.storage.set('games_leaderboard', JSON.stringify(board), false);
        } else {
          localStorage.setItem('games_leaderboard', JSON.stringify(board));
        }

        report.isNewPB = isNewPB;
        if (isNewPB && window.NotificationService) {
          const gameTitle = this.gameType === 'bubble' ? 'Bubble Word Challenge' : 'Falling Words Challenge';
          NotificationService.notifyGamePB(gameTitle, report.score, report.accuracy);
        }
      } catch (err) {
        console.error('Error updating leaderboard:', err);
      }
    }

    renderGameOverModal(report) {
      const modal = document.getElementById('gameOverModal');
      if (!modal) return;

      // Populate Report fields
      const titleEl = document.getElementById('goGameTitle');
      if (titleEl) titleEl.textContent = `${report.gameTitle} (${report.lang === 'ta' ? (report.layout === 'tamil99' ? 'Tamil99' : 'Tamil Typewriter') : 'English QWERTY'})`;

      const scoreEl = document.getElementById('goScoreValue');
      if (scoreEl) scoreEl.textContent = report.score;

      const accEl = document.getElementById('goAccValue');
      if (accEl) accEl.textContent = `${report.accuracy}%`;

      const wpmEl = document.getElementById('goWpmValue');
      if (wpmEl) wpmEl.textContent = `${report.wpm} WPM`;

      const wordsEl = document.getElementById('goWordsCleared');
      if (wordsEl) wordsEl.textContent = `${report.wordsCompleted} Cleared / ${report.wordsMissed} Missed`;

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
  window.GamesEngine = engine;

  // Global helper functions
  window.launchGame = function (gameType) {
    const selLang = document.getElementById('gameSetupLang') ? document.getElementById('gameSetupLang').value : 'en';
    const selLayout = document.getElementById('gameSetupLayout') ? document.getElementById('gameSetupLayout').value : (selLang === 'ta' ? 'tamil99' : 'qwerty');
    
    // Close modal if open
    const setupModal = document.getElementById('gameSetupModal');
    if (setupModal) setupModal.style.display = 'none';

    engine.start(gameType, selLang, selLayout);
  };

  window.openGameSetup = function (gameType) {
    const modal = document.getElementById('gameSetupModal');
    if (!modal) return;
    const titleEl = document.getElementById('gameSetupTitle');
    if (titleEl) {
      titleEl.textContent = (gameType === 'bubble') ? '🫧 Bubble Word Challenge' : '☄️ Falling Words Challenge';
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

    // Highlight active tabs
    const btnBubble = document.getElementById('lbTabBubble');
    const btnFalling = document.getElementById('lbTabFalling');
    if (btnBubble) btnBubble.classList.toggle('active', gameType === 'bubble');
    if (btnFalling) btnFalling.classList.toggle('active', gameType === 'falling');

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

      if (item.isCurrentStudent) {
        rowStyle += 'box-shadow:0 0 10px rgba(59,130,246,0.3);border-color:#3b82f6;';
      }

      html += `
        <div class="lb-entry-card" style="display:flex;align-items:center;justify-content:space-between;padding:12px 14px;border-radius:12px;margin-bottom:8px;border:1px solid var(--card-border);${rowStyle}">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="font-size:18px;font-weight:800;width:28px;text-align:center;">${badge}</div>
            <div>
              <div style="font-size:14px;font-weight:800;color:var(--ink);">${item.name} ${item.isCurrentStudent ? '<span style="font-size:11px;color:#2563eb;font-weight:700;">(You)</span>' : ''}</div>
              <div style="font-size:11px;color:var(--muted);">${item.date || 'Recent Run'}</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:16px;font-weight:800;color:#2563eb;">${item.score} pts</div>
            <div style="font-size:11px;font-weight:700;color:#10b981;">🎯 ${item.accuracy}% acc</div>
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
    window.renderGameHistory('all');
  };

  window.closeGameHistoryModal = function () {
    const modal = document.getElementById('gamesHistoryModal');
    if (modal) modal.style.display = 'none';
  };

  window.renderGameHistory = async function (filterType) {
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

    const container = document.getElementById('ghEntriesList');
    if (!container) return;

    if (filterType && filterType !== 'all') {
      history = history.filter(h => h.gameType === filterType);
    }

    if (history.length === 0) {
      container.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);">No game runs completed yet. Play a match to track your accuracy!</div>';
      return;
    }

    let html = '';
    history.forEach(item => {
      const isBubble = item.gameType === 'bubble';
      const icon = isBubble ? '🫧' : '☄️';
      const layoutLabel = item.lang === 'ta' ? (item.layout === 'tamil99' ? 'Tamil99' : 'Typewriter') : 'English';

      html += `
        <div class="glass-card" style="margin-bottom:10px;padding:14px;border-radius:12px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:800;color:var(--ink);">
              ${icon} ${item.gameTitle}
            </div>
            <div style="font-size:11px;font-weight:700;padding:2px 8px;border-radius:6px;background:var(--primary-glow);color:var(--primary);">
              ${layoutLabel}
            </div>
          </div>
          <div style="display:flex;align-items:center;justify-content:space-between;font-size:12px;color:var(--ink-soft);margin-bottom:6px;">
            <span>Score: <b style="color:#2563eb;font-size:14px;">${item.score}</b></span>
            <span>Accuracy: <b style="color:#10b981;font-size:14px;">${item.accuracy}%</b></span>
            <span>Speed: <b>${item.wpm} WPM</b></span>
          </div>
          <div style="font-size:11px;color:var(--muted);display:flex;justify-content:space-between;">
            <span>${item.date}</span>
            <span>Cleared: ${item.wordsCompleted} | Missed: ${item.wordsMissed}</span>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  };

  window.toggleGameSound = function () {
    return engine.toggleSound();
  };

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.init());
  } else {
    engine.init();
  }

})(window);
