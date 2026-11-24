/**
 * =====================================================================
 * TYPING THALAIVA — GOVERNMENT EXAMINATIONS & CAREER OPPORTUNITIES
 * =====================================================================
 * Comprehensive directory of Central Government and Tamil Nadu State
 * Government recruitment examinations and career opportunities eligible
 * for candidates possessing Typewriting and Shorthand qualifications.
 * =====================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.GovJobsData = factory();
  }
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var DISCLAIMER_TEXT = 
    '⚠️ Official Disclaimer: Completion of Typewriting qualifications (DoTE Junior / Senior / Higher) ' +
    'or achieving high typing speed satisfies the essential technical eligibility or skill test criteria ' +
    'required for these posts. It does not automatically confer or guarantee government employment. ' +
    'Candidates must appear for, qualify in, and satisfy all competitive written examinations, educational degrees, ' +
    'age limits, and reservation criteria as officially notified by the respective recruitment commissions.';

  var JOBS_LIST = [
    // -------------------------------------------------------------
    // TAMIL NADU STATE GOVERNMENT EXAMINATIONS
    // -------------------------------------------------------------
    {
      id: 'tn-tnpsc-group4-typist',
      category: 'tamilnadu',
      title: 'TNPSC Group 4 — Typist',
      department: 'Tamil Nadu Public Service Commission (TNPSC)',
      posts: 'Typist (TN Ministerial Service, Secretariat Service, Judicial Service)',
      payScale: 'Level 8: ₹19,500 – ₹62,000 + Allowances',
      typewritingReq: {
        tamil: 'DoTE Higher Grade (45 WPM) or Lower Grade (30 WPM)',
        english: 'DoTE Higher Grade (45 WPM) or Lower Grade (30 WPM)',
        priority: 'Top preference given to candidates who passed Higher in BOTH Tamil & English',
        minQualification: 'Passed Government Technical Examination (GTE) in Typewriting conducted by DoTE'
      },
      eligibility: {
        education: 'Minimum General Educational Qualification (SSLC / 10th Standard Pass) or Higher',
        coa: 'Mandatory: Certificate in Computer on Office Automation (COA) awarded by DoTE (must be acquired within probation if not held)',
        age: '18 to 32 years (Relaxations: BC/MBC up to 34, SC/ST up to 37 years, No upper age limit for degree holders in reserved categories)'
      },
      skillTestDetails: 'Selection is based on TNPSC Group 4 written examination rank followed by Certificate Verification confirming DoTE certificates.',
      officialPortal: 'https://www.tnpsc.gov.in',
      tags: ['tnpsc', 'group4', 'dote', 'tamil', 'english', 'coa']
    },
    {
      id: 'tn-tnpsc-group4-steno',
      category: 'tamilnadu',
      title: 'TNPSC Group 4 — Steno-Typist Grade III',
      department: 'Tamil Nadu Public Service Commission (TNPSC)',
      posts: 'Steno-Typist Grade III (Ministerial & Judicial Departments)',
      payScale: 'Level 10: ₹20,600 – ₹65,500 + Allowances',
      typewritingReq: {
        tamil: 'DoTE Typewriting Higher + DoTE Shorthand Higher / Lower',
        english: 'DoTE Typewriting Higher + DoTE Shorthand Higher / Lower',
        priority: 'Top priority: Higher in both Typewriting (Tamil & English) AND Higher in both Shorthand (Tamil & English)',
        minQualification: 'DoTE GTE Typewriting & Shorthand dual qualification'
      },
      eligibility: {
        education: 'SSLC / 10th Standard Pass (Eligible for higher secondary / college admission)',
        coa: 'Certificate course in "Computer on Office Automation" (COA) conducted by DoTE is mandatory',
        age: '18 to 32 years (Relaxations applicable per TN Govt reservation rules)'
      },
      skillTestDetails: 'Merit list generated from Group 4 objective exam. Dual GTE qualification in Typewriting and Shorthand is verified.',
      officialPortal: 'https://www.tnpsc.gov.in',
      tags: ['tnpsc', 'steno', 'shorthand', 'group4', 'dote']
    },
    {
      id: 'tn-mhc-typist-copyist',
      category: 'tamilnadu',
      title: 'Madras High Court & District Courts — Typist & Copyist',
      department: 'High Court of Judicature at Madras & TN Subordinate Judiciary',
      posts: 'Typist, Reader / Examiner, Copyist, Telephone Operator',
      payScale: 'Level 8: ₹19,500 – ₹62,000 / Level 5: ₹16,600 – ₹52,400',
      typewritingReq: {
        tamil: 'DoTE Senior Grade (45 WPM) or Junior Grade (30 WPM)',
        english: 'DoTE Senior Grade (45 WPM) or Junior Grade (30 WPM)',
        priority: 'Higher in Tamil & Higher in English gets maximum preference',
        minQualification: 'Government Technical Exam in Typewriting by Directorate of Technical Education, TN'
      },
      eligibility: {
        education: 'Bachelor’s Degree in Arts/Science/Commerce from a recognized University (or SSLC/HSC depending on specific cadre)',
        coa: 'Must possess Certificate in Computer on Office Automation (COA) awarded by Technical Education Department',
        age: '18 to 32 years (General), 34 (BC/MBC), 37 (SC/ST)'
      },
      skillTestDetails: 'Screening Test / Main Written Test followed by a Practical Skill Typing Test on Computer / Keyboard.',
      officialPortal: 'https://www.mhc.tn.gov.in',
      tags: ['mhc', 'court', 'typist', 'copyist', 'dote', 'judiciary']
    },
    {
      id: 'tn-forest-typist',
      category: 'tamilnadu',
      title: 'TNFUSRC — Forest Department Typist',
      department: 'Tamil Nadu Forest Uniformed Services Recruitment Committee',
      posts: 'Typist in the Tamil Nadu Forest Subordinate Service',
      payScale: 'Level 8: ₹19,500 – ₹62,000',
      typewritingReq: {
        tamil: 'Passed GTE Typewriting Higher in Tamil and English (or Higher in one, Lower in other)',
        english: 'Passed GTE Typewriting Higher/Lower in English',
        priority: 'Senior Grade in both languages preferred',
        minQualification: 'DoTE Typewriting Pass Certificate'
      },
      eligibility: {
        education: 'Passed Higher Secondary Course (12th Standard) or SSLC with recognized Diploma',
        coa: 'DoTE Certificate in Computer on Office Automation (COA)',
        age: '21 to 32 years for General category, relaxations as per TN state rules'
      },
      skillTestDetails: 'Online / OMR Written Exam followed by Certificate Verification of Typewriting & COA qualifications.',
      officialPortal: 'https://www.forests.tn.gov.in',
      tags: ['forest', 'tnfusrc', 'typist', 'dote']
    },
    {
      id: 'tn-police-ministerial-typist',
      category: 'tamilnadu',
      title: 'Tamil Nadu Police & Housing Corp — Ministerial Typist',
      department: 'Director General of Police, Tamil Nadu / TNPHC',
      posts: 'Ministerial Typist / Data Entry Operator / Camp Clerk',
      payScale: '₹19,500 – ₹62,000 + Special Allowances',
      typewritingReq: {
        tamil: 'Tamil Typewriting Senior / Junior (30–45 WPM)',
        english: 'English Typewriting Senior / Junior (30–45 WPM)',
        priority: 'Bilingual proficiency mandatory in office correspondence',
        minQualification: 'DoTE GTE Certificate in Typewriting'
      },
      eligibility: {
        education: 'Minimum 10th / 12th Standard Pass from a recognized State Board',
        coa: 'Basic computer operations certificate or DoTE COA certification',
        age: '18 to 30 years (with statutory category relaxations)'
      },
      skillTestDetails: 'Written exam followed by on-screen physical typing test and certificate validation.',
      officialPortal: 'https://eservices.tnpolice.gov.in',
      tags: ['police', 'ministerial', 'typist', 'dote']
    },
    {
      id: 'tn-coop-banks-assistant',
      category: 'tamilnadu',
      title: 'TN Cooperative Banks — Assistant & Typist',
      department: 'TN District Recruitment Bureau for Cooperatives (DRB)',
      posts: 'Assistant / Typist in Central Cooperative Banks & Urban Banks',
      payScale: '₹14,000 – ₹55,000 (Varies by district and apex bank scales)',
      typewritingReq: {
        tamil: 'Tamil Typewriting Junior / Senior',
        english: 'English Typewriting Junior / Senior',
        priority: 'Typing certificate holders eligible for specialized Typist vacancy quota',
        minQualification: 'Pass in Tamil Nadu Technical Board Typewriting Exam'
      },
      eligibility: {
        education: 'Any Degree (10+2+3 pattern) from a recognized University + Cooperative Training course',
        coa: 'Basic Computer Operations / COA',
        age: '18 to 32+ years (No upper age limit for BC/MBC/SC/ST)'
      },
      skillTestDetails: 'Written examination followed by interview and verification of Typewriting skills.',
      officialPortal: 'https://www.drbchn.in',
      tags: ['cooperative', 'bank', 'assistant', 'typist']
    },

    // -------------------------------------------------------------
    // CENTRAL GOVERNMENT EXAMINATIONS
    // -------------------------------------------------------------
    {
      id: 'cg-ssc-chsl-ldc',
      category: 'central',
      title: 'SSC CHSL — Lower Division Clerk & JSA',
      department: 'Staff Selection Commission (Government of India)',
      posts: 'Lower Division Clerk (LDC), Junior Secretariat Assistant (JSA)',
      payScale: 'Pay Level 2: ₹19,900 – ₹63,200',
      typewritingReq: {
        tamil: 'N/A (English or Hindi medium chosen at registration)',
        english: '35 words per minute (approx 10,500 key depressions per hour)',
        priority: 'Candidate selects English (35 WPM) or Hindi (30 WPM / 9,000 KDPH)',
        minQualification: 'Typing Speed Test conducted on Computer over a 10-minute continuous passage'
      },
      eligibility: {
        education: '12th Standard or equivalent examination from a recognized Board or University',
        coa: 'No separate COA required; computer proficiency tested during Tier-II DEST',
        age: '18 to 27 years (OBC +3 yrs, SC/ST +5 yrs, PwD up to +10 yrs)'
      },
      skillTestDetails: 'Tier-I Objective CBT → Tier-II Written + Mandatory Qualifying Typing Test (10 minutes on computer; accuracy threshold: 93%–95%).',
      officialPortal: 'https://ssc.gov.in',
      tags: ['ssc', 'chsl', 'ldc', 'jsa', 'central', 'english', 'hindi']
    },
    {
      id: 'cg-ssc-steno-cd',
      category: 'central',
      title: 'SSC Stenographer — Grade C & Grade D',
      department: 'Staff Selection Commission (Ministries & Attached Depts)',
      posts: 'Stenographer Grade ‘C’ (Group B Non-Gazetted) & Grade ‘D’ (Group C)',
      payScale: 'Grade C: Level 6/7 (₹35,400–₹1,42,400) | Grade D: Level 4 (₹25,500–₹81,100)',
      typewritingReq: {
        tamil: 'N/A',
        english: 'Transcription on Computer: 50 min (Grade D) / 40 min (Grade C)',
        priority: 'Shorthand dictation: 100 WPM (Grade C) / 80 WPM (Grade D) for 10 minutes',
        minQualification: 'English or Hindi Shorthand + Computer transcription'
      },
      eligibility: {
        education: '12th Standard or equivalent from a recognized Board',
        coa: 'Not mandatory; transcription conducted on computer terminal',
        age: 'Grade C: 18 to 30 years | Grade D: 18 to 27 years'
      },
      skillTestDetails: 'CBT Examination → Shorthand Dictation (10 mins) → Computer Transcription Test with strict error percentages.',
      officialPortal: 'https://ssc.gov.in',
      tags: ['ssc', 'steno', 'shorthand', 'central']
    },
    {
      id: 'cg-ssc-cgl-tax-assistant',
      category: 'central',
      title: 'SSC CGL — Tax Assistant (CBIC & CBDT)',
      department: 'Staff Selection Commission (Ministry of Finance)',
      posts: 'Tax Assistant in Central Board of Direct Taxes & Indirect Taxes',
      payScale: 'Pay Level 4: ₹25,500 – ₹81,100',
      typewritingReq: {
        tamil: 'N/A',
        english: 'Data Entry Speed Test (DEST): 8,000 Key Depressions Per Hour (approx 27 WPM)',
        priority: 'Mandatory qualifying test for Tax Assistant and Postal posts',
        minQualification: '15-minute Computer Data Entry Speed Test on 2,000 key depressions passage'
      },
      eligibility: {
        education: 'Bachelor’s Degree from any recognized University',
        coa: 'Computer Knowledge Module is part of CGL Tier-II exam',
        age: '18 to 27 years (plus statutory category relaxations)'
      },
      skillTestDetails: 'Tier-I Exam → Tier-II Multi-stage Exam + Qualifying DEST (15 minutes computer test with 5%–7% permissible error).',
      officialPortal: 'https://ssc.gov.in',
      tags: ['ssc', 'cgl', 'taxassistant', 'dest', 'central']
    },
    {
      id: 'cg-rrb-ntpc-typist',
      category: 'central',
      title: 'RRB NTPC — Junior & Senior Clerk cum Typist',
      department: 'Railway Recruitment Boards (Ministry of Railways)',
      posts: 'Junior Clerk cum Typist, Accounts Clerk cum Typist, Senior Clerk cum Typist',
      payScale: 'Level 2: ₹19,900 – ₹63,200 | Level 5: ₹29,200 – ₹92,300',
      typewritingReq: {
        tamil: 'N/A',
        english: '30 words per minute on Personal Computer without editing tools',
        priority: 'English (30 WPM) or Hindi (25 WPM) on computer keyboard',
        minQualification: 'Typing Skill Test (TST) conducted without spell check or backspace editing tricks'
      },
      eligibility: {
        education: '12th (+2 Stage) for Level 2; University Degree for Level 5',
        coa: 'Not mandatory; evaluated via official RRB Typing Skill Test software',
        age: '18 to 30 / 33 years (with category relaxations)'
      },
      skillTestDetails: 'CBT 1 → CBT 2 → Computer Based Typing Skill Test (10 minutes continuous typing, minimum 300 words typed with ≤5% mistakes).',
      officialPortal: 'https://www.rrbchennai.gov.in',
      tags: ['rrb', 'railways', 'ntpc', 'clerk', 'typist', 'central']
    },
    {
      id: 'cg-capf-head-constable',
      category: 'central',
      title: 'Central Armed Police — Head Constable Ministerial',
      department: 'CISF, BSF, CRPF, ITBP, SSB (Ministry of Home Affairs)',
      posts: 'Head Constable (Ministerial) / Assistant Sub-Inspector (Steno)',
      payScale: 'Pay Level 4: ₹25,500 – ₹81,100 + Central Paramilitary Allowances',
      typewritingReq: {
        tamil: 'N/A',
        english: '35 words per minute on Computer (corresponds to 10,500 KDPH)',
        priority: 'English 35 WPM or Hindi 30 WPM (9,000 KDPH)',
        minQualification: '10-minute continuous passage typing skill test on physical QWERTY keyboard'
      },
      eligibility: {
        education: 'Intermediate or Senior Secondary School Certificate (10+2) examination',
        coa: 'Physical Standard Test (PST) + Medical Examination mandatory',
        age: '18 to 25 years (relaxations for OBC up to 28, SC/ST up to 30)'
      },
      skillTestDetails: 'Physical Standards → Computer Based Written Test → Typing Speed Test (10 minutes, max 5% error limit) → Medical Test.',
      officialPortal: 'https://rectt.bsf.gov.in',
      tags: ['cisf', 'bsf', 'crpf', 'itbp', 'paramilitary', 'defence', 'typist']
    },
    {
      id: 'cg-epfo-ssa',
      category: 'central',
      title: 'EPFO — Social Security Assistant (SSA)',
      department: 'Employees’ Provident Fund Organisation (Ministry of Labour)',
      posts: 'Social Security Assistant (Group C Ministerial)',
      payScale: 'Pay Level 5: ₹29,200 – ₹92,300',
      typewritingReq: {
        tamil: 'N/A',
        english: '35 words per minute (10,500 KDPH on computer)',
        priority: 'English 35 WPM or Hindi 30 WPM (9,000 KDPH)',
        minQualification: 'Stage-II Computer Data Entry Skill Test'
      },
      eligibility: {
        education: 'Bachelor’s Degree from a recognized University',
        coa: 'Computer Data Entry skill test conducted by NTA',
        age: '18 to 27 years'
      },
      skillTestDetails: 'Phase-I CBT Written Exam → Phase-II Computer Typing Skill Test of 10 minutes duration.',
      officialPortal: 'https://www.epfindia.gov.in',
      tags: ['epfo', 'ssa', 'central', 'nta', 'typist']
    },
    {
      id: 'cg-supreme-court-jca',
      category: 'central',
      title: 'Supreme Court & High Courts — Court Typist & JCA',
      department: 'Supreme Court of India / High Court Benches',
      posts: 'Junior Court Assistant (JCA), Court Typist, Personal Assistant',
      payScale: 'Pay Level 6: ₹35,400 – ₹1,12,400 + HRA & Special Judicial Allowances',
      typewritingReq: {
        tamil: 'N/A (English is mandatory in Higher Courts)',
        english: 'English Typing Speed of 35 words per minute on Computer',
        priority: 'High accuracy required (permissible mistake limit within 3%)',
        minQualification: '10-minute Computer Typing Test conducted in English'
      },
      eligibility: {
        education: 'Bachelor’s Degree of a recognized University + Knowledge of Computer Operations',
        coa: 'Working knowledge of computer applications tested in objective/practical exam',
        age: '18 to 30 years'
      },
      skillTestDetails: 'Written Objective Exam → Computer Typing Test (35 WPM with ≤3% mistakes) → Descriptive English Test → Interview.',
      officialPortal: 'https://main.sci.gov.in',
      tags: ['supremecourt', 'court', 'jca', 'highcourt', 'typist', 'law']
    }
  ];

  function getAllJobs() {
    return JOBS_LIST.slice();
  }

  function getJobsByCategory(category) {
    if (!category || category === 'all') return getAllJobs();
    return JOBS_LIST.filter(function (job) {
      return job.category === category;
    });
  }

  function filterJobs(category, searchQuery) {
    var list = getJobsByCategory(category);
    if (!searchQuery || !searchQuery.trim()) return list;

    var query = searchQuery.trim().toLowerCase();
    return list.filter(function (job) {
      return (
        job.title.toLowerCase().indexOf(query) !== -1 ||
        job.department.toLowerCase().indexOf(query) !== -1 ||
        job.posts.toLowerCase().indexOf(query) !== -1 ||
        (job.typewritingReq.tamil && job.typewritingReq.tamil.toLowerCase().indexOf(query) !== -1) ||
        (job.typewritingReq.english && job.typewritingReq.english.toLowerCase().indexOf(query) !== -1) ||
        job.eligibility.education.toLowerCase().indexOf(query) !== -1 ||
        job.tags.some(function (t) { return t.indexOf(query) !== -1; })
      );
    });
  }

  return {
    disclaimer: DISCLAIMER_TEXT,
    jobs: JOBS_LIST,
    getAllJobs: getAllJobs,
    getJobsByCategory: getJobsByCategory,
    filterJobs: filterJobs
  };
});
