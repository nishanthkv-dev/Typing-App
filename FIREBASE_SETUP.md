# Firebase, Backend & Mobile Deployment Guide — Typing Thalaiva

## 1. Local Development & Seed Commands
1. Copy `.env.example` to `.env` and fill in your Firebase credentials (`FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_PATH` or `FIREBASE_SERVICE_ACCOUNT_JSON`, `FIREBASE_WEB_*`, `GOOGLE_CLIENT_ID`, `ADMIN_ALLOWED_EMAILS`, `JWT_SECRET`).
2. Seed default courses, initial coupons (`WELCOME100`, `TYPE25`), and optional bootstrap admin (idempotent, safe to re-run):
   ```bash
   npm run seed:backend
   ```
3. Start the Node.js backend + Web Admin Portal (`/admin`, `/admin/login`, `/admin/dashboard`):
   ```bash
   npm run start:backend
   ```
4. If migrating records from an existing `backend/data/store.json` into Cloud Firestore:
   ```bash
   node backend/migrate_to_firestore.js --dry-run
   npm run migrate:firestore
   ```

## 2. Deploy Firestore Rules & Indexes (Only After Firebase Project Is Created)
```bash
npm install -g firebase-tools
firebase login
firebase use <your-firebase-project-id>
firebase deploy --only firestore
```

## 3. Connect an Android Phone to Your Local Backend (HTTPS Tunnel)
Never point an Android APK to `http://localhost:4000` (`localhost` on the phone refers to the phone itself, while Capacitor WebView runs at `https://localhost`).
Start your backend (`npm run start:backend`), then expose port `4000` over HTTPS using either:
- **Cloudflare Tunnel (no account required for quick test):**
  ```bash
  cloudflared tunnel --url http://127.0.0.1:4000
  ```
- **ngrok:**
  ```bash
  ngrok http 4000
  ```
Copy the generated `https://...` URL and either:
- Set it in `<meta name="tt-api-base" content="https://...">` or GitHub Variable `TYPING_API_BASE` before building the APK, **or**
- Open **Student Sign In → Backend Server Connection** inside the mobile app and save the `https://...` URL at runtime.

## 4. Cloud Deployment (Render / Railway / Google Cloud Run)
The included `Dockerfile` packages `backend/`, `admin/`, and `www/libs/firebase/` and binds automatically to `0.0.0.0:$PORT`.
Set these environment variables in your host's Secret Manager:
- `NODE_ENV=production`
- `DB_DRIVER=firestore`
- `JWT_SECRET=<strong-random-64-char-hex>`
- `FIREBASE_PROJECT_ID=<your-project-id>`
- `FIREBASE_SERVICE_ACCOUNT_JSON=<raw-or-base64-service-account-json>`
- `FIREBASE_WEB_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`
- `GOOGLE_CLIENT_ID=<web-oauth-client-id>`
- `ADMIN_ALLOWED_EMAILS=<comma-separated-authorized-admin-emails>`
- `ALLOWED_ORIGINS=https://<your-backend-domain>,https://localhost,http://localhost,capacitor://localhost`

## 5. GitHub Actions Android APK & AAB Build
In **GitHub Repo → Settings → Secrets and variables → Actions**:
- **Secret `GOOGLE_SERVICES_JSON`:** Paste the contents of `android/app/google-services.json` (or base64).
- **Variable `TYPING_API_BASE` (optional):** Set to your deployed HTTPS backend URL (e.g., `https://api.yourdomain.com`).
