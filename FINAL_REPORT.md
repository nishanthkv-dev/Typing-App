# Typing Thalaiva — Final Engineering, Security & QA Report

**Date:** 2026-11-26  
**Project:** Typing Thalaiva (Capacitor 6 Android + Web + Node.js Backend + Admin Dashboard)

---

## A. Root Causes Found
| Issue | Root Cause | Files / Lines |
|---|---|---|
| Reverse Typing leaked drill stats, exercise title, progress %, and subtitle | `.drill-stats-row` had inline `display:flex !important` overriding CSS `display:none !important`, and `#pracLessonTitle`, `#pracProgressPct`, `#pracSub` were not hidden in `.reverse-minimal-mode` | `www/index.html` (`#screen-practice`, `loadPracLesson`) |
| Privacy defect: typing reports uploaded to cloud | `StudentPortal.syncProgressResult()` POSTed typing history to `/api/student/progress` and `syncCloudProgress()` fetched it | `www/js/student_portal.js` (`~319–359`), `backend/server.js` (`~894–945`), `firestore.rules` (`~46–50`) |
| No central Back / `popstate` handler | Only Capacitor `backButton` existed without `window.popstate` or History API stack management | `www/index.html` (`registerBackButton`, `showScreen`) |
| 5-minute test option (`300s`) still active as default | Radio `name="tl" value="300" checked` and `timeLimitSecs = 300` were still present | `www/index.html` (`#timeRadios`, `readConfig`) |
| PhonePe `computePaymentSignature` parameter mismatch | `phonepe/webhook` and `phonepe/status` passed positional args instead of `{ orderId, paymentId, amount, secret }` (caught & fixed by E2E gate) | `backend/server.js` (`~955`, `~1005`) |

---

## B. Implementation Summary
- **Local-Only Reports & Photo:** Disabled client upload/sync in `www/js/student_portal.js`, locked `/api/student/progress` (`410 Gone`) in `backend/server.js`, locked `practice_history` in `firestore.rules`, created `www/js/local_reports_store.js` (JSON/CSV export, Capacitor `Documents/Typing Reports` folder sync, JSON restore), and upgraded local-only Gallery + Camera + Remove avatar handling (`<= 512px` JPEG, zero upload).
- **Central Back Navigation (`T7`):** Unified Capacitor `backButton` and browser `popstate` in `registerBackButton()` / `__ttHandleBack` with strict precedence (modals → active session → nested screen → non-dashboard tab → dashboard exit) and `pushAppNavState()`.
- **Drills, Reverse Typing, Progression, Keymap & Duration (`T1, T3, T4, T5, T6`):** Fixed Reverse minimal UI (`display:none !important` on stats/title/progress/subtitle), added `>= 44px` Tamil on-screen tap keys (`#revTamilTapPad`), added 8-Stage Progression card, added Home Keymap Help button + widened `#modalKeyMap`, and removed 5-minute (`300s`) radio (default `120s`, old 300s reports preserved).
- **Profile, Payment History & Cloud DB (`T2, T8, T9, T10`):** Hidden institute & reg number fields in student UI without deleting data, added validated `city` (`<= 60` chars) to Profile + backend + Admin Students, added `#studentPaymentHistoryCard`, and updated `firestore.rules` + `firestore.indexes.json`.
- **Exams, Expiry, Coupons & PhonePe (`T11, T12, T13`):** Added `backend/services/phonepeService.js` (`initiate`, signed `webhook`, S2S `status`), central `exams` CRUD (`/api/admin/exams`, `/api/exams/upcoming`), per-enrollment expiry editor (`/api/admin/enrollments/:id/expiry` with audit log & IST day boundaries), coupon redemption history endpoint, and Admin Dashboard overview/exams/city updates.

---

## C. Module-by-Module Status
- **Reverse Typing & Drills:** Fixed, added Tamil tap pad & 8-stage progression, tested via Playwright + JSDOM.
- **Local Reports & Photo:** Implemented `LocalReportsStore` & Gallery/Camera local avatar, tested network-capture zero-leak via Playwright.
- **Back Navigation:** Unified Capacitor + `popstate`, tested via Playwright; physical Android gesture/hardware back is `NOT TESTED` (no device attached).
- **Backend / PhonePe / Admin:** Implemented Exams CRUD, Expiry, City, PhonePe sandbox service & routes; tested against mock PhonePe server; real PhonePe sandbox/live API calls `BLOCKED` (no owner merchant/salt credentials in `.env`).

---

## D. Test Results Table
| Area | Test | Viewport / Env | Status | Evidence |
|---|---|---|---|---|
| All 14 Core CI Suites | `run_senior_qa_tests.js` + 13 `test_*.js` | Node / JSDOM | **PASS** | `CI_TOTAL_FAILURES=0` (14/14 suites) |
| Master Prompt E2E Gate | `node test_master_prompt_gate.js` | Node HTTP + Edge 390×844 | **PASS** | `ALL_MASTER_PROMPT_GATE_CHECKS_PASSED` |
| Responsive / Layout QA | `npm run qa` (`run_playwright_qa.js`) | 320–1366 viewports | **PASS (81/82)** | 1 baseline failure (`ITEM_13_FS_WEB` fullscreen btn in headless Edge) |
| Privacy Network Capture | `test_master_prompt_gate.js` | Edge 390×844 | **PASS** | 0 outgoing report/photo requests |
| PhonePe Live & Real Sandbox | Live PhonePe gateway | Production / Sandbox | **BLOCKED** | Missing owner `PHONEPE_MERCHANT_ID` / `PHONEPE_SALT_KEY` |
| Android Device Hardware / SAF / Uninstall | Physical Android APK | Android device | **NOT TESTED** | No Android SDK / physical device attached to Windows host |

