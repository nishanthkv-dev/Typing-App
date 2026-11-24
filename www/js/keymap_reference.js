/**
 * TYPING THALAIVA — KEYBOARD LAYOUT & CHARACTER MAP REFERENCE SYSTEM
 * Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute
 * 
 * Features:
 *  1. Authoritative layouts for Tamil 99 (G.O. Ms. No. 17 / DoTE standard),
 *     Tamil Mechanical Typewriter (Government Syllabus), and English QWERTY.
 *  2. Interactive character and keystroke search engine.
 *  3. In-practice lookup modal without losing student progress or typing state.
 *  4. Syllable combinations, dead-key virama (pulli), and Grantha Sanskrit key mappings.
 */

(function (window) {
  'use strict';

  const KEYMAP_REFERENCE = {
    tamil99: {
      title: 'Tamil 99 (DoTE Standard)',
      subtitle: 'Official Tamil Nadu Government Examination Keyboard Interface',
      rows: [
        [
          { key: '`', label: '`', shift: '~', finger: 'LP' },
          { key: '1', label: '1', shift: '!', finger: 'LP' },
          { key: '2', label: '2', shift: '@', finger: 'LR' },
          { key: '3', label: '3', shift: '#', finger: 'LM' },
          { key: '4', label: '4', shift: '$', finger: 'LI' },
          { key: '5', label: '5', shift: '%', finger: 'LI' },
          { key: '6', label: '6', shift: '^', finger: 'RI' },
          { key: '7', label: '7', shift: '&', finger: 'RI' },
          { key: '8', label: '8', shift: '*', finger: 'RM' },
          { key: '9', label: '9', shift: '(', finger: 'RR' },
          { key: '0', label: '0', shift: ')', finger: 'RP' },
          { key: '-', label: '-', shift: '_', finger: 'RP' },
          { key: '=', label: '=', shift: '+', finger: 'RP' }
        ],
        [
          { key: 'q', label: 'ஆ', shift: 'ஸ', finger: 'LP' },
          { key: 'w', label: 'ஈ', shift: 'ஷ', finger: 'LR' },
          { key: 'e', label: 'ஊ', shift: 'ஜ', finger: 'LM' },
          { key: 'r', label: 'ஐ', shift: 'ஹ', finger: 'LI' },
          { key: 't', label: 'ஏ', shift: 'க்ஷ', finger: 'LI' },
          { key: 'y', label: 'ள', shift: 'ஸ்ரீ', finger: 'RI' },
          { key: 'u', label: 'ற', shift: 'ளூ', finger: 'RI' },
          { key: 'i', label: 'ன', shift: ':', finger: 'RM' },
          { key: 'o', label: 'ட', shift: '[', finger: 'RR' },
          { key: 'p', label: 'ண', shift: ']', finger: 'RP' },
          { key: '[', label: 'ச', shift: '{', finger: 'RP' },
          { key: ']', label: 'ஞ', shift: '}', finger: 'RP' }
        ],
        [
          { key: 'a', label: 'அ', shift: '௹', finger: 'LP', home: true },
          { key: 's', label: 'இ', shift: '௺', finger: 'LR', home: true },
          { key: 'd', label: 'உ', shift: '௸', finger: 'LM', home: true },
          { key: 'f', label: '்', shift: 'ஃ', finger: 'LI', home: true },
          { key: 'g', label: 'எ', shift: 'ங', finger: 'LI' },
          { key: 'h', label: 'க', shift: '௧', finger: 'RI' },
          { key: 'j', label: 'ப', shift: '௨', finger: 'RI', home: true },
          { key: 'k', label: 'ம', shift: '௩', finger: 'RM', home: true },
          { key: 'l', label: 'த', shift: '௪', finger: 'RR', home: true },
          { key: ';', label: 'ந', shift: '௫', finger: 'RP', home: true },
          { key: "'", label: 'ய', shift: '௬', finger: 'RP' }
        ],
        [
          { key: 'z', label: 'ஔ', shift: '௳', finger: 'LP' },
          { key: 'x', label: 'ஓ', shift: '௴', finger: 'LR' },
          { key: 'c', label: 'ஒ', shift: '௵', finger: 'LM' },
          { key: 'v', label: 'வ', shift: '௶', finger: 'LI' },
          { key: 'b', label: 'ங', shift: '௷', finger: 'LI' },
          { key: 'n', label: 'ல', shift: 'ௐ', finger: 'RI' },
          { key: 'm', label: 'ர', shift: '?', finger: 'RI' },
          { key: ',', label: 'ச', shift: '<', finger: 'RM' },
          { key: '.', label: 'ஞ', shift: '>', finger: 'RR' },
          { key: '/', label: 'ழ', shift: '?', finger: 'RP' }
        ]
      ],
      combinations: [
        { char: 'க்', keys: 'h + f', desc: 'க + புள்ளி (Virama dead-key)' },
        { char: 'கா', keys: 'h + q', desc: 'க + ஆ (துணைக்கால் ா)' },
        { char: 'கி', keys: 'h + s', desc: 'க + இ (மேல்விலங்கு ி)' },
        { char: 'கீ', keys: 'h + w', desc: 'க + ஈ (சுழி மேல்விலங்கு ீ)' },
        { char: 'கு', keys: 'h + d', desc: 'க + உ (கீழ்விலங்கு ு)' },
        { char: 'கூ', keys: 'h + e', desc: 'க + ஊ (சுழி கீழ்விலங்கு ூ)' },
        { char: 'கெ', keys: 'h + g', desc: 'க + எ (ஒற்றைக் கொம்பு ெ)' },
        { char: 'கே', keys: 'h + t', desc: 'க + ஏ (இரட்டைக் கொம்பு ே)' },
        { char: 'கை', keys: 'h + r', desc: 'க + ஐ (இணைக்கொம்பு ை)' },
        { char: 'கொ', keys: 'h + c', desc: 'க + ஒ (கொம்பு + கால் ொ)' },
        { char: 'கோ', keys: 'h + x', desc: 'க + ஓ (இரட்டைக்கொம்பு + கால் ோ)' },
        { char: 'கௌ', keys: 'h + z', desc: 'க + ஔ (கொம்பு + ள ௌ)' },
        { char: 'ங் / ங்க', keys: 'b + f / b + h', desc: 'ங + புள்ளி / ங + க' },
        { char: 'ச் / ச்ச', keys: '[ + f / [ + [', desc: 'ச + புள்ளி / ச + ச' },
        { char: 'ஞ் / ஞ்ச', keys: '] + f / ] + [', desc: 'ஞ + புள்ளி / ஞ + ச' },
        { char: 'ட் / ட்ட', keys: 'o + f / o + o', desc: 'ட + புள்ளி / ட + ட' },
        { char: 'ண் / ண்ட', keys: 'p + f / p + o', desc: 'ண + புள்ளி / ண + ட' },
        { char: 'த் / த்த', keys: 'l + f / l + l', desc: 'த + புள்ளி / த + த' },
        { char: 'ந் / ந்த', keys: '; + f / ; + l', desc: 'ந + புள்ளி / ந + த' },
        { char: 'ப் / ப்ப', keys: 'j + f / j + j', desc: 'ப + புள்ளி / ப + ப' },
        { char: 'ம் / ம்ப', keys: 'k + f / k + j', desc: 'ம + புள்ளி / ம + ப' },
        { char: 'ய் / ர் / ல்', keys: "' + f / m + f / n + f", desc: 'ய / ர / ல + புள்ளி' },
        { char: 'வ் / ழ் / ள்', keys: "v + f / / + f / y + f", desc: 'வ / ழ / ள + புள்ளி' },
        { char: 'ற் / ன் / ன்ற', keys: "u + f / i + f / i + u", desc: 'ற / ன + புள்ளி / ன + ற' },
        { char: 'ஜ / ஷ / ஸ / ஹ', keys: 'Shift+E / Shift+W / Shift+Q / Shift+R', desc: 'கிரந்த மெய் எழுத்துகள்' },
        { char: 'க்ஷ / ஸ்ரீ', keys: 'Shift+T / Shift+Y', desc: 'க்ஷ / ஸ்ரீ சிறப்பு கூட்டு' }
      ]
    },
    typewriter: {
      title: 'Tamil Typewriter (Mechanical Standard)',
      subtitle: 'Official Mechanical Typewriter Layout for Technical Examinations',
      rows: [
        [
          { key: '`', label: 'ஃ', shift: '~', finger: 'LP' },
          { key: '1', label: '1', shift: 'ஸ', finger: 'LP' },
          { key: '2', label: '2', shift: '"', finger: 'LR' },
          { key: '3', label: '3', shift: '%', finger: 'LM' },
          { key: '4', label: '4', shift: 'ஜ', finger: 'LI' },
          { key: '5', label: '5', shift: 'ு', finger: 'LI' },
          { key: '6', label: '6', shift: 'ூ', finger: 'RI' },
          { key: '7', label: '7', shift: '&', finger: 'RI' },
          { key: '8', label: '8', shift: "'", finger: 'RM' },
          { key: '9', label: '9', shift: '(', finger: 'RR' },
          { key: '0', label: '0', shift: ')', finger: 'RP' },
          { key: '-', label: '/', shift: 'ஸ்ரீ', finger: 'RP' },
          { key: '=', label: '=', shift: '+', finger: 'RP' }
        ],
        [
          { key: 'q', label: 'ணு', shift: 'ஞு', finger: 'LP' },
          { key: 'w', label: 'ற', shift: 'று', finger: 'LR' },
          { key: 'e', label: 'ந', shift: 'நு', finger: 'LM' },
          { key: 'r', label: 'ச', shift: 'சு', finger: 'LI' },
          { key: 't', label: 'வ', shift: 'கூ', finger: 'LI' },
          { key: 'y', label: 'ல', shift: 'லு', finger: 'RI' },
          { key: 'u', label: 'ர', shift: 'ரு', finger: 'RI' },
          { key: 'i', label: 'ை', shift: 'ஐ', finger: 'RM' },
          { key: 'o', label: 'டி', shift: 'டீ', finger: 'RR' },
          { key: 'p', label: 'ி', shift: 'ீ', finger: 'RP' },
          { key: '[', label: 'ு', shift: 'ூ', finger: 'RP' },
          { key: ']', label: 'ஹ', shift: 'T', finger: 'RP' }
        ],
        [
          { key: 'a', label: 'ய', shift: '}', finger: 'LP', home: true },
          { key: 's', label: 'ள', shift: 'ளு', finger: 'LR', home: true },
          { key: 'd', label: 'ன', shift: 'னு', finger: 'LM', home: true },
          { key: 'f', label: 'க', shift: 'கு', finger: 'LI', home: true },
          { key: 'g', label: 'ப', shift: 'பு', finger: 'LI' },
          { key: 'h', label: 'ா', shift: 'ழ', finger: 'RI' },
          { key: 'j', label: 'த', shift: 'து', finger: 'RI', home: true },
          { key: 'k', label: 'ம', shift: 'மு', finger: 'RM', home: true },
          { key: 'l', label: 'ட', shift: 'டு', finger: 'RR', home: true },
          { key: ';', label: '்', shift: '‘', finger: 'RP', home: true },
          { key: "'", label: 'ங', shift: '"', finger: 'RP' }
        ],
        [
          { key: 'z', label: 'ண', shift: 'ஷ', finger: 'LP' },
          { key: 'x', label: 'ஒ', shift: 'ஓ', finger: 'LR' },
          { key: 'c', label: 'உ', shift: 'ஊ', finger: 'LM' },
          { key: 'v', label: 'எ', shift: 'ஏ', finger: 'LI' },
          { key: 'b', label: 'ெ', shift: 'க்ஷ', finger: 'LI' },
          { key: 'n', label: 'ே', shift: 'சூ', finger: 'RI' },
          { key: 'm', label: 'அ', shift: 'ஆ', finger: 'RI' },
          { key: ',', label: 'இ', shift: 'ஈ', finger: 'RM' },
          { key: '.', label: ',', shift: '?', finger: 'RR' },
          { key: '/', label: '.', shift: '-', finger: 'RP' }
        ]
      ],
      combinations: [
        { char: 'க்', keys: '; + f', desc: 'புள்ளி (;) + க' },
        { char: 'கா', keys: 'f + h', desc: 'க + துணைக்கால் (h)' },
        { char: 'கி', keys: 'p + f', desc: 'மேல்விலங்கு (p) + க' },
        { char: 'கீ', keys: 'Shift+P + f', desc: 'சுழி மேல்விலங்கு (P) + க' },
        { char: 'கு', keys: 'Shift+F', desc: 'நேரடி விசை (F)' },
        { char: 'கூ', keys: 'Shift+T', desc: 'நேரடி விசை (T)' },
        { char: 'கெ', keys: 'b + f', desc: 'முன் ஒற்றைக் கொம்பு (b) + க' },
        { char: 'கே', keys: 'n + f', desc: 'முன் இரட்டைக் கொம்பு (n) + க' },
        { char: 'கை', keys: 'i + f', desc: 'முன் இணைக்கொம்பு (i) + க' },
        { char: 'கொ', keys: 'b + f + h', desc: 'கொம்பு (b) + க + துணைக்கால் (h)' },
        { char: 'கோ', keys: 'n + f + h', desc: 'இரட்டைக்கொம்பு (n) + க + கால் (h)' },
        { char: 'கௌ', keys: 'b + f + s', desc: 'கொம்பு (b) + க + ள (s)' },
        { char: 'த் / தா / தி', keys: ';+j / j+h / p+j', desc: 'த வரிசை' },
        { char: 'ப் / பா / பி', keys: ';+g / g+h / p+g', desc: 'ப வரிசை' },
        { char: 'ம் / மா / மி', keys: ';+k / k+h / p+k', desc: 'ம வரிசை' },
        { char: 'ல் / லா / லி', keys: ';+y / y+h / p+y', desc: 'ல வரிசை' },
        { char: 'ழ் / ழா / ழி', keys: ';+Shift+H / Shift+H+h / p+Shift+H', desc: 'ழ வரிசை' },
        { char: 'ள் / ளா / ளி', keys: ';+s / s+h / p+s', desc: 'ள வரிசை' },
        { char: 'ற் / றா / றி', keys: ';+w / w+h / p+w', desc: 'ற வரிசை' },
        { char: 'ன் / னா / னி', keys: ';+d / d+h / p+d', desc: 'ன வரிசை' }
      ]
    },
    qwerty: {
      title: 'English QWERTY Layout',
      subtitle: 'Standard Universal Touch Typing Keyboard Reference',
      rows: [
        [
          { key: '`', label: '`', shift: '~', finger: 'LP' },
          { key: '1', label: '1', shift: '!', finger: 'LP' },
          { key: '2', label: '2', shift: '@', finger: 'LR' },
          { key: '3', label: '3', shift: '#', finger: 'LM' },
          { key: '4', label: '4', shift: '$', finger: 'LI' },
          { key: '5', label: '5', shift: '%', finger: 'LI' },
          { key: '6', label: '6', shift: '^', finger: 'RI' },
          { key: '7', label: '7', shift: '&', finger: 'RI' },
          { key: '8', label: '8', shift: '*', finger: 'RM' },
          { key: '9', label: '9', shift: '(', finger: 'RR' },
          { key: '0', label: '0', shift: ')', finger: 'RP' },
          { key: '-', label: '-', shift: '_', finger: 'RP' },
          { key: '=', label: '=', shift: '+', finger: 'RP' }
        ],
        [
          { key: 'q', label: 'q', shift: 'Q', finger: 'LP' },
          { key: 'w', label: 'w', shift: 'W', finger: 'LR' },
          { key: 'e', label: 'e', shift: 'E', finger: 'LM' },
          { key: 'r', label: 'r', shift: 'R', finger: 'LI' },
          { key: 't', label: 't', shift: 'T', finger: 'LI' },
          { key: 'y', label: 'y', shift: 'Y', finger: 'RI' },
          { key: 'u', label: 'u', shift: 'U', finger: 'RI' },
          { key: 'i', label: 'i', shift: 'I', finger: 'RM' },
          { key: 'o', label: 'o', shift: 'O', finger: 'RR' },
          { key: 'p', label: 'p', shift: 'P', finger: 'RP' },
          { key: '[', label: '[', shift: '{', finger: 'RP' },
          { key: ']', label: ']', shift: '}', finger: 'RP' }
        ],
        [
          { key: 'a', label: 'a', shift: 'A', finger: 'LP', home: true },
          { key: 's', label: 's', shift: 'S', finger: 'LR', home: true },
          { key: 'd', label: 'd', shift: 'D', finger: 'LM', home: true },
          { key: 'f', label: 'f', shift: 'F', finger: 'LI', home: true },
          { key: 'g', label: 'g', shift: 'G', finger: 'LI' },
          { key: 'h', label: 'h', shift: 'H', finger: 'RI' },
          { key: 'j', label: 'j', shift: 'J', finger: 'RI', home: true },
          { key: 'k', label: 'k', shift: 'K', finger: 'RM', home: true },
          { key: 'l', label: 'l', shift: 'L', finger: 'RR', home: true },
          { key: ';', label: ';', shift: ':', finger: 'RP', home: true },
          { key: "'", label: "'", shift: '"', finger: 'RP' }
        ],
        [
          { key: 'z', label: 'z', shift: 'Z', finger: 'LP' },
          { key: 'x', label: 'x', shift: 'X', finger: 'LR' },
          { key: 'c', label: 'c', shift: 'C', finger: 'LM' },
          { key: 'v', label: 'v', shift: 'V', finger: 'LI' },
          { key: 'b', label: 'b', shift: 'B', finger: 'LI' },
          { key: 'n', label: 'n', shift: 'N', finger: 'RI' },
          { key: 'm', label: 'm', shift: 'M', finger: 'RI' },
          { key: ',', label: ',', shift: '<', finger: 'RM' },
          { key: '.', label: '.', shift: '>', finger: 'RR' },
          { key: '/', label: '/', shift: '?', finger: 'RP' }
        ]
      ],
      combinations: [
        { char: 'Home Row', keys: 'a s d f j k l ;', desc: 'Rest position for 8 fingers' },
        { char: 'Left Pinky', keys: 'q, a, z, 1', desc: 'Little finger reach (left hand)' },
        { char: 'Right Pinky', keys: 'p, ;, /, 0, [, ]', desc: 'Little finger reach (right hand)' },
        { char: 'Left Index', keys: 'f, g, r, t, v, b, 4, 5', desc: 'Forefinger extended zone (left)' },
        { char: 'Right Index', keys: 'j, h, u, y, m, n, 6, 7', desc: 'Forefinger extended zone (right)' }
      ]
    }
  };

  let currentKeyMapTab = 'tamil99';

  function openKeyMapModal(initialTab) {
    if (initialTab) {
      currentKeyMapTab = initialTab;
    } else if (typeof pracLang !== 'undefined' && pracLang === 'ta') {
      currentKeyMapTab = (typeof pracLayout !== 'undefined' && pracLayout === 'typewriter') ? 'typewriter' : 'tamil99';
    } else if (typeof CFG !== 'undefined' && CFG.lang === 'ta') {
      currentKeyMapTab = (CFG.layout === 'typewriter') ? 'typewriter' : 'tamil99';
    } else {
      currentKeyMapTab = 'qwerty';
    }
    switchKeyMapTab(currentKeyMapTab);
    const m = document.getElementById('modalKeyMap');
    if (m) {
      m.style.display = 'flex';
      m.classList.add('show', 'open');
      const input = document.getElementById('kmSearchInput');
      if (input) {
        input.value = '';
        setTimeout(() => input.focus(), 100);
      }
    }
  }

  function closeKeyMapModal() {
    const m = document.getElementById('modalKeyMap');
    if (m) {
      m.style.display = 'none';
      m.classList.remove('show', 'open');
    }
  }

  function switchKeyMapTab(tabKey) {
    currentKeyMapTab = tabKey;
    const tabMap = { tamil99: 'kmTabTamil99', typewriter: 'kmTabTypewriter', qwerty: 'kmTabQwerty' };
    Object.keys(tabMap).forEach(k => {
      const btn = document.getElementById(tabMap[k]);
      if (btn) btn.classList.toggle('active', k === tabKey);
    });
    const searchInput = document.getElementById('kmSearchInput');
    const query = searchInput ? searchInput.value.trim() : '';
    renderKeyMapUI(tabKey, query);
  }

  function onKeyMapSearch(val) {
    renderKeyMapUI(currentKeyMapTab, (val || '').trim());
  }

  function renderKeyMapUI(tabKey, filterQuery) {
    const container = document.getElementById('kmContentBody');
    if (!container) return;
    const ref = KEYMAP_REFERENCE[tabKey] || KEYMAP_REFERENCE.tamil99;
    const q = (filterQuery || '').toLowerCase();

    function escapeHtml(s) {
      return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    let html = `
      <div style="background:var(--card-bg);border:1.5px solid var(--card-border);border-radius:14px;padding:14px;margin-bottom:14px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
          <div>
            <div style="font-size:13px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;">${escapeHtml(ref.title)}</div>
            <div style="font-size:11px;color:var(--muted);">${escapeHtml(ref.subtitle)}</div>
          </div>
          <span style="font-size:10.5px;font-weight:700;padding:2px 8px;border-radius:6px;background:rgba(37,99,235,0.1);color:#2563eb;">Touch Fingering Guide</span>
        </div>
    `;

    // Render Visual Hardware Keyboard Rows
    html += `<div class="km-keyboard-grid" style="display:flex;flex-direction:column;gap:5px;background:rgba(0,0,0,0.2);padding:10px;border-radius:12px;overflow-x:auto;">`;
    ref.rows.forEach(row => {
      html += `<div style="display:flex;gap:4px;justify-content:center;">`;
      row.forEach(k => {
        const isMatch = q && (k.key.toLowerCase().includes(q) || k.label.toLowerCase().includes(q) || (k.shift && k.shift.toLowerCase().includes(q)));
        const borderStyle = isMatch
          ? 'border:2px solid #f59e0b;background:#fef3c7;color:#92400e;box-shadow:0 0 10px rgba(245,158,11,0.5);'
          : (k.home ? 'border:1.5px solid #2563eb;background:rgba(37,99,235,0.08);' : 'border:1px solid var(--card-border);background:var(--card-bg);');

        html += `
          <div style="flex:1;min-width:32px;max-width:44px;height:44px;border-radius:6px;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:3px 2px;box-sizing:border-box;font-family:var(--font-mono);${borderStyle}" title="Key: ${escapeHtml(k.key)} (${k.finger})">
            <span style="font-size:9.5px;color:var(--muted);font-weight:700;">${escapeHtml(k.shift || '')}</span>
            <span style="font-size:13px;font-weight:800;color:var(--ink);">${escapeHtml(k.label || k.key)}</span>
          </div>
        `;
      });
      html += `</div>`;
    });
    html += `</div></div>`;

    // Syllables and Combinations Lookup Cards
    html += `
      <div style="background:var(--card-bg);border:1.5px solid var(--card-border);border-radius:14px;padding:14px;">
        <div style="font-size:13px;font-weight:800;color:var(--ink);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
          <span>📋</span> Syllable Combinations &amp; Keystroke Map
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(220px, 1fr));gap:8px;">
    `;

    const filteredCombos = ref.combinations.filter(c => {
      if (!q) return true;
      return c.char.toLowerCase().includes(q) || c.keys.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q);
    });

    if (filteredCombos.length === 0) {
      html += `<div style="grid-column:1/-1;text-align:center;padding:20px;color:var(--muted);font-size:12.5px;">No matching character combination found for "${escapeHtml(filterQuery)}". Try searching a vowel or consonant.</div>`;
    } else {
      filteredCombos.forEach(c => {
        html += `
          <div style="background:rgba(255,255,255,0.04);border:1px solid var(--card-border);border-radius:8px;padding:8px 10px;display:flex;align-items:center;justify-content:space-between;">
            <div>
              <div style="font-size:15px;font-weight:800;color:var(--primary);">${escapeHtml(c.char)}</div>
              <div style="font-size:11px;color:var(--muted);">${escapeHtml(c.desc)}</div>
            </div>
            <div style="background:var(--card-bg);border:1px solid var(--primary-glow);padding:4px 8px;border-radius:6px;font-family:var(--font-mono);font-size:12px;font-weight:800;color:var(--ink);box-shadow:0 1px 3px rgba(0,0,0,0.08);">
              ${escapeHtml(c.keys)}
            </div>
          </div>
        `;
      });
    }

    html += `</div></div>`;
    container.innerHTML = html;
  }

  // Export functions globally
  window.KEYMAP_REFERENCE = KEYMAP_REFERENCE;
  window.openKeyMapModal = openKeyMapModal;
  window.closeKeyMapModal = closeKeyMapModal;
  window.switchKeyMapTab = switchKeyMapTab;
  window.onKeyMapSearch = onKeyMapSearch;

})(window);
