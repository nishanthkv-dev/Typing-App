# Typing Thalaiva — Tamil & English DoTE Typing Tutor

Official mobile application, backend API, and Web Admin Portal for **Sri Kalaimagal Typewriting Institute** (powered by K V N Techno Labs).

## Architecture
- **Student Mobile App (`www/` + `android/`):** Vanilla HTML/CSS/JS SPA wrapped in **Capacitor 6** (`in.srikalaimagal.typingthalaiva`).
  - **Offline-capable:** Typing Studio (2 free Tamil + 2 free English passages), Untimed Skill Drills, Keyboard Row Practice, Word Practice, Arcade Games (Bubble Letters, Falling Words, Word Typing), OTG physical keyboard detection (`MainActivity` JS bridge), local analytics, and PDF/image scorecard export.
  - **Online-connected:** Firebase Authentication (Google Sign-In + Email/Password), Cloud Firestore progress sync (`POST/GET /api/student/progress`), course catalog, coupon validation (`WELCOME100`, `TYPE25`), enrollment status, exam schedules, and rebooking.
- **Node.js Backend (`backend/`):** Zero-framework HTTP server with Firebase Admin SDK token verification, Cloud Firestore persistence (`FirestoreDatabase`) with local JSON dev fallback (`AtomicDatabase`), rate limiting, HMAC payment verification hooks, and transactional email reset support (`Resend` or Firebase Auth).
- **Web Admin Portal (`admin/`):** Separate RBAC-protected portal (`/admin`, `/admin/login`, `/admin/dashboard`) for student, course, coupon, purchase, exam schedule, and audit-log management.

## Quick Commands
- `npm run seed:backend` — Seed default courses, initial coupons, and optional bootstrap admin idempotently.
- `npm run start:backend` — Start the Node.js API & Web Admin Portal (`http://127.0.0.1:4000/admin`).
- `npm run migrate:firestore` — Safely migrate `backend/data/store.json` into Cloud Firestore (with backup & test-user filtering).
- `npx cap sync android` — Sync `www/` and Capacitor plugins into `android/`.

## Testing
Run any of the 14 automated QA suites with Node.js (e.g., `node test_firebase_integration.js`, `node test_courses_coupons_admin.js`, `node test_auth_and_access.js`, `node run_senior_qa_tests.js`). See [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for Firebase CLI, HTTPS tunneling, Docker deployment, and GitHub Actions APK secrets.
