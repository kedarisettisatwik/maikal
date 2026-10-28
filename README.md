# Maikal — The Daily Edition

React + Vite planner with Firebase Authentication, Firestore, and top-center `react-hot-toast` notifications.

**Live site:** https://kedarisettisatwik.github.io/maikal/

## Run locally

Requires Node.js 20.19+ or 22.12+ (Node 24 is supported).

```powershell
npm ci
Copy-Item .env.example .env
# Fill in your Firebase web configuration in .env
npm run dev
```

Open the `/maikal/` URL printed by Vite. The existing local `.env` is already configured; do not overwrite it when working in this workspace.

```powershell
npm test          # automated model and React interaction checks
npm run build     # production files in dist/
npm run preview   # local preview of the production build
```

`package.json` declares all application/test dependencies and `package-lock.json` locks their versions. `node_modules` and `dist` are ignored.

## Environment configuration

Firebase values are read from six `VITE_FIREBASE_*` variables, listed in `.env.example`. `.env` and environment-specific files are excluded by `.gitignore`; the committed example contains no values. The build fails clearly if a required variable is missing.

Vite embeds `VITE_*` values into the browser build. Firebase web configuration is public client configuration, not a server credential; authentication and Firestore rules protect user data. Never place service-account keys or other server secrets in these variables. See [Firebase API key guidance](https://firebase.google.com/docs/projects/api-keys).

## Automatic GitHub Pages deployment

`.github/workflows/deploy.yml` runs on pushes to `main` and can also be started manually. It installs dependencies with `npm ci`, runs tests, builds, then deploys `dist` to GitHub Pages. The repository is configured to use GitHub Actions as its Pages source.

The build reads these **repository Actions secrets**:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`

Manage them under Settings → Secrets and variables → Actions. The workflow never commits `.env`. Vite's `/maikal/` base path and the asset URL helper keep the favicon, logo, and icons working on GitHub Pages.

## Firebase console settings

Enable Email/Password in Authentication → Sign-in method. Create a Cloud Firestore database if needed. Merge `firestore.rules` with any existing rules before publishing them in Firebase Console. For hosted authentication flows, add `kedarisettisatwik.github.io` in Authentication → Settings → Authorized domains, and retain localhost for local development.

Sign-up creates and signs in an account. Forgot password sends a Firebase reset link. Firebase remembers the session through browser local storage without storing the password in application storage.

Records sync automatically under `users/{uid}/maikalRecords`. The app retains the former `maikal-v2-{uid}` cache format. Local caches belong to the browser origin; signing in on the published site restores cloud-synced records. Unsynced changes on localhost remain on that origin.

## Features

- Newspaper-style daily dashboard, today's goals/plans, and yesterday's report.
- Checkbox goals and per-date tracker values, autosaved on blur or Enter.
- Daily, weekday, individual-date, and date-range schedules.
- Income/expense categories and transactions with edit/delete actions, including historical entries.
- Daily totals, monthly income/expenses/savings, and an expense-category donut.
- 5px scrollbars in Chromium/WebKit and a thin Firefox fallback.
- Supplied logo, favicon, 30 goal icons, and 11 expense icons in `public/`.
- Top-center toast notifications for authentication and record actions, including validation inside dialogs.

Meetings and reminders are saved plans; background notifications are not implemented.

## Source

- `src/App.jsx`: session state and sign-in/sign-up/password-reset forms.
- `src/components/`: dashboard, entries, goals, reports, and money views.
- `src/model.js`: recurrence, date, progress, money, and sync helpers.
- `src/useRecords.js`: account-scoped local persistence and Firestore sync.
- `src/firebase.js`: environment-based Firebase initialization.
- `src/assets.js`: deployment-aware asset paths.
- `src/styles.css`: responsive newspaper design.
- `src/test/`: model and interaction tests; auth calls are mocked and do not create real accounts or send real emails.

## Daily News — 6:00 AM India time

The final **News** section covers India, World, Technology, Business, and Layoffs. It displays publisher attribution, publication times, original-coverage links, short feed-provided snippets, and reference-report links when a feed provides them. Report links are not invented or inferred as citations to a story. Headlines come from Google News India/layoffs feeds and BBC World/Technology/Business feeds, listed in `scripts/news-sources.json`.

`.github/workflows/news.yml` runs at `30 0 * * *` UTC, which is **06:00 Asia/Kolkata** daily. GitHub may delay scheduled jobs; the page shows the actual edition-update time. Manual runs are supported.

### Enable the server-side Firebase write

1. In Firebase Console, open **Project settings → Service accounts → Generate new private key** for this project.
2. Open [repository Actions secrets](https://github.com/kedarisettisatwik/maikal/settings/secrets/actions/new).
3. Add a secret named **`FIREBASE_SERVICE_ACCOUNT`** containing the entire downloaded JSON file. This is different from the web app's `firebaseConfig`. Do not commit the JSON or paste it into chat.
4. Under [Actions](https://github.com/kedarisettisatwik/maikal/actions), select **Update morning news → Run workflow** on `main`. Leave **dry_run** unchecked to save the first edition to Firebase.

The service account needs Firestore data access and Firebase Authentication user-read access. Use a service account from this app's Firebase project. The script validates its type and project ID and never logs the private key. It reads the project ID from the existing `VITE_FIREBASE_PROJECT_ID` repository secret.

The importer saves the shared current edition to `newsEditions/latest` and an edition copy only to account `0kX2kfDq3KV9MIhtDV7IDpuXnfJ3` at `users/{uid}/maikalRecords/news_latest`. The News section and its Firestore listener are enabled only for that UID. Other accounts do not receive news copies. Shared and reader copies are written atomically, using the existing account-isolation rules. The shared admin document does not require any new public read rule.

Stories are limited to three per category from the last 48 hours and deduplicated by URL. Failed categories can retain recent stories from the previous edition. If all feeds fail or no recent stories are found, the previous edition is preserved. News is cached separately per account for offline reading; its timestamps remain visible.

```powershell
npm run news:check  # fetch and validate current feeds; no Firebase writes
npm run news:sync   # server import; requires FIREBASE_SERVICE_ACCOUNT and FIREBASE_PROJECT_ID
```

The server-only Firebase Admin SDK, RSS parser, and HTML parser are development dependencies used by the scheduled job; they are not bundled into the browser application. Server credentials must never use a `VITE_` prefix.