---

## E. Backend Audit
- Plain Node `http` server (`backend/server.js`) with `AtomicDatabase` (`backend/db.js`) / `FirestoreDatabase` (`backend/firestoreDb.js`).
- Added `exams` collection, `city` validation (`<= 60` chars), `/api/student/progress` `410 Gone`, `/api/exams/upcoming`, `/api/admin/exams`, `/api/admin/enrollments/:id/expiry`, `/api/admin/coupons/:id/redemptions`, and `/api/payments/phonepe/*`.

---

## F. Database & Rules
- Added `exams` collection + `city` on `users`.
- Updated `firestore.rules` (locked `practice_history` to `false`, added `exams`, `coupons`, `couponRedemptions`) and `firestore.indexes.json` (`exams`, `purchases`).
- No destructive migrations; existing enrollments and data preserved.

---

## G. Admin Dashboard Status
- Overview KPIs updated with real server-computed revenue, today/week/month student joins, expired/expiring enrollments, failed/cancelled payments, and upcoming exams.
- Central Exams CRUD UI and Student `city` column added in `admin/dashboard.html` and `admin/app.js`.

---

## H. Payment Report
- **Sandbox:** Implemented in `backend/services/phonepeService.js` + `backend/server.js`; verified end-to-end against a mock PhonePe HTTP handler (`PAYMENT_INITIATED` → signed `X-VERIFY` `PAYMENT_SUCCESS` webhook → idempotent unlock; pending/failed excluded from revenue). Real PhonePe sandbox network call: **BLOCKED** (no sandbox credentials in `.env`).
- **Live:** **BLOCKED** (owner live merchant credentials required).

---

## I. Local Storage & Privacy
- **Reports:** Stored locally (`window.storage` `recent-results` + optional Capacitor `Documents/Typing Reports` JSON files + JSON/CSV export & restore).
- **Photo:** Stored locally (`window.storage` `student_avatar`, resized `<= 512px` JPEG, Gallery + Camera + Remove).
- **Privacy Defect Found & Fixed:** `student_portal.js` previously POSTed to `/api/student/progress`; now disabled and `/api/student/progress` returns `410 Gone`.
- **Existing Server-Side `practiceHistory` Records:** Any historical records already stored in `practiceHistory` on the server/Firestore prior to this change were **not** silently deleted; they remain untouched pending explicit owner approval to export or purge.
- **Android SAF / Uninstall Note:** App-private storage and persisted SAF folder grants are cleared on Android uninstall; after reinstalling, students re-pick their `Typing Reports` backup file/folder to restore.

---

## J. Mobile Navigation
- Central handler `__ttHandleBack` wired to both Capacitor `App.addListener('backButton')` and `window.addEventListener('popstate')`.
- Physical Android hardware back/gesture testing on a real handset: **NOT TESTED**.

---

## K. Integration Table
| Feature | API | DB Persistence | Test | Status |
|---|---|---|---|---|
| Profile `city` | `PUT /api/student/profile` | `users.city` | `test_master_prompt_gate.js` | **PASS** |
| Local-Only Reports | `POST /api/student/progress` (410) | Device only | `test_master_prompt_gate.js` | **PASS** |
| Central Exams CRUD | `/api/admin/exams`, `/api/exams/upcoming` | `exams` | `test_master_prompt_gate.js` | **PASS** |
| Enrollment Expiry | `PUT /api/admin/enrollments/:id/expiry` | `enrollments.expiresAt` + `auditLogs` | `test_master_prompt_gate.js` | **PASS** |
| PhonePe Webhook & Status | `/api/payments/phonepe/*` | `purchases`, `enrollments` | `test_master_prompt_gate.js` (mock) | **PASS (Mock) / BLOCKED (Live)** |

---

## L. Pending Issues & Deployment Steps
1. **Deployment Steps (not yet run):**
   - Deploy updated `firestore.rules` and `firestore.indexes.json` via Firebase CLI.
   - Set `PHONEPE_ENV`, `PHONEPE_MERCHANT_ID`, `PHONEPE_SALT_KEY`, `PHONEPE_SALT_INDEX` in backend environment.
   - Run `npx cap sync android` and rebuild/publish the Android APK/AAB (e.g. via GitHub Actions).
   - Deploy updated `backend/server.js` and `admin/` static files.
2. **Owner Action Needed:** Approve export/purge of any pre-existing `practiceHistory` records on the server if desired.

---

## M. Final Summary
- **Ready for students (with live PhonePe):** **NO** — not production-ready until:
  1. PhonePe sandbox & live merchant credentials are configured and verified against PhonePe servers (`BLOCKED`).
  2. Physical Android device testing is completed for hardware back/gesture, camera/gallery permissions, SAF folder backup, and uninstall→reinstall restore (`NOT TESTED`).
  3. Updated `firestore.rules`, `firestore.indexes.json`, backend server, and rebuilt Android APK are deployed.
