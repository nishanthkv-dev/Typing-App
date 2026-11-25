/**
 * TYPING THALAIVA — PRACTICE DRILLS & CURRICULUM OVERHAUL ENGINE
 * Powered by K V N Techno Labs | Sri Kalaimagal Technical Institute
 * 
 * Features:
 *  1. Completely separated, syllabus-based curriculums for:
 *     - Tamil 99 (G.O. Ms. No. 17 / DoTE Tamil Nadu standard)
 *     - Tamil Typewriter (Mechanical Typewriter syllabus)
 *     - English QWERTY Touch Typing
 *  2. NO single-line drills: All lessons consist of 4 to 8 complete multi-line exercises.
 *  3. Adaptive Reinforcement Generator: Combines key combinations and vocabulary
 *     from Lessons N-1 and N to reinforce muscle memory.
 *  4. Lesson Completion Modal with metrics and one-click reinforcement practice.
 */

(function (window) {
  'use strict';

  // --- TAMIL 99 CURRICULUM (16 MULTI-LINE LESSONS BASED ON TN GOVT DOTE SYLLABUS) ---
  const TAMIL99_CURRICULUM = [
    {
      lesson: "பயிற்சி 1 — நடுவரிசை விசைகள் (Home Row)",
      sub: "அ இ உ ் | ந த ம ப க (asdf ;lkj)",
      keyHint: "asdf ;lkj",
      fingerGuide: {
        left: ["சுண்டு→அ (a)", "மோதிர→இ (s)", "நடு→உ (d)", "ஆள்காட்டி→் (f)"],
        right: ["ஆள்காட்டி→க (h), ப (j)", "நடு→ம (k)", "மோதிர→த (l)", "சுண்டு→ந (;)"],
        homeKeys: true
      },
      text: "அ இ உ ் ந த ம ப க அ இ உ ் ந த ம ப க\nஅ இ உ ் ந த ம ப க அ இ உ ் ந த ம ப க\nஅகம் இகம் உகம் பகம் மனம் தனம் நகம் பதம் மதம்\nபடம் மடம் பலம் களம் அகம் இகம் உகம் பகம் மனம்\nஅன்பு கல்வி பண்பு அறிவு ஒழுக்கம் உழைப்பு வெற்றி\nபதவி பாடம் நகம் பதம் மனம் தனம் பகம் உகம் இகம்"
    },
    {
      lesson: "பயிற்சி 2 — விரிவு நடுவரிசை விசைகள் (Extended Home Row)",
      sub: "அ இ உ ் எ | க ப ம த ந ய (asdfgf ;lkjhj)",
      keyHint: "asdfgf ;lkjhj",
      fingerGuide: {
        left: ["சுண்டு→அ", "மோதிர→இ", "நடு→உ", "ஆள்காட்டி→், எ (f, g)"],
        right: ["ஆள்காட்டி→க, ப, ய (h, j, ')", "நடு→ம", "மோதிர→த", "சுண்டு→ந"],
        homeKeys: true
      },
      text: "அ இ உ ் எ க ப ம த ந ய அ இ உ ் எ க ப ம த ந ய\nஅ இ உ ் எ க ப ம த ந ய அ இ உ ் எ க ப ம த ந ய\nஎது மெது தெளிவு எல்லை என்று தேன் நெய் மெய்\nஅயல் உயர்வு கயல் பயம் தயம் நயம் மயம் யாகம்\nமெது மெது தெளிவு எல்லை எல்லை என்று தேன் நயம்\nஎல்லை எது மெது உயர்வு பயம் கயல் நயம் மெய் நெய்"
    },
    {
      lesson: "பயிற்சி 3 — மேல்வரிசை விசைகள் (Top Row Keys)",
      sub: "ஆ ஈ ஊ ஏ ஐ | ச ஞ ட ண ற ன (awertqfa ;poiuy;j)",
      keyHint: "qwert yuiop",
      fingerGuide: {
        left: ["சுண்டு→ஆ (q)", "மோதிர→ஈ (w)", "நடு→ஊ (e)", "ஆள்காட்டி→ஐ (r), ஏ (t)"],
        right: ["ஆள்காட்டி→ள (y), ற (u)", "நடு→ன (i)", "மோதிர→ட (o)", "சுண்டு→ண (p), ச ([)"],
        homeKeys: false
      },
      text: "ஆ ஈ ஊ ஏ ஐ ச ஞ ட ண ற ன ஆ ஈ ஊ ஏ ஐ ச ஞ ட ண ற ன\nஆ ஈ ஊ ஏ ஐ ச ஞ ட ண ற ன ஆ ஈ ஊ ஏ ஐ ச ஞ ட ண ற ன\nஆடல் ஈகை ஊக்கம் ஏணி ஐந்து சட்டம் ஞாயிறு படம்\nகண்ணன் கற்றல் பாடம் நாடக மன்றம் நன்றி பாடம்\nஆசிரியர் கற்பித்த பாடம் மாணவர்கள் மனத்தில் பதிந்தது\nஊக்கம் உடைமை ஆக்கம் தரும் எண்ணித் துணிக கருமம்"
    },
    {
      lesson: "பயிற்சி 4 — கீழ்வரிசை விசைகள் (Bottom Row Keys)",
      sub: "ஒ ஓ ஔ ஃ | வ ழ ள ற ல (azxcvf ;.,mnj)",
      keyHint: "zxcv bnm,./",
      fingerGuide: {
        left: ["சுண்டு→ஔ (z)", "மோதிர→ஓ (x)", "நடு→ஒ (c)", "ஆள்காட்டி→வ (v)"],
        right: ["ஆள்காட்டி→ங (b), ல (n), ர (m)", "நடு→ச (,)", "மோதிர→ஞ (.)", "சுண்டு→ழ (/)"],
        homeKeys: false
      },
      text: "ஒ ஓ ஔ ஃ வ ழ ள ற ல ஒ ஓ ஔ ஃ வ ழ ள ற ல\nஒ ஓ ஔ ஃ வ ழ ள ற ல ஒ ஓ ஔ ஃ வ ழ ள ற ல\nஒற்றுமை ஓட்டம் ஔவை அஃது வானம் தமிழ் வள்ளல்\nவெற்றி வேல் அழகு வழக்கம் உலகம் சிறப்பு மலர்\nதமிழ் எங்கள் தாய்மொழி ஆகும் தமிழ் இனிமை வாய்ந்தது\nவாழ்க தமிழ் வளர்க பாரதம் ஒற்றுமையே நாட்டின் பலம்"
    },
    {
      lesson: "பயிற்சி 5 — கிரந்த எழுத்துகள் (Grantha Sanskrit Keys)",
      sub: "ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ (Shift Keys)",
      keyHint: "Shift+E, Shift+W, Shift+Q, Shift+R, Shift+T, Shift+Y",
      fingerGuide: {
        left: ["Shift+e→ஜ", "Shift+w→ஷ", "Shift+q→ஸ", "Shift+r→ஹ", "Shift+t→க்ஷ"],
        right: ["Shift+y→ஸ்ரீ", "வலக்கை விரல்கள் துணை விசைகள்"],
        homeKeys: false
      },
      text: "ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ\nஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ\nஜனவரி புஷ்பம் சந்தோஷம் ஹிந்தி லக்ஷ்மி ஸ்ரீமான்\nஜப்பான் ஷேக்ஸ்பியர் ராஜா ரோஜா சமஸ்தானம் தேசம்\nஸ்ரீமான் மாணிக்கம் அவர்கள் கூட்டத்திற்கு தலைமை தாங்கினார்\nலக்ஷ்மி கல்யாண மண்டபத்தில் சிறப்பு விழா நடைபெற்றது"
    },
    {
      lesson: "பயிற்சி 6 — உயிர்மெய் எழுத்துகள் கூட்டுப் பயிற்சி",
      sub: "க கா கி கீ கு கூ கெ கே கை கொ கோ கௌ",
      keyHint: "h + [விகித விசைகள்]",
      fingerGuide: {
        left: ["இடக்கை: உயிரெழுத்து துணைக்குறிகள்"],
        right: ["வலக்கை: மெய்யெழுத்து விசை (க, ப, ம, த, ந)"],
        homeKeys: true
      },
      text: "க கா கி கீ கு கூ கெ கே கை கொ கோ கௌ\nத தா தி தீ து தூ தெ தே தை தொ தோ தௌ\nப பா பி பீ பு பூ பெ பே பை பொ போ பௌ\nம மா மி மீ மு மூ மெ மே மை மொ மோ மௌ\nந நா நி நீ நு நூ நெ நே நை நொ நோ நௌ\nவ வா வி வீ வு வூ வெ வே வை வொ வோ வௌ"
    },
    {
      lesson: "பயிற்சி 7 — இரட்டிப்பு மெய்கள் (Double Consonants)",
      sub: "க்க ட்ட த்த ப்ப ற்ற ன்ன ம்ம ல்ல",
      keyHint: "hh oo ll jj uu ii kk nn",
      fingerGuide: {
        left: ["இடக்கை நிலைப்பு"],
        right: ["வலக்கை இரட்டை தட்டல்"],
        homeKeys: true
      },
      text: "பக்கம் சட்டம் நத்தை கப்பல் கற்றல் அன்னை அம்மா பல்லி\nபக்கம் சட்டம் நத்தை கப்பல் கற்றல் அன்னை அம்மா பல்லி\nமக்கள் கூட்டம் வெற்றி நடை அண்ணன் தம்பி நல்ல சொல்\nபட்டம் பட்டம் வட்டம் வட்டம் சட்டம் சட்டம் அத்தை அத்தை\nபச்சை இலை செவ்வந்தி பூக்கள் முல்லை மலர் மல்லிகை வாசனை\nவெற்றி நிச்சயம் உழைப்பிற்கு தக்க ஊதியம் கிடைக்கும்"
    },
    {
      lesson: "பயிற்சி 8 — அரசு தேர்வு முக்கிய சொற்கள் (High-Frequency Terms)",
      sub: "அரசு அலுவலக முக்கிய கலைச்சொற்கள்",
      keyHint: "அலுவலக சொல்லகராதி",
      fingerGuide: {
        left: ["முழு விசைப்பலகை சமநிலை"],
        right: ["முழு விசைப்பலகை சமநிலை"],
        homeKeys: true
      },
      text: "அரசாங்கம் தலைமைச் செயலகம் மாவட்ட ஆட்சியர் அலுவலகம்\nதுணை ஆட்சியர் வருவாய்த்துறை ஆணை உத்தரவு கடிதம்\nபதிவுத்தபால் விரைவுத்தபால் ஒப்படைப்பு சான்றிதழ் மனு\nமனுதாரர் விண்ணப்பம் பரிசீலனை ஒப்புதல் தீர்மானம் நிதிநிலை\nஆணையர் சுற்றறிக்கை வரைவு நகல் குறிப்புரை அறிக்கை\nமேற்பார்வை ஆய்வு கூட்டம் நடவடிக்கை தகவல் அறியும் உரிமை"
    },
    {
      lesson: "பயிற்சி 9 — அரசு மாதிரி பத்தி (Junior Speed Model 1)",
      sub: "தொழில்நுட்ப கல்வி இயக்கக மாதிரி பத்தி",
      keyHint: "5 spaces for paragraph, steady rhythm",
      fingerGuide: {
        left: ["கண்கள் திரையில் மட்டும்"],
        right: ["கண்கள் திரையில் மட்டும்"],
        homeKeys: true
      },
      text: "     தமிழ்நாட்டில் தொழில்நுட்பக் கல்வி இயக்ககம் நடத்தும் தட்டச்சுத் தேர்வுகள் மாணவர்களின் எதிர்கால வேலைவாய்ப்பிற்கு மிகவும் பயனுள்ளதாக அமைகின்றன. அரசு அலுவலகங்களிலும் தனியார் நிறுவனங்களிலும் கணினி தட்டச்சு தெரிந்தவர்களுக்கு முன்னுரிமை அளிக்கப்படுகிறது.\n     முறையான விரல் பயிற்சி மற்றும் விசைப்பலகையை பார்க்காமல் தட்டச்சு செய்யும் பழக்கம் மட்டுமே ஒருவரை சிறந்த தட்டச்சராக மாற்றும். தினமும் ஒரு மணி நேரம் ஒழுங்காக பயிற்சி செய்தால் அரசு தேர்வில் முதல் வகுப்பில் தேர்ச்சி பெற முடியும்."
    },
    {
      lesson: "பயிற்சி 10 — அரசு மாதிரி பத்தி (Junior Speed Model 2)",
      sub: "கல்வி மற்றும் ஒழுக்கம்",
      keyHint: "DoTE Junior Examination Syllabus",
      fingerGuide: {
        left: ["சீரான வேகம்"],
        right: ["பிழையின்றி தட்டச்சு"],
        homeKeys: true
      },
      text: "     கல்வி ஒரு மனிதனை முழுமையாக்குகிறது. ஏட்டுச் சுரைக்காய் கறிக்கு உதவாது என்பது பழமொழி. நாம் கற்கும் கல்வியானது நமது நடைமுறை வாழ்க்கைக்கு பயன்பட வேண்டும். பிறருக்கு உதவும் நல்ல குணமும் நேர்மையும் கல்வியோடு இணைய வேண்டும்.\n     இளைஞர்கள் நேரத்தை வீணடிக்காமல் பயனுள்ள கலைகளை கற்றுக்கொள்ள வேண்டும். தட்டச்சு மற்றும் சுருக்கெழுத்துப் பயிற்சிகள் மாணவர்களின் கவனக் குவிப்பையும் நினைவாற்றலையும் பெருமளவில் வளர்க்கின்றன."
    },
    {
      lesson: "பயிற்சி 11 — சுற்றுச்சூழல் மற்றும் இயற்கை (Model 3)",
      sub: "சுற்றுச்சூழல் பாதுகாப்பு விழிப்புணர்வு",
      keyHint: "Exam paragraph standard",
      fingerGuide: {
        left: ["முழு விசைப்பலகை கட்டுப்பாடு"],
        right: ["முழு விசைப்பலகை கட்டுப்பாடு"],
        homeKeys: true
      },
      text: "     இயற்கை அன்னை மனித குலத்திற்கு அளித்த மாபெரும் கொடை மரங்களும் காடுகளுமாகும். மரங்கள் மழை பெய்வதற்கு காரணமாக அமைவதோடு நமக்கு தூய்மையான பிராண வாயுவையும் அளிக்கின்றன. காடுகளை அழிப்பதால் உலக வெப்பமயம் அதிகரிக்கிறது.\n     ஒவ்வொரு மாணவரும் தனது பிறந்தநாளில் ஒரு மரக்கன்றையாவது நட்டு வளர்க்க உறுதி ஏற்க வேண்டும். நெகிழிப் பைகளை தவிர்த்து துணிப்பைகளை பயன்படுத்துவது நமது கடமையாகும்."
    },
    {
      lesson: "பயிற்சி 12 — நூலகத்தின் பயன்கள் (Model 4)",
      sub: "அறிவு வளர்ச்சி மற்றும் நூலகம்",
      keyHint: "DoTE Model Paragraph",
      fingerGuide: {
        left: ["சீரான தட்டச்சு"],
        right: ["விரல் இயக்கம் சீரமை"],
        homeKeys: true
      },
      text: "     நூலகங்கள் அறிவின் களஞ்சியங்கள் ஆகும். சிறந்த புத்தகங்களை வாசிப்பது சிறந்த மனிதர்களுடன் உரையாடுவதற்கு சமமாகும். வாழ்க்கையில் வெற்றி பெற்ற தலைவர்கள் அனைவரும் புத்தக வாசிப்பை தங்களது தினசரி பழக்கமாக கொண்டிருந்தனர்.\n     நூலகத்திற்கு சென்று அமைதியாக அமர்ந்து படிக்கும் பழக்கத்தை சிறுவயது முதலே வளர்த்துக்கொள்ள வேண்டும். வாசிப்பு மனிதனை பண்படுத்துகிறது."
    },
    {
      lesson: "பயிற்சி 13 — கடித மாதிரி பத்தி (Government Letter Model)",
      sub: "அரசு கடித வரைவு நடைமுறை",
      keyHint: "Administrative drafting",
      fingerGuide: {
        left: ["எண்கள் மற்றும் நிறுத்தற்குறிகள்"],
        right: ["எண்கள் மற்றும் நிறுத்தற்குறிகள்"],
        homeKeys: false
      },
      text: "அனுப்புநர்:\nமாவட்ட ஆட்சித்தலைவர்,\nசென்னை மாவட்டம்,\nசென்னை - 600 001.\n\nபெறுநர்:\nஅனைத்து வட்டாட்சியர்கள்,\nசென்னை மாவட்டம்.\n\nஐயா,\n     பொருள்: நலத்திட்ட உதவிகள் வழங்குதல் - பயனாளிகள் பட்டியல் தயாரித்தல் - தொடர்பாக.\n     பார்வை: அரசு கடித எண் 1420 / நிதி / 2026, நாள் 12-10-2026.\n\n     பார்வையில் குறிப்பிட்டுள்ள அரசு கடிதத்தின்படி, தங்கள் வட்டத்தில் தகுதியுள்ள நபர்களை கண்டறிந்து உடனடியாக அறிக்கை சமர்ப்பிக்குமாறு கேட்டுக்கொள்ளப்படுகிறார்கள்."
    },
    {
      lesson: "பயிற்சி 14 — வணிக அறிக்கை மாதிரி (Senior Speed Model 1)",
      sub: "நிதி மற்றும் வணிக மேலாண்மை",
      keyHint: "Senior DoTE Examination Standard",
      fingerGuide: {
        left: ["முழுமையான தட்டச்சு வேகம்"],
        right: ["முழுமையான தட்டச்சு வேகம்"],
        homeKeys: true
      },
      text: "     தமிழ்நாடு தொழில் முதலீட்டுக் கழகம் சிறிய மற்றும் நடுத்தர தொழில் முனைவோருக்கு பல்வேறு சலுகை வட்டி திட்டங்களை செயல்படுத்தி வருகிறது. புதிய தொழில் தொடங்குவோருக்கு தேவையான இயந்திரங்கள் வாங்குவதற்கும் தொழிற்சாலை அமைப்பதற்கும் கடனுதவி வழங்கப்படுகிறது.\n     கிராமப்புற இளைஞர்கள் சுயதொழில் தொடங்குவதன் மூலம் வேலைவாய்ப்பற்ற திண்டாட்டத்தை போக்க முடியும். பெண்களின் பொருளாதார முன்னேற்றத்திற்காக மகளிர் சுயஉதவிக்குழுக்கள் மூலம் பல்வேறு நலத்திட்டங்கள் செயல்படுத்தப்படுகின்றன."
    },
    {
      lesson: "பயிற்சி 15 — வரலாற்று சிறப்பு (Senior Speed Model 2)",
      sub: "தமிழ்நாட்டின் பண்பாட்டு பெருமை",
      keyHint: "High mark speed drill",
      fingerGuide: {
        left: ["சீர்மிகு தட்டச்சு"],
        right: ["சீர்மிகு தட்டச்சு"],
        homeKeys: true
      },
      text: "     தஞ்சை பெரிய கோவில் சோழர்களின் கட்டிடக்கலைக்கு உலகப் புகழ்பெற்ற எடுத்துக்காட்டாகும். இராஜராஜ சோழனால் கட்டப்பட்ட இந்த ஆலயம் ஆயிரம் ஆண்டுகளைக் கடந்தும் கம்பீரமாக காட்சி தருகிறது. இதன் விமான கோபுர நிழல் கீழே விழுவதில்லை என்பது இதன் தனிச்சிறப்பாகும்.\n     தமிழர்களின் சிற்பக்கலை மற்றும் அறிவியல் நுட்பம் உலக வரலாற்று ஆய்வாளர்களை வியப்பில் ஆழ்த்துகிறது. நமது பாரம்பரிய நினைவுச் சின்னங்களை பாதுகாப்பது ஒவ்வொரு குடிமகனின் புனிதமான கடமையாகும்."
    },
    {
      lesson: "பயிற்சி 16 — முழு அரசு தேர்வு மாதிரி (DoTE Senior 10-Minute Passage)",
      sub: "அரசு இறுதித் தேர்வு மாதிரிப் பத்தி",
      keyHint: "Full 10-Minute Examination Test",
      fingerGuide: {
        left: ["தேர்வு அரங்கு நிலைப்பாடு"],
        right: ["தேர்வு அரங்கு நிலைப்பாடு"],
        homeKeys: true
      },
      text: "     அறிவியல் வளர்ச்சியினால் உலகம் இன்று ஒரு சிறிய கிராமமாக மாறிவிட்டது. கணினி மற்றும் இணையதளங்களின் வரவு மனிதனின் அன்றாட பணிகளை மிக எளிதாக்கியுள்ளது. கல்வியிலும் மருத்துவத்திலும் விவசாயத்திலும் நவீன தொழில்நுட்பங்கள் மாபெரும் புரட்சியை ஏற்படுத்தியுள்ளன.\n     எந்த ஒரு கருவியையும் நாம் பயன்படுத்தும் விதத்திலேயே அதன் நன்மை தீமைகள் அமைகின்றன. தொழில்நுட்பத்தை ஆக்கப்பூர்வமான வளர்ச்சிக்கு மட்டுமே பயன்படுத்த வேண்டும். இளம் தலைமுறையினர் தங்களது பொன்னான நேரத்தை பயனுள்ள துறைகளில் ஈடுபடுத்தி நாட்டிற்கு பெருமை சேர்க்க வேண்டும்."
    }
  ];

  // --- TAMIL TYPEWRITER MECHANICAL CURRICULUM (16 MULTI-LINE LESSONS) ---
  const TYPEWRITER_CURRICULUM = [
    {
      lesson: "பயிற்சி 1 — நடுவரிசை விசைகள் (Typewriter Home Row)",
      sub: "ய ள ன க | ப ா த ம ல (asdf gh jkl;)",
      keyHint: "asdf gh jkl;",
      fingerGuide: {
        left: ["சுண்டு→ய (a)", "மோதிர→ள (s)", "நடு→ன (d)", "ஆள்காட்டி→க (f)"],
        right: ["ஆள்காட்டி→ப (g), ா (h)", "நடு→த (j)", "மோதிர→ம (k)", "சுண்டு→ல (l), ் (;)"],
        homeKeys: true
      },
      text: "ய ள ன க ப ா த ம ல ய ள ன க ப ா த ம ல\nய ள ன க ப ா த ம ல ய ள ன க ப ா த ம ல\nகல்வி களம் கனம் பதம் படம் மடம் பலம் பணம்\nகபிலர் மலர் தமிழ் களம் பதம் மணம் தவம் பணம்\nகனக தாரை படம் மடம் களம் மணம் பலம் கபிலர்\nபதம் பணம் மடம் பலம் களம் கல்வி கனம் மலர்"
    },
    {
      lesson: "பயிற்சி 2 — புள்ளி விசை பயிற்சி (Virama Dead Key ';')",
      sub: "க் த் ம் ல் ண் ய் ர் வ் ழ் ள் (;f ;j ;k ;y ;z ;a ;u ;t ;H ;s)",
      keyHint: ";f ;j ;k ;y ;z ;a ;u ;t ;H ;s",
      fingerGuide: {
        left: ["சுண்டு→புள்ளி (;) முதன்மையாக தட்டவும்"],
        right: ["தொடர்ந்து தொடர்புடைய மெய்யெழுத்து விசை"],
        homeKeys: true
      },
      text: "க் த் ம் ல் ண் ய் ர் வ் ழ் ள் க் த் ம் ல் ண் ய் ர் வ் ழ் ள்\nக் த் ம் ல் ண் ய் ர் வ் ழ் ள் க் த் ம் ல் ண் ய் ர் வ் ழ் ள்\nஅன்பு கல்வி பக்தி வெற்றி கற்போம் சாதிப்போம்\nபண்பு உழைப்பு தட்டச்சு தேர்வு அரசு பயிற்சி தவம்\nஅறிவே ஆற்றல் உழைப்பே உயர்வு நேர்மையே அறம்\nவெற்றி நிச்சயம் விடாமுயற்சி வெற்றி தரும் பக்தி"
    },
    {
      lesson: "பயிற்சி 3 — முன் துணை எழுத்துகள் (Prefix Vowel Keys)",
      sub: "ஒற்றைக் கொம்பு (b), இரட்டைக் கொம்பு (n), இணைக்கொம்பு (i)",
      keyHint: "b, n, i விசைகள்",
      fingerGuide: {
        left: ["ஆள்காட்டி→b (ெ), n (ே)"],
        right: ["நடு→i (ை)"],
        homeKeys: false
      },
      text: "கெ தெ பெ மெ நெ செ வெ கெ தெ பெ மெ நெ செ வெ\nகே தே பே மே நே சே வே கே தே பே மே நே சே வே\nகை தை பை மை நை சை வை கை தை பை மை நை சை வை\nவெற்றி மெல்ல தேன் மேகம் கைமை செய்தி வேலை நெல்\nநேரத்தை முறையாக பயன்படுத்தினால் வெற்றி நிச்சயம்\nசெய்வன திருந்தச் செய் நேர்மை ஒன்றே உயர்ந்த கொள்கை"
    },
    {
      lesson: "பயிற்சி 4 — பின் துணை எழுத்துகள் (Suffix Vowel Modifiers)",
      sub: "துணைக்கால் (h), மேல்விலங்கு (p), கீழ்விலங்கு ([)",
      keyHint: "h, p, [ விசைகள்",
      fingerGuide: {
        left: ["கீழ்விலங்கு விசைகள்"],
        right: ["h→துணைக்கால், p→மேல்விலங்கு"],
        homeKeys: false
      },
      text: "கா கி கீ கு கூ தா தி தீ து தூ பா பி பீ பு பூ\nமா மி மீ மு மூ லா லி லீ லு லூ வா வி வீ வு வூ\nபாடம் காலம் தீபம் தூய்மை வீரம் புயல் பூக்கள்\nஅதிகாலை சூரியன் கிழக்கு திசையில் ஒளி வீசுகிறது\nகாக்கை குருவி எங்கள் ஜாதி நீள் கடலும் மலையும் எங்கள் கூட்டம்\nபாரதி கண்ட புதுமைப் பெண் தைரியமும் அறிவும் கொண்டவள்"
    },
    {
      lesson: "பயிற்சி 5 — ஷிப்ட் விசைகள் மற்றும் கிரந்தம் (Shift Keys & Grantha)",
      sub: "Shift விசைகள் மற்றும் ஜ, ஷ, ஸ, ஹ, க்ஷ, ஸ்ரீ",
      keyHint: "Shift modifier keys",
      fingerGuide: {
        left: ["இடது ஷிப்ட் விசை"],
        right: ["வலது ஷிப்ட் விசை"],
        homeKeys: false
      },
      text: "ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ ஜ ஷ ஸ ஹ க்ஷ ஸ்ரீ\nஜனவரி மாதம் குடியரசு தின விழா நாடெங்கும் கொண்டாடப்படுகிறது\nஸ்ரீமான் சுப்பிரமணிய பாரதியார் தேசிய கவிஞர் ஆவார்\nலக்ஷ்மி சுந்தரம் திருமண மண்டபத்தில் சிறப்பு கூட்டம்\nபுஷ்ப அஞ்சலி செலுத்தி மரியாதை செலுத்தப்பட்டது\nசந்தோஷமாக வாழ மன அமைதியும் நல்லெண்ணமும் அவசியம்"
    },
    {
      lesson: "பயிற்சி 6 — தட்டச்சு விசைப்பலகை சொல்லகராதி",
      sub: "இயந்திர தட்டச்சு தேர்வு கலைச்சொற்கள்",
      keyHint: "Typewriter high-frequency terms",
      fingerGuide: {
        left: ["சீரான விசை அழுத்தம்"],
        right: ["சீரான விசை அழுத்தம்"],
        homeKeys: true
      },
      text: "தட்டச்சுப் பொறி உருளை விசைப்பலகை மை நாடா விசைப்பலகை\nஅடைப்புக்குறி முற்றுப்புள்ளி கமா அரைப்புள்ளி மேற்கோள்குறி\nவரி இடைவெளி தட்டுநகர்த்தி விசை அழுத்தம் தாள் செருகல்\nஅரசு தொழில்நுட்பக் கல்வி இயக்ககம் சென்னை - 600 025\nவணிகவியல் நிறுவனங்கள் சங்கம் தமிழ்நாடு மாநிலக் கிளை\nதேர்வு மைய முதன்மை கண்காணிப்பாளர் அறை எண் இரண்டு"
    },
    {
      lesson: "பயிற்சி 7 — மாதிரிப் பத்தி 1 (Junior Typewriter Passage 1)",
      sub: "அடிப்படை தட்டச்சு மாதிரிப் பத்தி",
      keyHint: "5 spaces indent, double spacing",
      fingerGuide: {
        left: ["கண்கள் பிரதி தாளில் மட்டும்"],
        right: ["கண்கள் பிரதி தாளில் மட்டும்"],
        homeKeys: true
      },
      text: "     தட்டச்சு என்பது ஒரு அற்புதமான கைத்தொழில் ஆகும். இதனை முறைப்படி கற்றுக்கொண்டால் வாழ்க்கையில் எளிதாக வேலைவாய்ப்பு பெற முடியும். விரல்களை சரியான விசைகளில் வைத்து விசைப்பலகையை பார்க்காமல் தட்டச்சு செய்வதே தொடுமுறை தட்டச்சு எனப்படும்.\n     தொடுமுறை தட்டச்சில் பயிற்சி பெறுபவர்கள் தொடக்கத்தில் மெதுவாகவும் துல்லியமாகவும் தட்டச்சு செய்ய பழக வேண்டும். வேகம் தானாகவே வந்துவிடும்."
    },
    {
      lesson: "பயிற்சி 8 — மாதிரிப் பத்தி 2 (Junior Typewriter Passage 2)",
      sub: "நேர மேலாண்மை மற்றும் தொழில் முனைவு",
      keyHint: "Typewriter speed test",
      fingerGuide: {
        left: ["சீரான தட்டல் தாளம்"],
        right: ["சீரான தட்டல் தாளம்"],
        homeKeys: true
      },
      text: "     காலம் பொன் போன்றது என்று பெரியோர்கள் கூறுவர். கழிந்த காலமும் உடைந்த முட்டையும் மீண்டும் கிடைக்காது. எனவே நாம் ஒவ்வொரு நொடியையும் பயனுள்ள நற்காரியங்களுக்காக பயன்படுத்த வேண்டும். அன்றாட பணிகளை குறித்த நேரத்தில் செய்து முடிப்பது உயர்ந்த பண்பாகும்.\n     மாணவர்கள் சோம்பலை விடுத்து சுறுசுறுப்புடன் உழைக்க பழக வேண்டும். முயற்சி திருவினையாக்கும் என்பது வள்ளுவர் வாக்கு."
    },
    {
      lesson: "பயிற்சி 9 — மாதிரிப் பத்தி 3 (Senior Typewriter Passage 1)",
      sub: "கூட்டுறவு இயக்கமும் ஊரக வளர்ச்சியும்",
      keyHint: "Senior Typewriting Speed Standard",
      fingerGuide: {
        left: ["முழு விசை சமநிலை"],
        right: ["முழு விசை சமநிலை"],
        homeKeys: true
      },
      text: "     கூட்டுறவு இயக்கம் ஏழை எளிய மக்களின் பொருளாதார மேம்பாட்டிற்காக உருவாக்கப்பட்ட ஒரு உன்னதமான அமைப்பாகும். கிராமப்புற விவசாயிகளுக்கு நியாயமான வட்டியில் கடன் வழங்குவதிலும் உரம் மற்றும் விதை விநியோகத்திலும் கூட்டுறவு சங்கங்கள் பெரும்பங்கு வகிக்கின்றன.\n     ஒவ்வொருவரும் தங்களுக்குள் இருக்கும் ஒற்றுமையை பேணி வளர்த்து கூட்டுறவு கொள்கைகளை கடைபிடித்தால் கிராமங்கள் தன்னிறைவு பெறும்."
    },
    {
      lesson: "பயிற்சி 10 — மாதிரிப் பத்தி 4 (Senior Typewriter Passage 2)",
      sub: "அறிவியல் தொழில்நுட்பமும் மனித குலமும்",
      keyHint: "High accuracy multi-line drill",
      fingerGuide: {
        left: ["சீரான அழுத்தம்"],
        right: ["சீரான அழுத்தம்"],
        homeKeys: true
      },
      text: "     மனிதன் தோன்றிய காலம் முதல் இன்று வரை அவனது அறிவுத் தேடல் தொடர்ந்து கொண்டே இருக்கிறது. சக்கரம் கண்டுபிடித்த காலம் முதல் விண்வெளியில் செயற்கைக்கோள் ஏவும் இக்காலம் வரை மனிதனின் அறிவியல் சாதனைகள் வியக்கத்தக்கவை ஆகும்.\n     அறிவியல் கண்டுபிடிப்புகள் அனைத்தும் ஆக்கப்பூர்வமான பணிகளுக்கே பயன்பட வேண்டும். போர்க்கருவிகள் தயாரிப்பதை விடுத்து வறுமை ஒழிப்பு மற்றும் மருத்துவத்திற்கு முக்கியத்துவம் அளிக்க வேண்டும்."
    },
    {
      lesson: "பயிற்சி 11 — அரசாணை மாதிரி (Government Order Format)",
      sub: "அரசாணை வரைவு மற்றும் தட்டச்சு வடிவம்",
      keyHint: "Official Government Order",
      fingerGuide: {
        left: ["எண்கள் நிறுத்தற்குறிகள்"],
        right: ["எண்கள் நிறுத்தற்குறிகள்"],
        homeKeys: false
      },
      text: "தமிழ்நாடு அரசு\nசுருக்கம்\nபணியாளர் மற்றும் நிருவாகச் சீர்திருத்தத் துறை - தட்டச்சுப் பயிற்சி - அரசு ஊழியர்களுக்கு கட்டாய கணினி தட்டச்சுப் பயிற்சி வழங்குதல் - ஆணைகள் வெளியிடப்படுகின்றன.\n------------------------------------------------------------\nஅரசாணை (நிலை) எண் 85          நாள்: 15-11-2026\n------------------------------------------------------------\nஆணை:\n     அரசுத் துறைகளில் கணினியின் பயன்பாடு நாளுக்கு நாள் அதிகரித்து வருவதால், அனைத்து நிலை பணியாளர்களும் தட்டச்சு மற்றும் அலுவலக தானியங்கி பயிற்சி பெறுவது கட்டாயமாக்கப்படுகிறது."
    },
    {
      lesson: "பயிற்சி 12 — வணிகக் கடிதம் (Business Letter Format)",
      sub: "வணிக நிறுவனங்களுக்கிடையேயான கடிதம்",
      keyHint: "Official Business Letter",
      fingerGuide: {
        left: ["சீரான வரி இடைவெளி"],
        right: ["சீரான வரி இடைவெளி"],
        homeKeys: true
      },
      text: "பாரத் ஸ்டேஷனரி மார்ட்\nஎண் 24, என்.எஸ்.சி. போஸ் சாலை, சென்னை - 600 001.\nதொலைபேசி: 25341234               நாள்: 20-11-2026\n\nபெறுநர்:\nமுதல்வர் அவர்கள்,\nஸ்ரீ கலைமகள் தட்டச்சுப் பயிலகம்,\nகும்மிடிப்பூண்டி - 601 201.\n\nஅன்புடையீர்,\n     பொருள்: தட்டச்சு மை நாடாக்கள் மற்றும் தாள்கள் அனுப்புதல் - தொடர்பாக.\n     தாங்கள் 10-11-2026 நாளிட்ட கடிதத்தில் கோரியிருந்த பொருட்களுக்கான விலைப்பட்டியலை இத்துடன் இணைத்து அனுப்பியுள்ளோம். தங்கள் மேலான ஆதரவை வேண்டுகிறோம்."
    },
    {
      lesson: "பயிற்சி 13 — தட்டச்சு வேகப் பத்தி 1 (DoTE Exam Speed 1)",
      sub: "தேர்வு மாதிரி பத்தி - 100 சொற்கள்",
      keyHint: "Junior examination speed text",
      fingerGuide: {
        left: ["கண்கள் திரையில் படரட்டும்"],
        right: ["கண்கள் திரையில் படரட்டும்"],
        homeKeys: true
      },
      text: "     எண்ணும் எழுத்தும் கண்ணெனத் தகும் என்று ஔவையார் பாடியுள்ளார். எழுத்துக்களின் அமைப்பையும் சொற்களின் உருவாக்கத்தையும் சரியாக புரிந்துகொண்டு தட்டச்சு செய்யும் போது பிழைகள் முற்றிலும் குறைகின்றன. நாள்தோறும் அரை மணி நேரம் தொடர்ந்து தட்டச்சு பயிற்சி மேற்கொள்வது விரல்களுக்கு நற்பயிற்சி அளிக்கும்.\n     தட்டச்சு தேர்வில் வெற்றி பெறுவதற்கு வேகத்தை விட துல்லியமே மிக முக்கியம். நூறு மதிப்பெண்களுக்கு எண்பது மதிப்பெண்கள் துல்லியத்திற்கு வழங்கப்படுகின்றன."
    },
    {
      lesson: "பயிற்சி 14 — தட்டச்சு வேகப் பத்தி 2 (DoTE Exam Speed 2)",
      sub: "தேர்வு மாதிரி பத்தி - 120 சொற்கள்",
      keyHint: "Junior examination speed text",
      fingerGuide: {
        left: ["அமைதியான மனநிலை"],
        right: ["அமைதியான மனநிலை"],
        homeKeys: true
      },
      text: "     நமது நாட்டின் விடுதலைக்காக அரும்பாடுபட்ட தியாகிகளை நாம் என்றும் போற்ற வேண்டும். மகாத்மா காந்தி, பாரதியார், வ.உ.சிதம்பரனார், சுபாஷ் சந்திர போஸ் போன்ற தலைவர்களின் தியாகத்தால் நாம் இன்று சுதந்திரக் காற்றை சுவாசிக்கிறோம்.\n     சுதந்திரத்தை பேணிப் பாதுகாப்பது எதிர்கால தலைமுறையினரான மாணவர்களின் தலையாய கடமையாகும். நாட்டின் ஒருமைப்பாட்டிற்கும் வளர்ச்சிக்கும் அனைவரும் ஒன்றிணைந்து பாடுபட வேண்டும்."
    },
    {
      lesson: "பயிற்சி 15 — தேர்வு மாதிரி பத்தி 3 (Senior Exam Speed 1)",
      sub: "முதுநிலை தேர்வு மாதிரி பத்தி",
      keyHint: "Senior examination speed text",
      fingerGuide: {
        left: ["முழுமையான தட்டச்சு லயம்"],
        right: ["முழுமையான தட்டச்சு லயம்"],
        homeKeys: true
      },
      text: "     உலக அளவில் தொழில்துறை வேகமாக மாறிவரும் இன்றைய காலகட்டத்தில் இளைஞர்கள் நவீன தொழில்நுட்பத் திறன்களை வளர்த்துக் கொள்வது இன்றியமையாததாகிறது. வெறும் பட்டப்படிப்பு மட்டுமே வேலைவாய்ப்பை உறுதி செய்துவிடாது. நடைமுறை பயன்பாட்டுத் திறன்களே ஒருவரை வெற்றிப்பாதைக்கு அழைத்துச் செல்லும்.\n     கடின உழைப்பும் விடாமுயற்சியும் கொண்ட எவரும் எந்த ஒரு துறையிலும் உச்சத்தை எட்ட முடியும் என்பது உறுதி."
    },
    {
      lesson: "பயிற்சி 16 — தேர்வு மாதிரி பத்தி 4 (Senior Exam Speed 2)",
      sub: "முதுநிலை 10 நிமிட இறுதித் தேர்வுப் பத்தி",
      keyHint: "Final 10-Minute Examination Passage",
      fingerGuide: {
        left: ["தேர்வு அரங்கு முழுக் கட்டுப்பாடு"],
        right: ["தேர்வு அரங்கு முழுக் கட்டுப்பாடு"],
        homeKeys: true
      },
      text: "     கல்வி மற்றும் சுகாதாரத் துறைகளில் தமிழ்நாடு இந்தியாவிலேயே முன்னோடி மாநிலமாக திகழ்கிறது. அரசுப் பள்ளிகளில் படிக்கும் மாணவிகளுக்கு உயர்கல்வி உறுதித் திட்டம் செயல்படுத்தப்பட்டு வருகிறது. இதன் மூலம் கிராமப்புற மாணவிகளின் கல்லூரி சேர்க்கை விகிதம் பெருமளவில் உயர்ந்துள்ளது.\n     எதிர்கால இந்தியாவை வழிநடத்தும் ஆற்றல் இளைஞர்களிடம் மட்டுமே உள்ளது. மாணவர்கள் உயர்ந்த லட்சியங்களை வகுத்துக்கொண்டு அவற்றை அடைய அயராது உழைக்க வேண்டும்."
    }
  ];

  // --- ENGLISH QWERTY TOUCH TYPING CURRICULUM (16 MULTI-LINE LESSONS) ---
  const ENGLISH_CURRICULUM = [
    {
      lesson: "Lesson 1 — Home Keys (asdf ;lkj)",
      sub: "Anchor your fingers on the middle home row",
      keyHint: "asdf ;lkj",
      fingerGuide: {
        left: ["Little→a", "Ring→s", "Middle→d", "Index→f"],
        right: ["Index→j", "Middle→k", "Ring→l", "Little→;"],
        homeKeys: true
      },
      text: "asdf ;lkj asdf ;lkj asdf ;lkj asdf ;lkj\nasdf ;lkj asdf ;lkj asdf ;lkj asdf ;lkj\nasdf ;lkj asdf ;lkj asdf ;lkj asdf ;lkj\nasdf ;lkj asdf ;lkj asdf ;lkj asdf ;lkj\na add adds; ask lad all falls a add adds; ask lad all falls\na fall all ask lad dad adds falls sad lads ask dad"
    },
    {
      lesson: "Lesson 2 — G and H Index Finger Reach",
      sub: "Keys: a s d f g h j k l ;",
      keyHint: "asdfgf ;lkjhj",
      fingerGuide: {
        left: ["Little→a", "Ring→s", "Middle→d", "Index→f, g"],
        right: ["Index→h, j", "Middle→k", "Ring→l", "Little→;"],
        homeKeys: true
      },
      text: "asdfgf ;lkjhj asdfgf ;lkjhj asdfgf ;lkjhj asdfgf ;lkjhj\nasdfgf ;lkjhj asdfgf ;lkjhj asdfgf ;lkjhj asdfgf ;lkjhj\nask fad alas asks shad lads flags flask glass\njag fag fall hash glad sags flash halls salad\njak has jags gaff hall dash galls slash flasks\nlad sad lash adds gall gash shall lakhs dhalls"
    },
    {
      lesson: "Lesson 3 — Top Row Q W E R U I O P",
      sub: "Reach upward with precise muscle memory",
      keyHint: "awerqfa ;oiupj;",
      fingerGuide: {
        left: ["Little→q", "Ring→w", "Middle→e", "Index→r"],
        right: ["Index→u", "Middle→i", "Ring→o", "Little→p"],
        homeKeys: false
      },
      text: "awerqfa ;oiupj; awerqfa ;oiupj; awerqfa ;oiupj;\nawerqfa ;oiupj; awerqfa ;oiupj; awerqfa ;oiupj;\njailer larger fiddle roses peaks fish sails\norders follow poorer folder dead skill dislike\napples jokers squeal refresh legal agile should\npeople proper repair request supply report future"
    },
    {
      lesson: "Lesson 4 — T and Y Center Reach Keys",
      sub: "Extended index finger upward reach",
      keyHint: "gftfrf hjyjuj",
      fingerGuide: {
        left: ["Index→f, g, t, r", "Middle→d", "Ring→s", "Little→a"],
        right: ["Index→j, h, y, u", "Middle→k", "Ring→l", "Little→;"],
        homeKeys: false
      },
      text: "gftfrf hjyjuj gftfrf hjyjuj gftfrf hjyjuj gftfrf hjyjuj\ngftfrf hjyjuj gftfrf hjyjuj gftfrf hjyjuj gftfrf hjyjuj\nlawyers prepare further alert regular yesterday struggles\nfreehold shippers goodwill forward kettles laughter waggish\nyouthful territory addressed quarter hillside proposals supplies\nhealthy society liberty quality journey straight mystery"
    },
    {
      lesson: "Lesson 5 — Bottom Row Z X C V B N M",
      sub: "Downward reach for lower alphabet keys",
      keyHint: "azxcvf lkmnbj",
      fingerGuide: {
        left: ["Little→z", "Ring→x", "Middle→c", "Index→v, b"],
        right: ["Index→n, m", "Middle→,", "Ring→.", "Little→/"],
        homeKeys: false
      },
      text: "azxcvf lkmnbj azxcvf lkmnbj azxcvf lkmnbj azxcvf lkmnbj\nazxcvf lkmnbj azxcvf lkmnbj azxcvf lkmnbj azxcvf lkmnbj\njournal quantity fortress grizzled frequent sixfold spacing\nmovement student question materials service swivels gracious\nthousand cylinder except fixture western neither starting\nbusiness machine factory vibrant balance maximum victory"
    },
    {
      lesson: "Lesson 6 — Full Alphabet and Punctuation",
      sub: "Complete universal typing drills",
      keyHint: "a to z and punctuation",
      fingerGuide: {
        left: ["All left-hand fingers active"],
        right: ["All right-hand fingers active"],
        homeKeys: true
      },
      text: "abcdefghijklmnopqrstuvwxyz., ,.zyxwvutsrqponmlkjihgfedcba\nabcdefghijklmnopqrstuvwxyz., ,.zyxwvutsrqponmlkjihgfedcba\nchildren regarding attractive summer competition\nbehalf requisite punctuation accompany adopting\ncitizens government exceeding transmitted points\nfoundation thunder negligence exhibition communicate"
    },
    {
      lesson: "Lesson 7 — Shift Keys & Capital Letters",
      sub: "Left Shift for right keys; Right Shift for left keys",
      keyHint: "Opposite thumb/pinky coordination",
      fingerGuide: {
        left: ["Little→Left Shift"],
        right: ["Little→Right Shift"],
        homeKeys: false
      },
      text: "Budget Decrease Improvement Advantage Purchase\nEmployee Support Facilities Promotion Experience\nUmbrella Maximum Knowledge Limited Received\nDecember Shortage Remarkable Monday Honesty\nOperation Teacher Wonderful London Mountain\nTransport Foreign Hostel Imagine Friendly Victoria"
    },
    {
      lesson: "Lesson 8 — Punctuation and Government Exam Spacing Rules",
      sub: "5 spaces for paragraph, 2 spaces after full stop",
      keyHint: "DoTE Spacing Rules",
      fingerGuide: {
        left: ["Maintain proper posture"],
        right: ["Maintain proper posture"],
        homeKeys: true
      },
      text: "     He came to me yesterday.  He brought pens, pencils, books and bags with him.\n     Did you see him?  I did not.  What a wonderful student he was in the academy.\n     My favourite colour is blue.  I want to eat an apple every morning.\n     Typewriter was invented by Henry Mill.  Thank you for helping me.\n     Look at the pretty flowers!  The Sun is shining bright across the sky.\n     The train leaves in ten minutes.  Please join the official meeting."
    },
    {
      lesson: "Lesson 9 — High-Speed Word Syllables",
      sub: "Rhythm, cadence, and consistent touch typing",
      keyHint: "Keep eyes off the keyboard",
      fingerGuide: {
        left: ["Even keystroke impact"],
        right: ["Even keystroke impact"],
        homeKeys: true
      },
      text: "tion ment sion able ible ence ance ful less ness ship hood\naction payment tension capable sensible patience reliance helpful\ncareless goodness friendship childhood nation statement decision\nreliable possible presence guidance graceful fearless greatness\nmembership motherhood direction equipment permission variable flexible\nconvenience acceptance powerful tireless brightness championship"
    },
    {
      lesson: "Lesson 10 — Junior Speed Examination Model 1",
      sub: "Official DoTE Junior Speed Passage",
      keyHint: "5 spaces indent, smooth cadence",
      fingerGuide: {
        left: ["Steady touch typing"],
        right: ["Steady touch typing"],
        homeKeys: true
      },
      text: "     Education is the most powerful weapon which you can use to change the world.  It provides the foundation for personal growth and national development.  Through education, individuals acquire the knowledge and skills necessary to lead productive lives.\n     Schools and colleges play a vital role in shaping the character of young citizens.  Learning is a lifelong process that enriches the mind and broadens our understanding of human society."
    },
    {
      lesson: "Lesson 11 — Junior Speed Examination Model 2",
      sub: "Science and Technology in Everyday Life",
      keyHint: "DoTE Junior Examination Test",
      fingerGuide: {
        left: ["Continuous rhythm"],
        right: ["Continuous rhythm"],
        homeKeys: true
      },
      text: "     Science has revolutionized modern life in countless ways.  From communication to medicine, technological innovations have made our daily tasks easier and more efficient.  Computers and smartphones connect people across the globe in seconds.\n     However, we must use technology responsibly and balance digital devices with healthy outdoor activities.  Scientific discoveries should always serve the welfare of mankind."
    },
    {
      lesson: "Lesson 12 — Senior Speed Examination Model 1",
      sub: "Environmental Conservation and Forests",
      keyHint: "Senior Speed Standard (45 WPM)",
      fingerGuide: {
        left: ["Exam posture"],
        right: ["Exam posture"],
        homeKeys: true
      },
      text: "     Forests are the green lungs of our planet Earth.  They absorb carbon dioxide and release life-giving oxygen into the atmosphere.  In addition, forests prevent soil erosion, maintain the water cycle, and provide habitat for thousands of wildlife species.\n     Deforestation is a serious threat to biodiversity and leads to global climate changes.  Every citizen must take active steps to plant trees and conserve natural water bodies for future generations."
    },
    {
      lesson: "Lesson 13 — Senior Speed Examination Model 2",
      sub: "Agriculture and Rural Economy",
      keyHint: "Senior Speed Standard (45 WPM)",
      fingerGuide: {
        left: ["High accuracy cadence"],
        right: ["High accuracy cadence"],
        homeKeys: true
      },
      text: "     Agriculture is the backbone of the Indian economy, providing food for over one billion people and employment to millions of rural families.  Modern farming methods, including drip irrigation and organic fertilizers, are helping farmers increase crop yields.\n     Government schemes support farmers with crop insurance and fair prices in competitive markets.  A prosperous agricultural sector is essential for sustainable economic development."
    },
    {
      lesson: "Lesson 14 — Government Official Letter Draft",
      sub: "Official Government Communication Formatting",
      keyHint: "Administrative drafting standard",
      fingerGuide: {
        left: ["Punctuation precision"],
        right: ["Punctuation precision"],
        homeKeys: false
      },
      text: "From:\nThe Director of Technical Education,\nDirectorate of Technical Education,\nGuindy, Chennai - 600 025.\n\nTo:\nThe Principals of all Approved Commerce Institutes,\nTamil Nadu State.\n\nSir,\n     Sub: Commerce Examinations - November 2026 - Time Table - Regarding.\n     Ref: Government Order Ms. No. 120, Higher Education Department.\n\n     I am directed to inform you that the Government Technical Examinations in Typewriting and Shorthand will commence from the second week of November 2026."
    },
    {
      lesson: "Lesson 15 — Senior Speed Examination Model 3",
      sub: "Transport, Infrastructure and National Growth",
      keyHint: "High mark speed passage",
      fingerGuide: {
        left: ["Flawless rhythm"],
        right: ["Flawless rhythm"],
        homeKeys: true
      },
      text: "     An efficient transport network is essential for the rapid growth of trade and industry.  Good roads, modern railway systems, and well-equipped ports enable the smooth movement of goods and passengers across cities and rural districts.\n     Investments in green energy, such as electric vehicles and solar-powered railway stations, reduce environmental pollution.  Modern infrastructure bridges regional inequalities and promotes national unity."
    },
    {
      lesson: "Lesson 16 — DoTE Senior 10-Minute Examination Passage",
      sub: "Full 10-Minute Government Speed Test",
      keyHint: "DoTE Senior Examination Final Drill",
      fingerGuide: {
        left: ["Endurance and poise"],
        right: ["Endurance and poise"],
        homeKeys: true
      },
      text: "     Touch typing is a valuable skill that combines precision, rhythm, and speed.  When practiced diligently under expert guidance, touch typing becomes second nature, allowing students to transcribe complex documents with flawless accuracy.\n     At Sri Kalaimagal Typewriting Institute, we take pride in preparing students for excellence in all examinations conducted by the Directorate of Technical Education.  Consistent daily practice, good posture, and calm concentration will always lead to outstanding victory."
    }
  ];

  // Organize Curriculum Object
  const PRAC = {
    tamil99: TAMIL99_CURRICULUM,
    typewriter: TYPEWRITER_CURRICULUM,
    en: ENGLISH_CURRICULUM
  };
  PRAC.ta = TAMIL99_CURRICULUM; // Backwards-compatible alias

  // Helper to fetch current active lesson bank
  function getPracLessons() {
    const lang = (typeof pracLang !== 'undefined') ? pracLang : 'en';
    const layout = (typeof pracLayout !== 'undefined') ? pracLayout : 'tamil99';
    if (lang === 'ta') {
      if (layout === 'typewriter') {
        return PRAC.typewriter || PRAC.ta || [];
      }
      return PRAC.tamil99 || PRAC.ta || [];
    }
    return PRAC.en || [];
  }

  function setPracLayout(layout) {
    if (typeof pracLayout !== 'undefined') pracLayout = layout;
    const sel = document.getElementById('pracLayoutSel');
    if (sel) sel.value = layout;
    const tabSel = document.getElementById('tabPracTrackSel');
    if (tabSel && typeof pracLang !== 'undefined' && pracLang === 'ta') tabSel.value = layout;
    if (typeof pracComposer !== 'undefined') {
      pracComposer.raw = '';
      pracComposer.outLen = 0;
    }
    if (typeof pracIdx !== 'undefined') pracIdx = 0;
    if (typeof pracBaseLessonIdx !== 'undefined') pracBaseLessonIdx = 0;
    if (typeof pracCustomLesson !== 'undefined') pracCustomLesson = null;
    if (typeof pracMode !== 'undefined') pracMode = 'letters';
    if (typeof pracLessonCompleted !== 'undefined') pracLessonCompleted = false;

    if (typeof updatePracModeUI === 'function') updatePracModeUI();
    if (typeof buildPracLessonChips === 'function') buildPracLessonChips();
    if (typeof loadPracLesson === 'function') loadPracLesson();
  }

  // --- ADAPTIVE REINFORCEMENT DRILL GENERATOR ---
  function generateAdaptiveReinforcement(lang, layout, lessonIdx) {
    const lessons = getPracLessons();
    if (lessonIdx <= 0 || lessonIdx >= lessons.length) {
      const l = lessons[0] || { text: 'asdf ;lkj' };
      const words = l.text.replace(/[\n\r.,;—\-:]+/g, ' ').split(/\s+/).filter(w => w.length > 1);
      const set = Array.from(new Set(words));
      const lines = [];
      for (let i = 0; i < 5; i++) {
        lines.push(set.slice(i * 4, i * 4 + 4).join(' '));
      }
      return {
        lesson: '🧠 Reinforcement — Initial Mastery',
        sub: 'Targeted reinforcement drills for initial keys',
        text: lines.join('\n')
      };
    }

    const prevL = lessons[lessonIdx - 1];
    const currL = lessons[lessonIdx];

    const extractWords = text => (text || '').replace(/[\n\r.,;—\-:]+/g, ' ').split(/\s+/).filter(w => w.length > 1);
    const wordsPrev = extractWords(prevL.text);
    const wordsCurr = extractWords(currL.text);
    const combined = Array.from(new Set([...wordsCurr, ...wordsPrev]));

    const lines = [];
    for (let line = 0; line < 5; line++) {
      const lineWords = [];
      for (let w = 0; w < 6; w++) {
        lineWords.push(combined[(line * 6 + w) % combined.length]);
      }
      lines.push(lineWords.join(' '));
    }

    return {
      lesson: `🧠 Reinforcement (Lessons ${lessonIdx} & ${lessonIdx + 1})`,
      sub: `Adaptive drills combining vocabulary from Lessons ${lessonIdx} and ${lessonIdx + 1}`,
      text: lines.join('\n')
    };
  }

  // --- PRACTICE COMPLETION MODAL & METRICS ---
  let pracLessonCompleted = false;

  function showPracCompleteModal() {
    const modal = document.getElementById('modalPracComplete');
    if (!modal) return;
    const lesson = (typeof currentPracLesson === 'function') ? currentPracLesson() : {};
    const titleEl = document.getElementById('lblPracCompTitle');
    if (titleEl) {
      const idx = (typeof pracIdx !== 'undefined') ? pracIdx : 0;
      titleEl.textContent = `Lesson ${idx >= 0 ? idx + 1 : 'Reinforcement'} Completed! 🏆`;
    }
    const subEl = document.getElementById('lblPracCompSub');
    if (subEl) subEl.textContent = lesson.lesson || 'Great touch typing drill! Keep your muscle memory sharp.';
    const accEl = document.getElementById('lblPracCompAcc');
    const curAcc = document.getElementById('pracAcc');
    if (accEl && curAcc) accEl.textContent = curAcc.textContent;
    const corEl = document.getElementById('lblPracCompCorrect');
    const curCor = document.getElementById('pracCorrect');
    if (corEl && curCor) corEl.textContent = curCor.textContent;
    const misEl = document.getElementById('lblPracCompMistakes');
    const curMis = document.getElementById('pracMistakes');
    if (misEl && curMis) misEl.textContent = curMis.textContent;

    const btnNext = document.getElementById('btnPracNextLesson');
    const lessons = getPracLessons();
    const idx = (typeof pracIdx !== 'undefined') ? pracIdx : 0;
    if (btnNext) {
      btnNext.style.display = (idx + 1 < lessons.length && idx >= 0) ? 'block' : 'none';
    }

    modal.style.display = 'flex';
    modal.classList.add('show', 'open');
  }

  function closePracCompleteModal() {
    const modal = document.getElementById('modalPracComplete');
    if (modal) {
      modal.style.display = 'none';
      modal.classList.remove('show', 'open');
    }
  }

  function onPracNextLesson() {
    closePracCompleteModal();
    const lessons = getPracLessons();
    const idx = (typeof pracIdx !== 'undefined') ? pracIdx : 0;
    if (idx + 1 < lessons.length) {
      if (typeof selectPracLesson === 'function') selectPracLesson(idx + 1);
    }
  }

  function retryPracLesson() {
    closePracCompleteModal();
    pracLessonCompleted = false;
    if (typeof loadPracLesson === 'function') loadPracLesson();
  }

  function launchAdaptiveReinforcement() {
    closePracCompleteModal();
    const lang = (typeof pracLang !== 'undefined') ? pracLang : 'en';
    const layout = (typeof pracLayout !== 'undefined') ? pracLayout : 'tamil99';
    const idx = (typeof pracIdx !== 'undefined') ? pracIdx : 0;

    const reinf = generateAdaptiveReinforcement(lang, layout, idx);
    if (typeof pracCustomLesson !== 'undefined') pracCustomLesson = reinf;
    if (typeof pracIdx !== 'undefined') pracIdx = -1;
    pracLessonCompleted = false;

    if (typeof buildPracLessonChips === 'function') buildPracLessonChips();
    if (typeof loadPracLesson === 'function') loadPracLesson();
    if (typeof toast === 'function') toast('🧠 Adaptive Reinforcement Drill Loaded!');
  }

  // --- DEDICATED ROW PRACTICE DRILLS (HOME, TOP, BOTTOM, MIXED) ---
  const ROW_DRILLS = {
    en: {
      home: {
        rowKey: 'home',
        lesson: "Home Row — ASDF & JKL;",
        sub: "Anchor left fingers on ASDF and right fingers on JKL; (include G & H reach)",
        keyHint: "asdfgf ;lkjhj",
        fingerGuide: {
          left: ["Little→a", "Ring→s", "Middle→d", "Index→f, g"],
          right: ["Index→h, j", "Middle→k", "Ring→l", "Little→;"],
          homeKeys: true
        },
        text: "asdf ;lkj asdf ;lkj asdf ;lkj asdf ;lkj\nasdfgf ;lkjhj asdfgf ;lkjhj asdfgf ;lkjhj\na s d f g h j k l ; ; l k j h g f d s a\nask lad all fall sad dad adds; glass flask hall\njag flag glad hash dash gash shall slash salad\nsad lads ask dad; half glass falls as flags flash"
      },
      top: {
        rowKey: 'top',
        lesson: "Top Row — QWERTY & UIOP",
        sub: "Practice upward finger reach across Q W E R T Y U I O P",
        keyHint: "qwert yuiop",
        fingerGuide: {
          left: ["Little→q", "Ring→w", "Middle→e", "Index→r, t"],
          right: ["Index→y, u", "Middle→i", "Ring→o", "Little→p"],
          homeKeys: false
        },
        text: "qwert poiuy qwert poiuy qwert poiuy qwert poiuy\nq w e r t y u i o p p o i u y t r e w q\nawerqfa ;oiupj; gftfrf hjyjuj qwert yuiop\ntype quit pure pour poet rope write power trip\nquietly require priority report poetry quote tower\nproper route top priority write your true story"
      },
      bottom: {
        rowKey: 'bottom',
        lesson: "Bottom Row — ZXCV & BNM",
        sub: "Practice downward finger reach across Z X C V B N M , . /",
        keyHint: "zxcvb nm,./",
        fingerGuide: {
          left: ["Little→z", "Ring→x", "Middle→c", "Index→v, b"],
          right: ["Index→n, m", "Middle→,", "Ring→.", "Little→/"],
          homeKeys: false
        },
        text: "zxcvb mnbvc zxcvb mnbvc zxcvb mnbvc zxcvb mnbvc\nazxcvf lkmnbj azxcvf lkmnbj z x c v b n m\nzoom calm mix box van moon zone cave bench\ncomb move verb next climb exact vibrant exam\nzenith bronze, brave move. maximum victory box,\ncivic cabin mix, zero excuse, next climb, brave zone."
      },
      mixed: {
        rowKey: 'mixed',
        lesson: "Mixed Row — Full Keyboard Mastery",
        sub: "Combine Home, Top, and Bottom rows in seamless rhythm",
        keyHint: "abcdefghijklmnopqrstuvwxyz;.,",
        fingerGuide: {
          left: ["All Left Fingers: QAZ WSX EDC RFV TGB"],
          right: ["All Right Fingers: YHN UJM IK, OL. P;/"],
          homeKeys: true
        },
        text: "qaz wsx edc rfv tgb yhn ujm ik, ol. p;/\nasdf qwert zxcvb ;lkj yuiop mnbvc asdf qwert\nthe quick brown fox jumps over a lazy dog\npack my box with five dozen liquor jugs today\njumping wizards quickly vexed bright young scholars\ndaily touch typing practice builds speed and accuracy"
      }
    },
    tamil99: {
      home: {
        rowKey: 'home',
        lesson: "நடுவரிசைப் பயிற்சி (Tamil99 Home Row)",
        sub: "அ இ உ ் எ | க ப ம த ந (asdfg hjkl;)",
        keyHint: "asdfgf ;lkjhj",
        fingerGuide: {
          left: ["சுண்டு→அ (a)", "மோதிர→இ (s)", "நடு→உ (d)", "ஆள்காட்டி→் (f), எ (g)"],
          right: ["ஆள்காட்டி→க (h), ப (j)", "நடு→ம (k)", "மோதிர→த (l)", "சுண்டு→ந (;)"],
          homeKeys: true
        },
        text: "அ இ உ ் எ க ப ம த ந அ இ உ ் எ க ப ம த ந\nஅகம் இகம் உகம் பகம் மனம் தனம் நகம் பதம் மதம்\nஎது மெது பதம் களம் மடம் பலம் தவம் பணம் கனம்\nஅன்பு கல்வி பண்பு நன்றி பக்கம் சட்டம் தத்தம்\nமனம் தனம் பகம் உகம் இகம் அகம் கல்வி களம்"
      },
      top: {
        rowKey: 'top',
        lesson: "மேல்வரிசைப் பயிற்சி (Tamil99 Top Row)",
        sub: "ஆ ஈ ஊ ஐ ஏ | ள ற ன ட ண ச (qwerty uiop[)",
        keyHint: "qwerty uiop[",
        fingerGuide: {
          left: ["ஆ (q)", "ஈ (w)", "ஊ (e)", "ஐ (r)", "ஏ (t)"],
          right: ["ள (y)", "ற (u)", "ன (i)", "ட (o)", "ண (p)", "ச ([)"],
          homeKeys: false
        },
        text: "ஆ ஈ ஊ ஐ ஏ ள ற ன ட ண ச ஆ ஈ ஊ ஐ ஏ ள ற ன ட ண ச\nஆடல் ஈகை ஊக்கம் ஏணி ஐந்து சட்டம் படம் மணம்\nகண்ணன் கற்றல் பாடம் நாடக மன்றம் நன்றி\nஆசிரியர் பாடம் மாணவர் ஊக்கம் ஆக்கம் தரும்\nஎண்ணித் துணிக கருமம் கற்றல் நன்று சட்டம்"
      },
      bottom: {
        rowKey: 'bottom',
        lesson: "கீழ்வரிசைப் பயிற்சி (Tamil99 Bottom Row)",
        sub: "ஔ ஓ ஒ வ ங | ல ர ழ (zxcvb nm/)",
        keyHint: "zxcvb nm/",
        fingerGuide: {
          left: ["ஔ (z)", "ஓ (x)", "ஒ (c)", "வ (v)", "ங (b)"],
          right: ["ல (n)", "ர (m)", "ழ (/)"],
          homeKeys: false
        },
        text: "ஔ ஓ ஒ வ ங ல ர ழ ஔ ஓ ஒ வ ங ல ர ழ\nஒற்றுமை ஓட்டம் ஔவை வானம் தமிழ் வள்ளல் மலர்\nவெற்றி வேல் அழகு வழக்கம் உலகம் சிறப்பு நிலம்\nவாழ்க தமிழ் வளர்க பாரதம் ஒற்றுமை வலிமை\nஅழகு தமிழ் இனிமை வழக்கம் உலகம் மலர்"
      },
      mixed: {
        rowKey: 'mixed',
        lesson: "அனைத்து வரிசைப் பயிற்சி (Tamil99 Mixed Row)",
        sub: "நடு, மேல் மற்றும் கீழ்வரிசை கூட்டுப் பயிற்சி",
        keyHint: "Full Tamil99 Keyboard",
        fingerGuide: {
          left: ["அனைத்து இடக்கை விசைகள்"],
          right: ["அனைத்து வலக்கை விசைகள்"],
          homeKeys: true
        },
        text: "அ ஆ இ ஈ உ ஊ எ ஏ ஐ ஒ ஓ ஔ க ச ட த ப ற\nதமிழ்நாடு தொழில்நுட்பக் கல்வி இயக்ககம் தட்டச்சு\nஅறிவுடைமை ஆக்கம் தரும் ஒழுக்கம் உயர்வு தரும்\nமுயற்சி திருவினையாக்கும் கல்வி கரையில கற்பவர் நாள் சில\nதினமும் பயிற்சி செய்தால் அரசு தேர்வில் வெற்றி நிச்சயம்"
      }
    },
    typewriter: {
      home: {
        rowKey: 'home',
        lesson: "நடுவரிசைப் பயிற்சி (Typewriter Home Row)",
        sub: "ய ள ன க ப ா த ம ல ் (asdfg hjkl;)",
        keyHint: "asdfg hjkl;",
        fingerGuide: {
          left: ["ய (a)", "ள (s)", "ன (d)", "க (f)"],
          right: ["ப (g)", "ா (h)", "த (j)", "ம (k)", "ல (l)", "் (;)"],
          homeKeys: true
        },
        text: "ய ள ன க ப ா த ம ல ய ள ன க ப ா த ம ல\nகல்வி களம் கனம் பதம் படம் மடம் பலம் பணம்\nகபிலர் மலர் தமிழ் களம் பதம் மணம் தவம் பணம்\nபதம் பணம் மடம் பலம் களம் கல்வி கனம் மலர்\nபக்தி மணம் தவம் கபிலர் களம் மடம் படம்"
      },
      top: {
        rowKey: 'top',
        lesson: "மேல்வரிசைப் பயிற்சி (Typewriter Top Row)",
        sub: "ணு று நு சு கூ லு ரு ஐ டி (qwerty uiop)",
        keyHint: "qwerty uiop",
        fingerGuide: {
          left: ["q w e r t மேல் விசைகள்"],
          right: ["y u i o p மேல் விசைகள்"],
          homeKeys: false
        },
        text: "கூடு நூல் சுடர் வலம் நலம் ரதம் ஐந்து டமாரம்\nகாலை சூரியன் கிழக்கு திசையில் ஒளி வீசுகிறது\nபாடம் காலம் தீபம் தூய்மை வீரம் புயல் பூக்கள்\nகண்ணன் கற்றல் பாடம் மன்றம் நன்றி சட்டம்\nதுல்லியம் வேகம் பயிற்சி தினமும் தொடர வேண்டும்"
      },
      bottom: {
        rowKey: 'bottom',
        lesson: "கீழ்வரிசைப் பயிற்சி (Typewriter Bottom Row)",
        sub: "ண ஒ உ எ ெ ே அ இ (zxcvb nm,.)",
        keyHint: "zxcvb nm,.",
        fingerGuide: {
          left: ["z x c v b கீழ் விசைகள்"],
          right: ["n m , . / கீழ் விசைகள்"],
          homeKeys: false
        },
        text: "கெ தெ பெ மெ நெ செ வெ கே தே பே மே நே சே வே\nஅன்பு கல்வி ஒற்றுமை வெற்றி மேகம் செய்தி வேலை\nநல்ல சொல் வெல்லும் முயற்சி உயர்வு தரும்\nஅறிவே ஆற்றல் உழைப்பே உயர்வு நேர்மையே அறம்\nவிடாமுயற்சி வெற்றி தரும் தட்டச்சு கலை சிறந்தது"
      },
      mixed: {
        rowKey: 'mixed',
        lesson: "அனைத்து வரிசைப் பயிற்சி (Typewriter Mixed Row)",
        sub: "முழு இயந்திர தட்டச்சு விசைப்பலகை கூட்டுப் பயிற்சி",
        keyHint: "Full Typewriter Keyboard",
        fingerGuide: {
          left: ["அனைத்து இடக்கை விசைகள்"],
          right: ["அனைத்து வலக்கை விசைகள்"],
          homeKeys: true
        },
        text: "தமிழ் தட்டச்சு என்பது ஒரு அற்புதமான கைத்தொழில் ஆகும்.\nஅரசு தொழில்நுட்பக் கல்வி இயக்ககம் நடத்தும் தட்டச்சுத் தேர்வு\nவிரல்களை சரியான விசைகளில் வைத்து பார்க்காமல் தட்டச்சு செய்க\nவேகமும் துல்லியமும் இணைந்தால் தேர்வில் முதல் வகுப்பு உறுதி"
      }
    }
  };

  function getRowDrill(rowKey, lang, layout) {
    const l = lang || ((typeof pracLang !== 'undefined') ? pracLang : 'en');
    const ly = layout || ((typeof pracLayout !== 'undefined') ? pracLayout : 'tamil99');
    const bank = (l === 'ta') ? (ly === 'typewriter' ? ROW_DRILLS.typewriter : ROW_DRILLS.tamil99) : ROW_DRILLS.en;
    return bank[rowKey] || bank.home;
  }

  function checkPracCompletion(typedText) {
    if (pracLessonCompleted) return;
    const lesson = (typeof currentPracLesson === 'function') ? currentPracLesson() : null;
    if (!lesson || !lesson.text) return;
    if (typedText && typedText.length >= lesson.text.length) {
      pracLessonCompleted = true;
      setTimeout(showPracCompleteModal, 150);
    }
  }

  // Export functions to window
  window.PRAC = PRAC;
  window.ROW_DRILLS = ROW_DRILLS;
  window.getRowDrill = getRowDrill;
  window.getPracLessons = getPracLessons;
  window.setPracLayout = setPracLayout;
  window.generateAdaptiveReinforcement = generateAdaptiveReinforcement;
  window.showPracCompleteModal = showPracCompleteModal;
  window.closePracCompleteModal = closePracCompleteModal;
  window.onPracNextLesson = onPracNextLesson;
  window.retryPracLesson = retryPracLesson;
  window.launchAdaptiveReinforcement = launchAdaptiveReinforcement;
  window.checkPracCompletion = checkPracCompletion;

})(window);
