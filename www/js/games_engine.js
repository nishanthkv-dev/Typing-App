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
  function playSound(type) {
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

        if (type === 'hit') {
          // Pleasant high-pitch blip
          osc.type = 'sine';
          osc.frequency.setValueAtTime(580, t);
          osc.frequency.exponentialRampToValueAtTime(880, t + 0.04);
          gain.gain.setValueAtTime(0.12, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
          osc.start(t);
          osc.stop(t + 0.04);
        } else if (type === 'bonus') {
          // Melodic arpeggio chime
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(523.25, t); // C5
          osc.frequency.setValueAtTime(659.25, t + 0.05); // E5
          osc.frequency.setValueAtTime(783.99, t + 0.10); // G5
          osc.frequency.setValueAtTime(1046.50, t + 0.15); // C6
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
          osc.start(t);
          osc.stop(t + 0.25);
        } else if (type === 'error') {
          // Dissonant low buzz
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, t);
          osc.frequency.linearRampToValueAtTime(110, t + 0.08);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.start(t);
          osc.stop(t + 0.08);
        } else if (type === 'miss') {
          // Descending warning swoop
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, t);
          osc.frequency.exponentialRampToValueAtTime(180, t + 0.2);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.2);
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
      this.canvasWidth = rect.width || 360;
      this.canvasHeight = rect.height || 600;

      this.canvas.width = this.canvasWidth * this.pixelRatio;
      this.canvas.height = this.canvasHeight * this.pixelRatio;
      this.ctx.scale(this.pixelRatio, this.pixelRatio);
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

      this.resizeCanvas();
      this.updateHUD();

      // Spawn initial word immediately
      this.spawnWord();

      // Show gaming screen
      if (typeof window.showScreen === 'function') {
        window.showScreen('screen-games');
      } else {
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        const sc = document.getElementById('screen-games');
        if (sc) sc.classList.add('active');
      }

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

      // Base speed
      let speed = isBubble ? 0.65 : 0.75;
      if (!isBubble) {
        speed += Math.min(this.score / 50, 2.2) * 0.35;
      } else {
        speed += Math.min(this.score / 60, 1.5) * 0.2;
      }

      const numLetters = graphemes.length;
      const bubbleRadius = (this.canvasWidth <= 500) ? 30 : 34;
      const isFirstSpawn = (this.activeWords.length === 0 && this.score === 0);

      // Distribute letter bubbles horizontally and stagger them vertically
      const usableWidth = Math.max(160, this.canvasWidth - (bubbleRadius * 2 + 50));
      const colStep = usableWidth / Math.max(numLetters, 1);
      const startX = bubbleRadius + 25;

      const bubbles = [];
      for (let i = 0; i < numLetters; i++) {
        const bx = startX + (i + 0.5) * colStep + (Math.random() - 0.5) * Math.min(25, colStep * 0.35);
        let by;
        if (isFirstSpawn) {
          // On start, distribute gracefully across screen like reference mockup
          by = Math.max(140, this.canvasHeight * 0.28) + (i * 105) + (Math.random() * 20);
        } else {
          // Normal spawn: rises from bottom letter-by-letter
          by = (this.canvasHeight - 50) + (i * 95) + (Math.random() * 20);
        }

        bubbles.push({
          char: graphemes[i],
          x: bx,
          baseX: bx,
          y: by,
          radius: bubbleRadius,
          phase: Math.random() * Math.PI * 2,
          wobbleSpeed: 0.02 + Math.random() * 0.015,
          wobbleAmp: 12 + Math.random() * 6,
          popped: false,
          shakeFrames: 0,
          shakeOffset: 0
        });
      }

      const initialX = bubbles[0] ? bubbles[0].x : this.canvasWidth / 2;
      const initialY = isBubble ? (bubbles[0] ? bubbles[0].y : this.canvasHeight - 50) : 40;
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
        wobbleAmp: isBubble ? 12 : 4,
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
        const bubbleRadius = (this.canvasWidth <= 500) ? 30 : 34;
        const numLetters = (wordObj.graphemes || []).length;
        const usableWidth = Math.max(160, this.canvasWidth - (bubbleRadius * 2 + 50));
        const colStep = usableWidth / Math.max(numLetters, 1);
        const startX = bubbleRadius + 25;

        wordObj.bubbles = (wordObj.graphemes || []).map((char, i) => {
          const bx = startX + (i + 0.5) * colStep;
          const by = (wordObj.y || (this.canvasHeight - 50)) + (i * 95);
          return {
            char: char,
            x: bx,
            baseX: bx,
            y: by,
            radius: bubbleRadius,
            phase: Math.random() * Math.PI * 2,
            wobbleSpeed: 0.025,
            wobbleAmp: 12,
            popped: false,
            shakeFrames: 0,
            shakeOffset: 0
          };
        });
      }
      return wordObj.bubbles;
    }

    handleKeystroke(char) {
      if (!this.active || this.paused || this.activeWords.length === 0) return;

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
      const maxConcurrent = isBubble ? 1 : 2;
      if (now - this.lastSpawnTime > this.spawnInterval && this.activeWords.length < maxConcurrent) {
        this.spawnWord();
        this.lastSpawnTime = now;
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
          let ceilingHit = false;

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

            // Move letter bubble upwards towards the top
            b.y -= w.speed;

            // Check if any unpopped letter bubble hits the ceiling boundary
            if (!b.popped && b.y <= 45) {
              ceilingHit = true;
            }
          }

          // Keep w.y aligned with leading unpopped bubble
          const unpopped = bubbles.filter(b => !b.popped);
          if (unpopped.length > 0) {
            w.y = unpopped[0].y;
            w.x = unpopped[0].x;
          } else {
            w.y -= w.speed;
          }

          if (ceilingHit || w.y <= 45) {
            this.handleWordMiss(i);
          }
        } else {
          // Falling downward
          w.y += w.speed;
          // Floor boundary collision: word reached bottom incomplete!
          if (w.y >= this.canvasHeight - 60) {
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

      // Misses Tracker (6 slots matching reference UI)
      const heartsContainer = document.getElementById('gameHeartsDisplay');
      if (heartsContainer) {
        let heartsHtml = '';
        const totalSlots = this.maxLives || 6;
        for (let i = 0; i < totalSlots; i++) {
          if (i < this.wordsMissed) {
            // Missed slot: Red circle with X
            heartsHtml += `<span class="game-miss-slot missed" title="Missed" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:2px solid #ef4444;background:rgba(239,68,68,0.18);color:#ef4444;font-size:12px;font-weight:900;line-height:1;">✕</span>`;
          } else {
            // Open life slot: Outline circle
            heartsHtml += `<span class="game-miss-slot open" title="Life available" style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;border:2px solid #52525b;background:transparent;"></span>`;
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
        // Warm dark vignette matching reference mockup (#2e1b20 -> #1e1115 -> #0c0709)
        const vignette = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, Math.max(w, h) * 0.7);
        vignette.addColorStop(0.0, '#2e1b20');
        vignette.addColorStop(0.55, '#1e1115');
        vignette.addColorStop(1.0, '#0c0709');
        ctx.fillStyle = vignette;
        ctx.fillRect(0, 0, w, h);

        // Center Sri Kalaimagal Institute Watermark (seamless low-opacity blend)
        if (this.watermarkImg && this.watermarkImg.complete && this.watermarkImg.naturalWidth > 0) {
          ctx.save();
          ctx.globalAlpha = 0.32;
          const wmWidth = Math.min(w * 0.58, 290);
          const wmAspect = this.watermarkImg.naturalWidth / this.watermarkImg.naturalHeight;
          const wmHeight = wmWidth / wmAspect;
          const wmX = (w - wmWidth) / 2;
          const wmY = (h - wmHeight) / 2;
          ctx.drawImage(this.watermarkImg, wmX, wmY, wmWidth, wmHeight);
          ctx.restore();
        }

        // Ambient golden dust motes drifting gracefully
        if (this.ambientDust) {
          ctx.save();
          for (let i = 0; i < this.ambientDust.length; i++) {
            const d = this.ambientDust[i];
            ctx.fillStyle = `rgba(254, 240, 138, ${d.alpha})`;
            ctx.beginPath();
            ctx.arc(d.x, d.y, d.radius, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }
      } else {
        // Falling mode space background
        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        // Laser defense floor line at bottom (y = h - 60)
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.beginPath();
        ctx.moveTo(10, h - 60);
        ctx.lineTo(w - 10, h - 60);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = '#ef4444';
        ctx.font = 'bold 10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('🛡️ BASELINE DEFENSE SHIELD — STOP FALLING METEORS 🛡️', w / 2, h - 45);
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
      const r = b.radius || 34;

      ctx.save();

      // Outer golden glow
      if (isCurrentTarget) {
        ctx.shadowColor = 'rgba(251, 191, 36, 0.85)';
        ctx.shadowBlur = 22;
      } else {
        ctx.shadowColor = 'rgba(245, 158, 11, 0.35)';
        ctx.shadowBlur = 12;
      }

      // 3D Spherical Radial Gradient (Focal point top-left)
      const grad = ctx.createRadialGradient(
        bx - r * 0.35, by - r * 0.35, r * 0.08,
        bx, by, r
      );
      grad.addColorStop(0.0, '#fffbeb'); // pure creamy highlight
      grad.addColorStop(0.2, '#fef08a'); // soft lemon gold
      grad.addColorStop(0.55, '#f59e0b'); // core warm amber body
      grad.addColorStop(0.85, '#d97706'); // warm shadow
      grad.addColorStop(1.0, '#78350f'); // deep rim shade

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();

      // Delicate outer rim stroke
      ctx.strokeStyle = isCurrentTarget ? 'rgba(254, 240, 138, 0.9)' : 'rgba(251, 191, 36, 0.4)';
      ctx.lineWidth = isCurrentTarget ? 2.5 : 1.2;
      ctx.stroke();

      // Top-Left Glossy Crescent Reflection
      ctx.save();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      ctx.beginPath();
      ctx.ellipse(
        bx - r * 0.32, by - r * 0.32,
        r * 0.28, r * 0.14,
        -Math.PI / 4, 0, Math.PI * 2
      );
      ctx.fill();
      ctx.restore();

      // Bottom-Right Soft Inner Specular Rim
      ctx.save();
      ctx.strokeStyle = 'rgba(254, 240, 138, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(bx, by, r - 2, 0.25 * Math.PI, 0.65 * Math.PI);
      ctx.stroke();
      ctx.restore();

      // Active Target Pulsating Aura Ring
      if (isCurrentTarget) {
        ctx.save();
        const pulse = (Math.sin(Date.now() * 0.008) + 1) * 0.5;
        ctx.strokeStyle = `rgba(254, 240, 138, ${0.4 + pulse * 0.5})`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(bx, by, r + 6 + pulse * 3, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.restore(); // restore shadow

      // Render the single centered Letter
      ctx.save();
      const isTamil = (this.lang === 'ta');
      const fontSize = isTamil ? Math.round(r * 0.75) : Math.round(r * 0.88);
      ctx.font = `bold ${fontSize}px Georgia, "Times New Roman", "Mukta Malar", serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Text shadow for sharp legibility
      ctx.shadowColor = 'rgba(255, 255, 255, 0.35)';
      ctx.shadowBlur = 1;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 1;

      // Deep rich chocolate espresso color (#241208)
      ctx.fillStyle = '#241208';
      const displayText = isTamil ? b.char : b.char.toUpperCase();
      ctx.fillText(displayText, bx, by + 1);

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
      const x = wordObj.x + wordObj.shakeOffset;
      const y = wordObj.y;
      const isBubble = (this.gameType === 'bubble');

      ctx.save();

      if (isBubble) {
        // Render Floating Bubble Container
        const radius = Math.max(wordObj.width / 2, 32);

        // Active target aura
        if (isActiveTarget) {
          ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
          ctx.shadowBlur = 18;
        }

        // Bubble gradient fill
        const bubbleGrad = ctx.createRadialGradient(x - radius * 0.3, y - radius * 0.3, radius * 0.1, x, y, radius);
        bubbleGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
        bubbleGrad.addColorStop(0.3, isActiveTarget ? 'rgba(59, 130, 246, 0.35)' : 'rgba(99, 102, 241, 0.25)');
        bubbleGrad.addColorStop(1, isActiveTarget ? 'rgba(37, 99, 235, 0.65)' : 'rgba(79, 70, 229, 0.4)');

        ctx.fillStyle = bubbleGrad;
        ctx.strokeStyle = isActiveTarget ? '#60a5fa' : 'rgba(165, 180, 252, 0.6)';
        ctx.lineWidth = isActiveTarget ? 2.5 : 1.5;

        ctx.beginPath();
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glossy bubble highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.65)';
        ctx.beginPath();
        ctx.ellipse(x - radius * 0.35, y - radius * 0.35, radius * 0.25, radius * 0.12, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Render Falling Meteor Pod
        const w = wordObj.width;
        const h = wordObj.height;
        const rx = x - w / 2;
        const ry = y - h / 2;

        if (isActiveTarget) {
          ctx.shadowColor = 'rgba(245, 158, 11, 0.8)';
          ctx.shadowBlur = 18;
        }

        const podGrad = ctx.createLinearGradient(rx, ry, rx + w, ry + h);
        podGrad.addColorStop(0, isActiveTarget ? '#1e293b' : '#0f172a');
        podGrad.addColorStop(1, isActiveTarget ? '#334155' : '#1e293b');

        ctx.fillStyle = podGrad;
        ctx.strokeStyle = isActiveTarget ? '#f59e0b' : 'rgba(255, 255, 255, 0.25)';
        ctx.lineWidth = isActiveTarget ? 2.5 : 1.5;

        // Rounded pill pod
        this.drawRoundRect(ctx, rx, ry, w, h, 20);
        ctx.fill();
        ctx.stroke();

        // Propulsion engine glow on top
        ctx.fillStyle = isActiveTarget ? '#f59e0b' : '#60a5fa';
        ctx.beginPath();
        ctx.arc(x, ry, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();

      // Render Letters with letter-by-letter highlighting
      ctx.save();
      ctx.font = 'bold 20px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';

      // Compute total text width
      const graphemes = wordObj.graphemes;
      const graphemeWidths = graphemes.map(g => ctx.measureText(g).width);
      const totalTextWidth = graphemeWidths.reduce((a, b) => a + b, 0);

      let curX = x - totalTextWidth / 2;
      const textY = y;

      for (let i = 0; i < graphemes.length; i++) {
        const char = graphemes[i];
        const charW = graphemeWidths[i];

        if (isActiveTarget) {
          if (i < this.charIndex) {
            // Already typed correctly: Electric Green
            ctx.fillStyle = '#10b981';
            ctx.shadowColor = 'rgba(16, 185, 129, 0.6)';
            ctx.shadowBlur = 8;
          } else if (i === this.charIndex) {
            // Current letter to type: Bright Glowing Gold with indicator
            ctx.fillStyle = '#fbbf24';
            ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
            ctx.shadowBlur = 12;

            // Target indicator pill under current letter
            ctx.fillStyle = '#fbbf24';
            ctx.fillRect(curX, textY + 12, charW, 3);
          } else {
            // Upcoming letter: Crisp White
            ctx.fillStyle = '#ffffff';
            ctx.shadowBlur = 0;
          }
        } else {
          // Inactive background word: Muted
          ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
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

  // Auto initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => engine.init());
  } else {
    engine.init();
  }

})(window);
