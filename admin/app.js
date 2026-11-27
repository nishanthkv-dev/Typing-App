let currentSection = 'overview';
let cachedCourses = [];
let cachedCoupons = [];

function esc(val) {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return esc(iso);
  return d.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
}

function statusPill(status) {
  const map = {
    verified: ['Verified', 'pill-success'],
    free_enrollment: ['Free Coupon (₹0)', 'pill-purple'],
    payment_verified: ['Payment Verified', 'pill-success'],
    active: ['Active', 'pill-primary'],
    exam_date_pending: ['Exam Date Pending', 'pill-warning'],
    scheduled: ['Exam Scheduled', 'pill-primary'],
    completed: ['Completed', 'pill-success'],
    rebooking_eligible: ['Rebooking Eligible', 'pill-purple'],
    payment_pending: ['Payment Pending', 'pill-warning'],
    pending: ['Pending', 'pill-warning'],
    failed: ['Failed', 'pill-danger'],
    cancelled: ['Cancelled', 'pill-danger']
  };
  const [label, cls] = map[status] || [status || 'Unknown', 'pill-muted'];
  return `<span class="pill ${cls}">${esc(label)}</span>`;
}

function showGlobalAlert(msg, type = 'success') {
  const box = document.getElementById('globalAlert');
  box.textContent = msg;
  box.className = `alert show alert-${type === 'error' ? 'error' : 'success'}`;
  setTimeout(() => box.classList.remove('show'), 4500);
}

async function apiFetch(url, opts = {}) {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
    ...opts
  });
  if (res.status === 401) {
    window.location.replace('/admin/login');
    throw new Error('Unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

function toggleSidebar(open) {
  document.getElementById('sidebar').classList.toggle('open', open);
  document.getElementById('sidebarOverlay').classList.toggle('open', open);
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
}

function switchSection(section) {
  currentSection = section;
  document.querySelectorAll('.section-view').forEach(el => el.classList.remove('active'));
  document.getElementById(`sec-${section}`).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.section === section);
  });
  const titles = {
    overview: 'Overview',
    enrollments: 'Enrollments & Exam Scheduling',
    coupons: 'Coupons & Discounts',
    purchases: 'Purchases & Payment Verification',
    students: 'Registered Students',
    courses: 'Course Catalog',
    audit: 'Security & Audit Logs'
  };
  document.getElementById('pageTitle').textContent = titles[section] || 'Admin Dashboard';
  toggleSidebar(false);
  refreshCurrentSection();
}

function refreshCurrentSection() {
  if (currentSection === 'overview') return loadOverview();
  if (currentSection === 'enrollments') return loadEnrollments();
  if (currentSection === 'coupons') return loadCoupons();
  if (currentSection === 'purchases') return loadPurchases();
  if (currentSection === 'students') return loadStudents();
  if (currentSection === 'courses') return loadCourses();
  if (currentSection === 'audit') return loadAuditLogs();
}

