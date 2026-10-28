# Maikal â€” The Daily Edition

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

Manage them under Settings â†’ Secrets and variables â†’ Actions. The workflow never commits `.env`. Vite's `/maikal/` base path and the asset URL helper keep the favicon, logo, and icons working on GitHub Pages.

## Firebase console settings

Enable Email/Password in Authentication â†’ Sign-in method. Create a Cloud Firestore database if needed. Merge `firestore.rules` with any existing rules before publishing them in Firebase Console. For hosted authentication flows, add `kedarisettisatwik.github.io` in Authentication â†’ Settings â†’ Authorized domains, and retain localhost for local development.

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

## Daily News â€” 6:00 AM India time

The final **News** section covers India, World, Technology, Business, Layoffs, and Sports (focused on India cricket matches, series, fixtures, and results). It displays publisher attribution, publication times, original-coverage links, short feed-provided snippets, and reference-report links when a feed provides them. Report links are not invented or inferred as citations to a story. Headlines come from Google News India/layoffs/India-cricket feeds and BBC World/Technology/Business feeds, listed in `scripts/news-sources.json`.

`.github/workflows/news.yml` runs at `30 0 * * *` UTC, which is **06:00 Asia/Kolkata** daily. GitHub may delay scheduled jobs; the page shows the actual edition-update time. Manual runs are supported.

### Enable the server-side Firebase write

