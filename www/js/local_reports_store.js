/**
 * TYPING THALAIVA — LOCAL-ONLY REPORTS & BACKUP STORE
 * Stores typing test reports strictly on-device (never uploaded to cloud).
 * Supports JSON/CSV export, Capacitor Documents/Typing Reports folder sync,
 * and JSON restore after app reinstall.
 */
(function (root) {
  'use strict';

  const FOLDER_NAME = 'Typing Reports';
  const STORAGE_KEY = 'recent-results';
  const SAF_FLAG_KEY = 'tt_reports_folder_linked';

  async function readAll() {
    try {
      if (root.storage && typeof root.storage.get === 'function') {
        const res = await root.storage.get(STORAGE_KEY, false);
        const raw = res && res.value !== undefined ? res.value : res;
        const parsed = raw ? (typeof raw === 'string' ? JSON.parse(raw) : raw) : [];
        return Array.isArray(parsed) ? parsed : [];
      }
      const ls = localStorage.getItem(STORAGE_KEY);
      const arr = ls ? JSON.parse(ls) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  async function writeAll(list) {
    const safe = Array.isArray(list) ? list.slice(0, 200) : [];
    const json = JSON.stringify(safe);
    try {
      if (root.storage && typeof root.storage.set === 'function') {
        await root.storage.set(STORAGE_KEY, json, false);
      } else {
        localStorage.setItem(STORAGE_KEY, json);
      }
    } catch (e) {}
    return safe;
  }

  async function writeSingleReportToFolder(entry) {
    try {
      if (!entry || !root.Capacitor || !root.Capacitor.isNativePlatform || !root.Capacitor.isNativePlatform()) {
        return false;
      }
      const Filesystem = root.Capacitor.Plugins && root.Capacitor.Plugins.Filesystem;
      if (!Filesystem) return false;
      const ts = entry.timestamp || Date.now();
      const fileName = `${FOLDER_NAME}/report_${ts}.json`;
      await Filesystem.writeFile({
        path: fileName,
        data: JSON.stringify(entry, null, 2),
        directory: 'DOCUMENTS',
        encoding: 'utf8',
        recursive: true
      });
      try { localStorage.setItem(SAF_FLAG_KEY, '1'); } catch (_) {}
      return true;
    } catch (e) {
      return false;
    }
  }

  async function exportAllJSON() {
    const list = await readAll();
    if (!list.length) {
      if (typeof root.toast === 'function') root.toast('No local reports to export yet');
      return false;
    }
    const payload = JSON.stringify({
      app: 'Typing Thalaiva',
      exportedAt: new Date().toISOString(),
      reports: list
    }, null, 2);
    const fname = `TypingThalaiva_Reports_${new Date().toISOString().slice(0, 10)}.json`;

    if (root.Capacitor && root.Capacitor.isNativePlatform && root.Capacitor.isNativePlatform()) {
      try {
        const { Filesystem, Share } = root.Capacitor.Plugins;
        await Filesystem.writeFile({ path: `${FOLDER_NAME}/${fname}`, data: payload, directory: 'DOCUMENTS', encoding: 'utf8', recursive: true });
        const { uri } = await Filesystem.getUri({ path: `${FOLDER_NAME}/${fname}`, directory: 'DOCUMENTS' });
        if (Share) await Share.share({ title: 'Typing Reports Backup', url: uri, dialogTitle: 'Save or Share Reports JSON' });
        if (typeof root.toast === 'function') root.toast('✅ Saved to Documents/Typing Reports');
        return true;
      } catch (e) {}
    }

    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (typeof root.toast === 'function') root.toast('📥 Reports JSON exported');
    return true;
  }

  async function exportAllCSV() {
    const list = await readAll();
    if (!list.length) {
      if (typeof root.toast === 'function') root.toast('No local reports to export yet');
      return false;
    }
    const escCsv = (v) => '"' + String(v === undefined || v === null ? '' : v).replace(/"/g, '""') + '"';
    const header = ['Date', 'Language', 'Layout', 'Passage', 'Net WPM', 'Gross WPM', 'Accuracy %', 'Mistakes', 'Marks', 'Passed', 'Elapsed Secs'];
    const rows = list.map(r => [
      r.date || r.isoDate || '',
      r.lang === 'ta' ? 'Tamil' : 'English',
      r.layout || 'qwerty',
      r.passage || '',
      r.netWpm || 0,
      r.grossWpm || 0,
      r.accuracy || 0,
      r.errors || 0,
      r.marks !== null && r.marks !== undefined ? r.marks : '',
      r.passed ? 'PASS' : 'FAIL',
      r.elapsed || 0
    ].map(escCsv).join(','));
    const csv = [header.join(','), ...rows].join('\n');
    const fname = `TypingThalaiva_Reports_${new Date().toISOString().slice(0, 10)}.csv`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fname;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    if (typeof root.toast === 'function') root.toast('📥 Reports CSV exported');
    return true;
  }

  async function restoreFromFiles(fileList) {
    if (!fileList || !fileList.length) return 0;
    const current = await readAll();
    const seen = new Set(current.map(r => `${r.timestamp || ''}|${r.passage || ''}`));
    let added = 0;

    for (const file of Array.from(fileList)) {
      if (!file || !file.name || !file.name.toLowerCase().endsWith('.json')) continue;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const items = Array.isArray(parsed)
          ? parsed
          : (Array.isArray(parsed.reports) ? parsed.reports : (parsed && parsed.passage !== undefined ? [parsed] : []));
        for (const item of items) {
          if (!item || typeof item !== 'object') continue;
          const key = `${item.timestamp || ''}|${item.passage || ''}`;
          if (!seen.has(key)) {
            seen.add(key);
            current.push(item);
            added++;
          }
        }
      } catch (e) {}
    }

    if (added > 0) {
      current.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
      await writeAll(current);
      if (typeof root.loadRecentResults === 'function') await root.loadRecentResults();
    }
    if (typeof root.toast === 'function') {
      root.toast(added > 0 ? `✅ Restored ${added} report(s) locally` : 'ℹ️ No new reports found in selected file(s)');
    }
    return added;
  }

  root.LocalReportsStore = {
    readAll,
    writeAll,
    writeSingleReportToFolder,
    exportAllJSON,
    exportAllCSV,
    restoreFromFiles
  };
})(typeof window !== 'undefined' ? window : globalThis);
