/**
 * =====================================================================
 * TYPING THALAIVA — GOVERNMENT JOBS & EXAMINATIONS UI CONTROLLER
 * =====================================================================
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory(require('./gov_jobs_data'));
  } else {
    root.GovJobsUI = factory(root.GovJobsData);
  }
})(typeof self !== 'undefined' ? self : this, function (GovJobsData) {
  'use strict';

  var currentCategory = 'all';
  var currentSearchQuery = '';

  function openScreenGovJobs() {
    if (typeof window.showScreen === 'function') {
      window.showScreen('screen-gov-jobs');
    }
    render();
  }

  function setCategory(cat) {
    currentCategory = cat;
    var btnAll = document.getElementById('govTabAll');
    var btnTN = document.getElementById('govTabTN');
    var btnCentral = document.getElementById('govTabCentral');

    if (btnAll) btnAll.classList.toggle('active', cat === 'all');
    if (btnTN) btnTN.classList.toggle('active', cat === 'tamilnadu');
    if (btnCentral) btnCentral.classList.toggle('active', cat === 'central');

    renderList();
  }

  function onSearchChange(val) {
    currentSearchQuery = val || '';
    renderList();
  }

  function setQuickFilter(tag) {
    var searchInput = document.getElementById('govSearchInput');
    if (tag === 'all') {
      currentSearchQuery = '';
      if (searchInput) searchInput.value = '';
    } else {
      currentSearchQuery = tag;
      if (searchInput) searchInput.value = tag;
    }
    renderList();
  }

  function render() {
    var container = document.getElementById('govJobsContainer');
    if (!container) return;

    // Render disclaimer banner if present
    var discEl = document.getElementById('govDisclaimerBanner');
    if (discEl && GovJobsData && GovJobsData.disclaimer) {
      discEl.innerHTML = 
        '<div style="display:flex;align-items:flex-start;gap:12px;">' +
          '<span style="font-size:22px;flex-shrink:0;">⚖️</span>' +
          '<div style="font-size:12px;line-height:1.55;color:var(--ink-soft);">' +
            '<b>Official Recruitment Clarification:</b> Typewriting certifications (DoTE Junior / Senior / Higher) ' +
            'fulfill the mandatory technical skill test criteria. Candidates must appear for and clear all official ' +
            'written exams, educational eligibility, and age criteria per public recruitment notifications.' +
          '</div>' +
        '</div>';
    }

    renderList();
  }

  function renderList() {
    var listEl = document.getElementById('govJobsList');
    if (!listEl) return;

    if (!GovJobsData || !GovJobsData.filterJobs) {
      listEl.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);">Loading opportunities…</div>';
      return;
    }

    var jobs = GovJobsData.filterJobs(currentCategory, currentSearchQuery);
    var countEl = document.getElementById('govJobsCountBadge');
    if (countEl) countEl.textContent = jobs.length + ' Opportunities';

    if (jobs.length === 0) {
      listEl.innerHTML = 
        '<div style="text-align:center;padding:36px 16px;background:var(--card-bg);border-radius:16px;border:1.5px dashed var(--card-border);">' +
          '<div style="font-size:36px;margin-bottom:8px;">🔍</div>' +
          '<div style="font-weight:800;font-size:15px;color:var(--ink);margin-bottom:4px;">No matching government exams found</div>' +
          '<div style="font-size:12.5px;color:var(--muted);margin-bottom:14px;">Try clearing your search term or selecting "All Opportunities".</div>' +
          '<button class="ghostbtn" style="padding:8px 16px;font-size:12px;" onclick="GovJobsUI.setQuickFilter(\'all\')">Clear Filters</button>' +
        '</div>';
      return;
    }

    var html = '';
    for (var i = 0; i < jobs.length; i++) {
      var j = jobs[i];
      var isTN = (j.category === 'tamilnadu');
      var badgeStyle = isTN 
        ? 'background:#eff6ff;color:#1d4ed8;border:1px solid #bfdbfe;' 
        : 'background:#f0fdf4;color:#15803d;border:1px solid #bbf7d0;';
      var badgeLabel = isTN ? '🏛️ Tamil Nadu State Govt' : '🇮🇳 Central Govt of India';

      html += 
        '<div class="gov-job-card glass-card" style="margin-bottom:14px;padding:16px;border-radius:16px;border:1.5px solid var(--card-border);background:var(--card-bg);">' +
          '<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px;flex-wrap:wrap;">' +
            '<span style="display:inline-block;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:700;' + badgeStyle + '">' + badgeLabel + '</span>' +
            '<span style="font-size:11px;font-weight:700;color:var(--muted);background:var(--subtle-bg, #f1f5f9);padding:3px 8px;border-radius:6px;">' + (j.payScale || '') + '</span>' +
          '</div>' +

          '<h3 style="margin:0 0 4px;font-size:16px;font-weight:800;color:var(--ink);line-height:1.3;">' + j.title + '</h3>' +
          '<div style="font-size:12px;color:var(--muted);margin-bottom:12px;font-weight:600;">' + j.department + ' — ' + j.posts + '</div>' +

          // Typing Requirements Box
          '<div style="background:linear-gradient(135deg,rgba(37,99,235,0.04),rgba(245,158,11,0.06));border:1px solid rgba(37,99,235,0.15);border-radius:12px;padding:10px 12px;margin-bottom:12px;">' +
            '<div style="font-size:11.5px;font-weight:800;color:var(--primary);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:6px;display:flex;align-items:center;gap:6px;">' +
              '<span>⌨️</span> Typewriting &amp; Technical Qualification' +
            '</div>';

      if (j.typewritingReq.tamil && j.typewritingReq.tamil !== 'N/A') {
        html += '<div style="font-size:12px;margin-bottom:4px;color:var(--ink);"><b>Tamil Typing:</b> ' + j.typewritingReq.tamil + '</div>';
      }
      if (j.typewritingReq.english) {
        html += '<div style="font-size:12px;margin-bottom:4px;color:var(--ink);"><b>English Typing:</b> ' + j.typewritingReq.english + '</div>';
      }
      if (j.typewritingReq.priority) {
        html += '<div style="font-size:11.5px;color:#d97706;font-weight:700;margin-top:4px;">⭐ ' + j.typewritingReq.priority + '</div>';
      }

      html += '</div>';

      // Eligibility & COA Box
      html += 
        '<div style="font-size:12px;color:var(--ink-soft);line-height:1.5;margin-bottom:12px;background:var(--subtle-bg, #f8fafc);border-radius:10px;padding:8px 10px;border:1px solid var(--card-border);">' +
          '<div style="margin-bottom:3px;"><b>🎓 Education:</b> ' + j.eligibility.education + '</div>' +
          '<div style="margin-bottom:3px;"><b>💻 COA / Computer:</b> ' + j.eligibility.coa + '</div>' +
          '<div><b>📅 Age Limit:</b> ' + j.eligibility.age + '</div>' +
        '</div>' +

        '<div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;border-top:1px solid var(--card-border);padding-top:10px;">' +
          '<div style="font-size:11px;color:var(--muted);max-width:65%;line-height:1.3;">' + (j.skillTestDetails || '') + '</div>' +
          '<button class="solidbtn" style="padding:6px 14px;font-size:12px;border-radius:8px;font-weight:700;white-space:nowrap;" onclick="window.open(\'' + j.officialPortal + '\', \'_system\')">Official Portal ↗</button>' +
        '</div>' +
      '</div>';
    }

    listEl.innerHTML = html;
  }

  return {
    openScreenGovJobs: openScreenGovJobs,
    setCategory: setCategory,
    onSearchChange: onSearchChange,
    setQuickFilter: setQuickFilter,
    render: render
  };
});