async function loadOverview() {
  try {
    const data = await apiFetch('/api/admin/overview');
    const m = data.metrics;
    const cards = [
      ['Total Students', m.totalStudents, `Today: ${m.joinedToday || 0} · Week: ${m.joinedThisWeek || 0}`],
      ['Active Enrollments', m.activeEnrollments, `${m.expiredEnrollments || 0} expired · ${m.expiringSoonEnrollments || 0} expiring ≤7d`],
      ['Scheduled Exams', m.scheduledExams, `${m.upcomingCentralExams || 0} upcoming central exams`],
      ['Payments Summary', `₹${m.totalRevenueInr}`, `Today: ₹${m.todayRevenueInr || 0} · Avg: ₹${m.avgPaymentInr || 0}`],
      ['Payment States', `${m.verifiedPaymentsCount || 0} Paid`, `Pending: ${m.pendingPayments} · Failed: ${m.failedPayments || 0} · Cancelled: ${m.cancelledPayments || 0}`],
      ['Coupons & Discounts', m.activeCoupons, `${m.couponRedemptionsCount} redeemed · ₹${m.totalDiscountInr} off`]
    ];
    document.getElementById('overviewKpis').innerHTML = cards.map(([label, val, sub]) => `
      <div class="kpi-card">
        <div class="kpi-label">${esc(label)}</div>
        <div class="kpi-val">${esc(val)}</div>
        <div class="kpi-sub">${esc(sub)}</div>
      </div>
    `).join('');

    const tbody = document.getElementById('overviewRecentPurchases');
    if (!data.recentPurchases.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:var(--muted);text-align:center;">No purchases or enrollments recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.recentPurchases.map(p => `
      <tr>
        <td><b>${esc(p.userName)}</b><br><span style="color:var(--muted);font-size:11px;">${esc(p.userEmail)}</span></td>
        <td>${esc(p.courseTitle)}</td>
        <td>${p.couponCode ? `<span class="pill pill-purple">${esc(p.couponCode)}</span>` : '—'}</td>
        <td>₹${esc(p.originalAmount)}</td>
        <td><b>₹${esc(p.finalAmount)}</b></td>
        <td>${statusPill(p.paymentStatus)}</td>
        <td>${fmtDate(p.createdAt)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function ensureCoursesLoaded() {
  const data = await apiFetch('/api/admin/courses');
  cachedCourses = data.courses || [];
  const filterSel = document.getElementById('enrCourseFilter');
  if (filterSel) {
    const prev = filterSel.value;
    filterSel.innerHTML = '<option value="">All Courses</option>' + cachedCourses.map(c =>
      `<option value="${esc(c.id)}">${esc(c.title)}</option>`
    ).join('');
    filterSel.value = prev;
  }
  return cachedCourses;
}

async function loadEnrollments() {
  try {
    loadCentralExams();
    await ensureCoursesLoaded();
    const q = encodeURIComponent(document.getElementById('enrSearch').value.trim());
    const status = encodeURIComponent(document.getElementById('enrStatusFilter').value);
    const courseId = encodeURIComponent(document.getElementById('enrCourseFilter').value);
    const data = await apiFetch(`/api/admin/enrollments?q=${q}&status=${status}&courseId=${courseId}`);
    const tbody = document.getElementById('enrollmentsTableBody');

    if (!data.enrollments.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:var(--muted);text-align:center;">No matching enrollments found.</td></tr>';
      return;
    }

    tbody.innerHTML = data.enrollments.map(e => `
      <tr>
        <td><b>${esc(e.id)}</b><br><span class="pill pill-muted">Attempt #${esc(e.attemptNumber)}</span></td>
        <td><b>${esc(e.studentName)}</b><br><span style="color:var(--muted);font-size:11px;">${esc(e.studentEmail)}</span></td>
        <td>${esc(e.courseTitle)}</td>
        <td>
          ${statusPill(e.paymentStatus)}
          ${e.purchase ? `<div style="font-size:11px;color:var(--muted);margin-top:4px;">₹${esc(e.purchase.finalAmount)}${e.purchase.couponCode ? ` (${esc(e.purchase.couponCode)})` : ''}</div>` : ''}
        </td>
        <td>${statusPill(e.status)}</td>
        <td>
          <div style="font-weight:700;">${esc(e.examDisplayStatus)}</div>
          <div style="font-size:11px;color:var(--muted);">${esc(e.examCenter || '')}</div>
          ${e.scoreSummary ? `<div style="font-size:11px;color:var(--success);font-weight:700;">Result: ${esc(e.scoreSummary)}</div>` : ''}
        </td>
        <td>
          <div class="actions-cell">
            ${e.status === 'payment_pending' ? `<button class="btn btn-success btn-sm" onclick="activateEnrollment('${esc(e.id)}')">Verify &amp; Activate</button>` : ''}
            ${e.status !== 'cancelled' && e.status !== 'completed' && e.status !== 'rebooking_eligible'
              ? `<button class="btn btn-primary btn-sm" onclick="openScheduleModal('${esc(e.id)}','${esc(e.examDate || '')}','${esc(e.examSlot || '10:00 AM Batch')}','${esc(e.examCenter || '')}','${esc(e.examRemarks || '')}')">📅 ${e.examDate ? 'Reschedule' : 'Assign Exam'}</button>`
              : ''}
            ${e.status === 'scheduled' || e.status === 'exam_date_pending' || e.status === 'active'
              ? `<button class="btn btn-success btn-sm" onclick="openCompleteModal('${esc(e.id)}')">🏁 Complete</button>`
              : ''}
            ${e.status === 'completed' && !e.rebookingAllowed
              ? `<button class="btn btn-warning btn-sm" onclick="enableRebooking('${esc(e.id)}')">🔁 Enable Rebooking</button>`
              : ''}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function activateEnrollment(id) {
  try {
    await apiFetch(`/api/admin/enrollments/${encodeURIComponent(id)}/activate`, { method: 'POST', body: '{}' });
    showGlobalAlert('Enrollment verified and activated.');
    loadEnrollments();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

function openScheduleModal(id, examDate, slot, center, remarks) {
  document.getElementById('schEnrollmentId').value = id;
  document.getElementById('schExamDate').value = examDate || '';
  document.getElementById('schExamSlot').value = slot || '10:00 AM Batch';
  document.getElementById('schExamCenter').value = center || 'Sri Kalaimagal Typewriting Institute, Gummidipoondi';
  document.getElementById('schExamRemarks').value = remarks || '';
  document.getElementById('scheduleModal').classList.add('open');
}

async function submitScheduleForm(e) {
  e.preventDefault();
  const id = document.getElementById('schEnrollmentId').value;
  try {
    await apiFetch(`/api/admin/enrollments/${encodeURIComponent(id)}/schedule-exam`, {
      method: 'POST',
      body: JSON.stringify({
        examDate: document.getElementById('schExamDate').value,
        examSlot: document.getElementById('schExamSlot').value,
        examCenter: document.getElementById('schExamCenter').value,
        examRemarks: document.getElementById('schExamRemarks').value
      })
    });
    closeModal('scheduleModal');
    showGlobalAlert('Exam date saved & student notified.');
    loadEnrollments();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

function openCompleteModal(id) {
  document.getElementById('cmpEnrollmentId').value = id;
  document.getElementById('cmpScoreSummary').value = '';
  document.getElementById('cmpRemarks').value = '';
  document.getElementById('cmpEnableRebooking').checked = false;
  document.getElementById('completeModal').classList.add('open');
}

async function submitCompleteForm(e) {
  e.preventDefault();
  const id = document.getElementById('cmpEnrollmentId').value;
  try {
    await apiFetch(`/api/admin/enrollments/${encodeURIComponent(id)}/complete-exam`, {
      method: 'POST',
      body: JSON.stringify({
        scoreSummary: document.getElementById('cmpScoreSummary').value,
        examRemarks: document.getElementById('cmpRemarks').value,
        enableRebooking: document.getElementById('cmpEnableRebooking').checked
      })
    });
    closeModal('completeModal');
    showGlobalAlert('Examination marked completed.');
    loadEnrollments();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function enableRebooking(id) {
  try {
    await apiFetch(`/api/admin/enrollments/${encodeURIComponent(id)}/enable-rebooking`, { method: 'POST', body: '{}' });
    showGlobalAlert('Rebooking enabled for student.');
    loadEnrollments();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function loadCoupons() {
  try {
    await ensureCoursesLoaded();
    const data = await apiFetch('/api/admin/coupons');
    cachedCoupons = data.coupons || [];
    const tbody = document.getElementById('couponsTableBody');
    if (!cachedCoupons.length) {
      tbody.innerHTML = '<tr><td colspan="7" style="color:var(--muted);text-align:center;">No coupons created yet. Click "+ Create Coupon" to add one (e.g. WELCOME100, TYPE25).</td></tr>';
      return;
    }

    tbody.innerHTML = cachedCoupons.map(c => {
      const discLabel = c.discountType === 'free_100'
        ? '100% Free (₹0)'
        : c.discountType === 'percentage'
          ? `${c.discountValue}% Off`
          : `₹${c.discountValue} Flat Off`;
      const coursesLabel = (!c.applicableCourseIds || !c.applicableCourseIds.length)
        ? 'All Courses'
        : c.applicableCourseIds.map(id => {
          const found = cachedCourses.find(x => x.id === id);
          return found ? found.title : id;
        }).join(', ');
      const quotaLabel = c.maxRedemptions ? `${c.redemptionCount} / ${c.maxRedemptions}` : `${c.redemptionCount} / ∞`;
      return `
        <tr>
          <td><b>${esc(c.code)}</b><br><span style="font-size:11px;color:var(--muted);">${esc(c.description || '')}</span></td>
          <td><span class="pill ${c.discountType === 'free_100' ? 'pill-purple' : 'pill-primary'}">${esc(discLabel)}</span></td>
          <td style="font-size:11.5px;">${esc(coursesLabel)}</td>
          <td><b>${esc(quotaLabel)}</b><br><span style="font-size:11px;color:var(--muted);">Max ${esc(c.perStudentLimit)}/student</span></td>
          <td>${c.expiresAt ? fmtDate(c.expiresAt) : 'No expiry'}</td>
          <td>${c.active ? '<span class="pill pill-success">Active</span>' : '<span class="pill pill-muted">Inactive</span>'}</td>
          <td>
            <div class="actions-cell">
              <button class="btn btn-ghost btn-sm" onclick="viewCouponRedemptions('${esc(c.id)}','${esc(c.code)}')">👥 Redemptions</button>
              <button class="btn btn-ghost btn-sm" onclick="editCoupon('${esc(c.id)}')">✏️ Edit</button>
              <button class="btn ${c.active ? 'btn-warning' : 'btn-success'} btn-sm" onclick="toggleCoupon('${esc(c.id)}', ${!c.active})">
                ${c.active ? 'Disable' : 'Activate'}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function openCouponModal(coupon = null) {
  await ensureCoursesLoaded();
  document.getElementById('cpnEditId').value = coupon ? coupon.id : '';
  document.getElementById('couponModalTitle').textContent = coupon ? `Edit Coupon: ${coupon.code}` : 'Create Coupon';
  document.getElementById('cpnCode').value = coupon ? coupon.code : '';
  document.getElementById('cpnCode').disabled = Boolean(coupon);
  document.getElementById('cpnType').value = coupon ? coupon.discountType : 'free_100';
  document.getElementById('cpnType').disabled = Boolean(coupon);
  document.getElementById('cpnValue').value = coupon ? coupon.discountValue : 100;
  document.getElementById('cpnValue').disabled = Boolean(coupon);
  document.getElementById('cpnMinPurchase').value = coupon ? (coupon.minPurchaseAmount || 0) : 0;
  document.getElementById('cpnMaxRedemptions').value = coupon && coupon.maxRedemptions ? coupon.maxRedemptions : '';
  document.getElementById('cpnPerStudentLimit').value = coupon ? (coupon.perStudentLimit || 1) : 1;
  document.getElementById('cpnExpiresAt').value = coupon && coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : '';
  document.getElementById('cpnActive').value = coupon ? String(Boolean(coupon.active)) : 'true';
  document.getElementById('cpnDescription').value = coupon ? (coupon.description || '') : '';

  const selectedIds = coupon && Array.isArray(coupon.applicableCourseIds) ? coupon.applicableCourseIds : [];
  document.getElementById('cpnCourseCheckboxes').innerHTML = cachedCourses.map(c => `
    <label>
      <input type="checkbox" class="cpn-course-chk" value="${esc(c.id)}" ${selectedIds.includes(c.id) ? 'checked' : ''} />
      <span>${esc(c.title)} (₹${esc(c.priceInr)})</span>
    </label>
  `).join('');

  onCouponTypeChange();
  document.getElementById('couponModal').classList.add('open');
}

function onCouponTypeChange() {
  const type = document.getElementById('cpnType').value;
  const valInput = document.getElementById('cpnValue');
  if (type === 'free_100') {
    valInput.value = 100;
    valInput.readOnly = true;
  } else {
    valInput.readOnly = false;
  }
}

function editCoupon(id) {
  const found = cachedCoupons.find(c => c.id === id);
  if (found) openCouponModal(found);
}

async function submitCouponForm(e) {
  e.preventDefault();
  const editId = document.getElementById('cpnEditId').value;
  const applicableCourseIds = Array.from(document.querySelectorAll('.cpn-course-chk:checked')).map(el => el.value);
  const expiresRaw = document.getElementById('cpnExpiresAt').value;
  const payload = {
    description: document.getElementById('cpnDescription').value.trim(),
    applicableCourseIds,
    maxRedemptions: document.getElementById('cpnMaxRedemptions').value ? Number(document.getElementById('cpnMaxRedemptions').value) : null,
    perStudentLimit: Number(document.getElementById('cpnPerStudentLimit').value || 1),
    minPurchaseAmount: Number(document.getElementById('cpnMinPurchase').value || 0),
    expiresAt: expiresRaw ? new Date(`${expiresRaw}T23:59:59.999Z`).toISOString() : null,
    active: document.getElementById('cpnActive').value === 'true'
  };

  try {
    if (editId) {
      await apiFetch(`/api/admin/coupons/${encodeURIComponent(editId)}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      showGlobalAlert('Coupon updated.');
    } else {
      await apiFetch('/api/admin/coupons', {
        method: 'POST',
        body: JSON.stringify({
          ...payload,
          code: document.getElementById('cpnCode').value.trim().toUpperCase(),
          discountType: document.getElementById('cpnType').value,
          discountValue: Number(document.getElementById('cpnValue').value || 0)
        })
      });
      showGlobalAlert('Coupon created.');
    }
    closeModal('couponModal');
    loadCoupons();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function toggleCoupon(id, nextActive) {
  try {
    await apiFetch(`/api/admin/coupons/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ active: nextActive })
    });
    showGlobalAlert(`Coupon ${nextActive ? 'activated' : 'disabled'}.`);
    loadCoupons();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function viewCouponRedemptions(id, code) {
  try {
    const data = await apiFetch(`/api/admin/coupons/${encodeURIComponent(id)}/redemptions`);
    document.getElementById('redemptionsModalTitle').textContent = `Redemptions — ${code}`;
    const tbody = document.getElementById('redemptionsTableBody');
    if (!data.redemptions.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);">No students have redeemed this coupon yet.</td></tr>';
    } else {
      tbody.innerHTML = data.redemptions.map(r => `
        <tr>
          <td><b>${esc(r.studentName)}</b><br><span style="font-size:11px;color:var(--muted);">${esc(r.studentEmail)}</span></td>
          <td>${esc(r.courseTitle)}</td>
          <td>₹${esc(r.originalPrice)} − ₹${esc(r.discountAmount)} = <b>₹${esc(r.finalPrice)}</b></td>
          <td>${statusPill(r.status)}</td>
          <td>${fmtDate(r.redeemedAt)}</td>
        </tr>
      `).join('');
    }
    document.getElementById('redemptionsModal').classList.add('open');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function loadPurchases() {
  try {
    const q = encodeURIComponent(document.getElementById('purSearch').value.trim());
    const status = encodeURIComponent(document.getElementById('purStatusFilter').value);
    const data = await apiFetch(`/api/admin/purchases?q=${q}&status=${status}`);
    const tbody = document.getElementById('purchasesTableBody');
    if (!data.purchases.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="color:var(--muted);text-align:center;">No purchases found.</td></tr>';
      return;
    }
    tbody.innerHTML = data.purchases.map(p => `
      <tr>
        <td><b>${esc(p.id)}</b><br><span style="font-size:11px;color:var(--muted);">${esc(p.transactionRef || '')}</span></td>
        <td><b>${esc(p.studentName)}</b><br><span style="font-size:11px;color:var(--muted);">${esc(p.studentEmail)}</span></td>
        <td>${esc(p.courseTitle)} <span class="pill pill-muted">Attempt #${esc(p.attemptNumber || 1)}</span></td>
        <td>${p.couponCode ? `<span class="pill pill-purple">${esc(p.couponCode)}</span>` : '—'}</td>
        <td>₹${esc(p.originalAmount)} − ₹${esc(p.discountAmount)} = <b>₹${esc(p.finalAmount)}</b></td>
        <td>${esc(p.paymentMethod)}</td>
        <td>${statusPill(p.paymentStatus)}</td>
        <td>
          <div class="actions-cell">
            ${p.paymentStatus === 'pending' ? `
              <button class="btn btn-success btn-sm" onclick="verifyPurchase('${esc(p.id)}','verified')">✅ Verify Payment</button>
              <button class="btn btn-danger btn-sm" onclick="verifyPurchase('${esc(p.id)}','failed')">✕ Reject</button>
            ` : '—'}
          </div>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function verifyPurchase(id, status) {
  try {
    await apiFetch(`/api/admin/purchases/${encodeURIComponent(id)}/verify`, {
      method: 'POST',
      body: JSON.stringify({ status })
    });
    showGlobalAlert(`Purchase marked ${status}.`);
    loadPurchases();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function loadCentralExams() {
  try {
    const data = await apiFetch('/api/admin/exams');
    const tbody = document.getElementById('centralExamsTableBody');
    if (!tbody) return;
    const list = data.exams || [];
    if (!list.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="color:var(--muted);text-align:center;">No central exams configured yet.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map(ex => `
      <tr>
        <td><b>${esc(ex.name)}</b></td>
        <td>${esc(ex.date)}</td>
        <td>${esc(ex.registrationDeadline || '—')}</td>
        <td>${ex.archived ? '<span class="pill pill-muted">Archived</span>' : '<span class="pill pill-success">Active</span>'}</td>
        <td>${ex.archived ? '—' : `<button class="btn btn-ghost btn-sm" onclick="archiveCentralExam('${esc(ex.id)}')">🗄️ Archive</button>`}</td>
      </tr>
    `).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function createCentralExam() {
  const name = (document.getElementById('newExamName')?.value || '').trim();
  const date = (document.getElementById('newExamDate')?.value || '').trim();
  const registrationDeadline = (document.getElementById('newExamDeadline')?.value || '').trim();
  if (!name || !date) return showGlobalAlert('Exam name and date are required.', 'error');
  try {
    await apiFetch('/api/admin/exams', { method: 'POST', body: JSON.stringify({ name, date, registrationDeadline }) });
    document.getElementById('newExamName').value = '';
    loadCentralExams();
  } catch (err) { showGlobalAlert(err.message, 'error'); }
}

async function archiveCentralExam(id) {
  if (!confirm('Archive this exam?')) return;
  try {
    await apiFetch(`/api/admin/exams/${encodeURIComponent(id)}`, { method: 'DELETE' });
    loadCentralExams();
  } catch (err) { showGlobalAlert(err.message, 'error'); }
}

let cachedStudentsList = [];

async function loadStudents() {
  try {
    const q = encodeURIComponent(document.getElementById('stuSearch').value.trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    cachedStudentsList = Array.isArray(data.students) ? data.students : [];
    const tbody = document.getElementById('studentsTableBody');
    if (!cachedStudentsList.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="color:var(--muted);text-align:center;">No students registered yet.</td></tr>';
      return;
    }
    tbody.innerHTML = cachedStudentsList.map(s => `
      <tr>
        <td><b>${esc(s.name)}</b><br><span style="font-size:11px;color:var(--muted);">${esc(s.email)} ${s.phone ? '• ' + esc(s.phone) : ''}</span></td>
        <td>${esc(s.city || '—')}</td>
        <td>${(s.authProviders || []).map(pr => `<span class="pill pill-primary">${esc(pr)}</span>`).join(' ')}</td>
        <td>
          ${s.enrollments.length
            ? s.enrollments.map(e => `<div style="margin-bottom:4px;"><b>${esc(e.courseTitle)}</b> (#${esc(e.attemptNumber)}) ${statusPill(e.status)}</div>`).join('')
            : '<span style="color:var(--muted);">No enrollments yet</span>'}
        </td>
        <td>${s.couponsUsed.length ? s.couponsUsed.map(c => `<span class="pill pill-purple">${esc(c)}</span>`).join(' ') : '—'}</td>
        <td>${fmtDate(s.createdAt)}</td>
      </tr>
    `).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function loadCourses() {
  try {
    const courses = await ensureCoursesLoaded();
    const tbody = document.getElementById('coursesTableBody');
    tbody.innerHTML = courses.map(c => `
      <tr>
        <td><b>${esc(c.code)}</b></td>
        <td><b>${esc(c.title)}</b><br><span style="font-size:11px;color:var(--muted);">${esc(c.description)}</span></td>
        <td>${esc(c.language)} / ${esc(c.level)}</td>
        <td><b>₹${esc(c.priceInr)}</b></td>
        <td>${esc(c.durationDays)} days</td>
        <td>${c.active ? '<span class="pill pill-success">Active</span>' : '<span class="pill pill-muted">Inactive</span>'}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="editCourse('${esc(c.id)}')">✏️ Edit</button>
        </td>
      </tr>
    `).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

function openCourseModal(course = null) {
  document.getElementById('crsEditId').value = course ? course.id : '';
  document.getElementById('courseModalTitle').textContent = course ? `Edit Course: ${course.code}` : 'Add Course';
  document.getElementById('crsCode').value = course ? course.code : '';
  document.getElementById('crsCode').disabled = Boolean(course);
  document.getElementById('crsTitle').value = course ? course.title : '';
  document.getElementById('crsPrice').value = course ? course.priceInr : 199;
  document.getElementById('crsLang').value = course ? course.language : 'both';
  document.getElementById('crsLevel').value = course ? course.level : 'senior';
  document.getElementById('crsDuration').value = course ? course.durationDays : 365;
  document.getElementById('crsActive').value = course ? String(Boolean(course.active)) : 'true';
  document.getElementById('crsDesc').value = course ? course.description : '';
  document.getElementById('courseModal').classList.add('open');
}

function editCourse(id) {
  const c = cachedCourses.find(x => x.id === id);
  if (c) openCourseModal(c);
}

async function submitCourseForm(e) {
  e.preventDefault();
  const editId = document.getElementById('crsEditId').value;
  const payload = {
    code: document.getElementById('crsCode').value.trim(),
    title: document.getElementById('crsTitle').value.trim(),
    priceInr: Number(document.getElementById('crsPrice').value),
    language: document.getElementById('crsLang').value,
    level: document.getElementById('crsLevel').value,
    durationDays: Number(document.getElementById('crsDuration').value),
    active: document.getElementById('crsActive').value === 'true',
    description: document.getElementById('crsDesc').value.trim()
  };
  try {
    if (editId) {
      await apiFetch(`/api/admin/courses/${encodeURIComponent(editId)}`, { method: 'PUT', body: JSON.stringify(payload) });
      showGlobalAlert('Course updated.');
    } else {
      await apiFetch('/api/admin/courses', { method: 'POST', body: JSON.stringify(payload) });
      showGlobalAlert('Course created.');
    }
    closeModal('courseModal');
    loadCourses();
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function loadAuditLogs() {
  try {
    const data = await apiFetch('/api/admin/audit-logs?limit=100');
    const tbody = document.getElementById('auditTableBody');
    if (!data.logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);">No audit events recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = data.logs.map(l => `
      <tr>
        <td style="white-space:nowrap;">${fmtDate(l.createdAt)}</td>
        <td><b>${esc(l.actorEmail || l.actorRole)}</b><br><span style="font-size:11px;color:var(--muted);">${esc(l.actorRole)}</span></td>
        <td><span class="pill pill-primary">${esc(l.action)}</span></td>
        <td>${esc(l.entityType)}:${esc(l.entityId)}</td>
        <td style="font-size:11px;color:var(--muted);max-width:340px;word-break:break-word;">${esc(JSON.stringify(l.details || {}))}</td>
      </tr>
    `).join('');
  } catch (err) {
    showGlobalAlert(err.message, 'error');
  }
}

async function downloadStudentsPdf() {
  const btn = document.getElementById('btnDownloadStudentsPdf');
  const origText = btn ? btn.textContent : '';
  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Generating PDF...'; }
    const q = encodeURIComponent((document.getElementById('stuSearch')?.value || '').trim());
    const data = await apiFetch(`/api/admin/students?q=${q}`);
    const list = Array.isArray(data.students) ? data.students : cachedStudentsList;
    if (!list.length) {
      showGlobalAlert('No student records to export.', 'error');
      return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const margin = 28;
    let y = 36;

    doc.setFillColor(30, 58, 138);
    doc.rect(0, 0, pageW, 56, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.text('Typing Thalaiva — Registered Student Details', margin, 26);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.text(`Generated: ${new Date().toLocaleString()}   |   Total Students: ${list.length}`, margin, 42);

    y = 74;
    const cols = [
      { label: '#', w: 28 },
      { label: 'Name', w: 120 },
      { label: 'Email', w: 165 },
      { label: 'Phone', w: 85 },
      { label: 'City', w: 75 },
      { label: 'Providers', w: 70 },
      { label: 'Enrollments', w: 165 },
      { label: 'Joined', w: 76 }
    ];

    const drawHeader = () => {
      doc.setFillColor(239, 246, 255);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), 22, 'F');
      doc.setTextColor(30, 58, 138);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      let x = margin + 4;
      cols.forEach(c => { doc.text(c.label, x, y + 14); x += c.w; });
      y += 22;
    };

    drawHeader();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);

    list.forEach((s, idx) => {
      const enrStr = (s.enrollments && s.enrollments.length)
        ? s.enrollments.map(e => `${e.courseTitle || e.courseId} (${e.status})`).join(', ')
        : 'None';
      const vals = [
        String(idx + 1),
        String(s.name || '—'),
        String(s.email || '—'),
        String(s.phone || '—'),
        String(s.city || '—'),
        (s.authProviders || []).join(', ') || '—',
        enrStr,
        fmtDate(s.createdAt)
      ];
      const wrapped = vals.map((v, i) => doc.splitTextToSize(v, cols[i].w - 8));
      const maxLines = Math.max(...wrapped.map(w => w.length), 1);
      const rowH = maxLines * 11 + 8;

      if (y + rowH > pageH - 28) {
        doc.addPage();
        y = 32;
        drawHeader();
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.rect(margin, y, cols.reduce((a, c) => a + c.w, 0), rowH, 'S');

      doc.setTextColor(15, 23, 42);
      let x = margin + 4;
      wrapped.forEach((lines, i) => {
        doc.text(lines, x, y + 12);
        x += cols[i].w;
      });
      y += rowH;
    });

    const fname = `TypingThalaiva_Students_${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fname);
  } catch (err) {
    showGlobalAlert(err.message || 'Could not generate Students PDF.', 'error');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = origText; }
  }
}

async function logoutAdmin() {
  try {
    await fetch('/api/admin/auth/logout', { method: 'POST', credentials: 'include' });
  } catch (_) {}
  window.location.replace('/admin/login');
}

(async function initAdminDashboard() {
  try {
    const me = await apiFetch('/api/admin/auth/me');
    document.getElementById('adminProfileLabel').textContent = `${me.admin.name} (${me.admin.email})`;
    loadOverview();
  } catch (_) {}
})();
