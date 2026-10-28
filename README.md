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