1. In Firebase Console, open **Project settings â†’ Service accounts â†’ Generate new private key** for this project.
2. Open [repository Actions secrets](https://github.com/kedarisettisatwik/maikal/settings/secrets/actions/new).
3. Add a secret named **`FIREBASE_SERVICE_ACCOUNT`** containing the entire downloaded JSON file. This is different from the web app's `firebaseConfig`. Do not commit the JSON or paste it into chat.
4. Under [Actions](https://github.com/kedarisettisatwik/maikal/actions), select **Update morning news â†’ Run workflow** on `main`. Leave **dry_run** unchecked to save the first edition to Firebase.

The service account needs Firestore data access and Firebase Authentication user-read access. Use a service account from this app's Firebase project. The script validates its type and project ID and never logs the private key. It reads the project ID from the existing `VITE_FIREBASE_PROJECT_ID` repository secret.

The importer saves the shared current edition to `newsEditions/latest` and an edition copy only to account `0kX2kfDq3KV9MIhtDV7IDpuXnfJ3` at `users/{uid}/maikalRecords/news_latest`. The News section and its Firestore listener are enabled only for that UID. Other accounts do not receive news copies. Shared and reader copies are written atomically, using the existing account-isolation rules. The shared admin document does not require any new public read rule.

News categories are stacked vertically in order: India, World, Technology, Business, Layoffs, and Sports. Each category has a responsive row of equal-width stories with automatic heights; headlines, snippets, and report links can expand naturally. Stories are limited to three per category from the last 48 hours and deduplicated by URL. Failed categories can retain recent stories from the previous edition. If all feeds fail or no recent stories are found, the previous edition is preserved. News is cached separately per account for offline reading; its timestamps remain visible.

```powershell
npm run news:check  # fetch and validate current feeds; no Firebase writes
npm run news:sync   # server import; requires FIREBASE_SERVICE_ACCOUNT and FIREBASE_PROJECT_ID
```

The server-only Firebase Admin SDK, RSS parser, and HTML parser are development dependencies used by the scheduled job; they are not bundled into the browser application. Server credentials must never use a `VITE_` prefix.


## LinkedIn-only morning job openings

A **Job openings** section follows News and is visible only to account `0kX2kfDq3KV9MIhtDV7IDpuXnfJ3`. The reader hook and server delivery use the same account restriction.

`.github/workflows/jobs.yml` runs at **06:00 Asia/Kolkata** (`30 0 * * *` UTC), independently of the news job. It reads publicly accessible LinkedIn search and listing pages for Full Stack Developer, Backend Engineer, Forward Deployed Engineer (FDE), and Software Development Engineer roles in India. No employer feeds or other job boards are substituted. The connected LinkedIn plugin does not expose job search, so the scheduler does not call that plugin or claim to use a supported LinkedIn search API.

The target profile is a **2024 graduate with two years of experience**. Listings with higher stated minimum experience, conflicting graduation batches, senior/lead/intern titles, expired dates, closed applications, or non-India locations are excluded. Explicit two-year-compatible requirements rank first. If a posting does not state a graduation year or exact experience, the UI labels that uncertainty; a bachelor's degree alone is not treated as proof that 2024 graduates are eligible.

The daily edition contains **up to 10** distinct new matching openings, not filler entries. Search pages request postings from the last 24 hours; a 48-hour timestamp validation window accommodates LinkedIn's date-only metadata. Posting IDs seen in an earlier daily edition are not reintroduced as new. Same-day reruns can retain the current edition's matches. Each card includes company, title, location, posting date, experience, graduation-year disclosure, and a LinkedIn application link.

CTC is shown only when explicitly stated as CTC in the posting. Separately listed base pay is labelled as base pay and is never presented as total CTC. Missing compensation is labelled **Not disclosed**.

Only public pages are read, with conservative sequential requests and no LinkedIn login, cookies, proxy rotation, or access-control bypass. If LinkedIn restricts access or changes its public pages, the job fails clearly and retains the previous edition; the UI shows the last check time and marks older editions. GitHub scheduled runs may be delayed.

The importer reuses the encrypted server secrets already used by the news scheduler. It saves private tracking state in `jobEditions/latest` and the reader copy in `users/{uid}/maikalRecords/jobs_latest`; server credentials are never sent to the browser.

```powershell
npm run jobs:check  # read-only live LinkedIn validation
npm run jobs:sync   # import to Firebase using server credentials
```

## LeetCode — Firestore-only daily problems

The supplied JSON is imported **once** into Firestore for account `0kX2kfDq3KV9MIhtDV7IDpuXnfJ3`. The dataset is not committed to GitHub, published as a static asset, bundled into JavaScript, or fetched as JSON by the website. Temporary encrypted import inputs are removed after successful verification.

Each of the 4,096 problem documents lives at `users/{uid}/maikalRecords/leetcode_problem_{originalId}` with the original `id`, title, difficulty, tags, link, premium flag, and a **`completed` boolean**. `recordId`, `problemId`, and `type` are metadata for the app. Re-importing does not reset existing completion flags or the daily-assignment cursor.

The private **leetcode - problem of the day** section appears above News. Opening the app assigns one unused problem for the current **Asia/Kolkata calendar date**, using a Firestore transaction. Reloading or opening another device on the same date returns the same assignment. Missed days are not backfilled. Free problems are assigned first, in problem-ID order; premium problems remain in the imported catalog for later.

The **History** dropdown lists past assigned dates with title, difficulty, tags, original LeetCode link, and completion status. Marking a problem complete updates both the dated assignment and its catalog document in one atomic batch. The catalog and assignment state stay in Firestore; the browser caches only assigned history for display. A connection is required to assign a new day's problem and confirm completion updates.

Daily records are stored as `leetcode_day_YYYY-MM-DD`, and `leetcode_state` stores the Firestore problem-document IDs and next position. The normal goals/money listener filters its record types so it does not download all 4,096 problem documents. Only the designated UID renders the section or runs its queries.

`.github/workflows/import-leetcode.yml` is manual-only; it is not a daily scheduler. `scripts/import-leetcode.mjs` can also accept `--file /path/to/problems.json` for an explicit future one-time import with matching server credentials. Daily runtime never uses that file.

## Install Maikal as an app

Maikal includes an install manifest, a scoped service worker, logo-based 192px/512px icons, a maskable Android icon, and an Apple home-screen icon. Both `start_url` and service-worker scope use `/maikal/` for GitHub Pages. The app shell is cached; Firebase authentication and fresh cloud data still require a connection.

- **Android / Chrome or Edge:** open the HTTPS site directly in the browser, tap **Install app**, or use the browser menu → Add to Home screen → Install.
- **iPhone / iPad:** open the site in Safari, then Share → Add to Home Screen → Add.
- In-app browsers may not offer installation; open the site in the device's main browser first.

New versions display a reload notification instead of interrupting a partially completed form. The service worker caches static application assets, not Firebase API responses or private authentication requests.


## Goal reports

A collapsed **Reports** section follows Daily Practice (or the money section for users without Daily Practice). It is available to every signed-in account and reads only that account's existing goals and daily progress. Charts are mounted only after expanding the dropdown.

Choose any month to see one square for each actual day (28, 29, 30, or 31), aligned Monday–Sunday. Checkbox reports show completed days in green, scheduled but uncompleted days in black, and non-applicable dates at 0.1 opacity. Goal creation dates and daily/weekday/date/range schedules are respected. Future applicable days remain uncompleted, not labelled as missed.

Tracker reports plot daily count/minute values as proportional bars with dates, accessible values, and monthly totals. Non-applicable days are dimmed. The chart scrolls horizontally on narrow screens. Reports are read-only and update when the existing daily progress changes; no additional Firestore collection is required.
