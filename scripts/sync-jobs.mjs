import { readFile, writeFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NEWS_READER_UID } from '../src/news-model.js';
import { JOB_PROFILE } from '../src/jobs-model.js';
import { parseJobPage, parseSearchPage, selectJobs } from './linkedin-model.mjs';

const dryRun = process.argv.includes('--dry-run') || process.env.JOBS_DRY_RUN === 'true';
const now = Date.now();
const editionDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const keywords = ['Full Stack Developer', 'Backend Engineer', 'Forward Deployed Engineer', 'Software Development Engineer'];
const headers = { 'User-Agent': 'MaikalJobSearch/1.0 (+https://kedarisettisatwik.github.io/maikal/)', Accept: 'text/html' };
async function publicPage(url) {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(25000), redirect: 'follow' });
  if ([401, 403, 429].includes(response.status) || /authwall|checkpoint|\/login/.test(new URL(response.url).pathname)) throw Object.assign(new Error('LinkedIn restricted public access. The previous job edition was retained; no access restrictions were bypassed.'), { restricted: true });
  if (!response.ok) throw new Error(`LinkedIn page returned HTTP ${response.status}.`);
  const html = await response.text(); if (html.length > 3000000) throw new Error('LinkedIn page exceeded the size limit.');
  return html;
}
function credential() {
  let key; try { key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null'); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid JSON.'); }
  if (key?.type !== 'service_account' || !key.private_key || !key.client_email || key.project_id !== process.env.FIREBASE_PROJECT_ID) throw new Error('Configure a matching Firebase server service account and project ID.');
  return key;
}
async function main() {
  let db, previous = null;
  if (!dryRun) {
    const key = credential(), app = initializeApp({ credential: cert(key), projectId: key.project_id }); db = getFirestore(app);
    const reader = await getAuth(app).getUser(NEWS_READER_UID); if (reader.disabled) throw new Error('The designated job reader account is disabled.');
    const snapshot = await db.doc('jobEditions/latest').get(); previous = snapshot.exists ? snapshot.data() : null;
  }
  const candidates = new Map();
  for (const keyword of keywords) {
    const params = new URLSearchParams({ keywords: keyword, location: 'India', f_TPR: 'r86400', f_E: '2,3', sortBy: 'DD', start: '0' });
    const html = await publicPage(`https://www.linkedin.com/jobs/search/?${params}`);
    for (const candidate of parseSearchPage(html)) candidates.set(candidate.id, candidate);
    await pause(2000);
  }
  if (!candidates.size) throw new Error('LinkedIn returned no readable public job results. The previous edition was retained.');
  console.log(`Public LinkedIn search: ${candidates.size} relevant candidate listing(s).`);
  const matches = [], checked = new Set(), perRole = new Map();
  // Interleave role families so a single search cannot crowd out all FDE/backend listings.
  const groups = [...new Set([...candidates.values()].map(job => job.role))].map(role => [...candidates.values()].filter(job => job.role === role));
  const ordered = []; for (let i = 0; groups.some(group => i < group.length); i++) for (const group of groups) if (group[i]) ordered.push(group[i]);
  for (const candidate of ordered.slice(0, 50)) {
    if (checked.has(candidate.id)) continue; checked.add(candidate.id);
    try {
      const job = parseJobPage(await publicPage(candidate.url), candidate, now);
      if (job) { matches.push(job); perRole.set(job.role, (perRole.get(job.role) || 0) + 1); }
    } catch (error) { if (error.restricted) throw error; console.warn(`A public listing could not be verified (${error.name || 'error'}).`); }
    if (checked.size % 10 === 0) console.log(`Verified ${checked.size} listing(s); ${matches.length} potential match(es).`);
    if (selectJobs(matches, previous, editionDate).length >= 10) break;
    await pause(2000);
  }
  const jobs = selectJobs(matches, previous, editionDate);
  const seen = Object.fromEntries(Object.entries(previous?.seen || {}).filter(([, time]) => Number(time) > now - 30 * 86400000));
  for (const job of jobs) seen[job.id] = seen[job.id] || now;
  const edition = { schemaVersion: 1, editionDate, fetchedAt: now, source: 'LinkedIn', profile: JOB_PROFILE, jobs, seen, checked: checked.size, note: jobs.length < 10 ? 'Fewer than 10 new matching public LinkedIn listings could be verified. No unrelated or duplicate jobs were added.' : '' };
  console.log(JSON.stringify({ editionDate, jobs: jobs.length, checked: checked.size, verifiedExperience: jobs.filter(job => job.experienceConfidence === 'explicit').length, dryRun }));
  if (dryRun) {
    if (process.env.JOBS_PREVIEW_PATH) await writeFile(process.env.JOBS_PREVIEW_PATH, JSON.stringify(edition, null, 2));
    return;
  }
  // The browser receives no cross-day tracking IDs, only the current verified edition.
  const { seen: ignored, ...readerEdition } = edition;
  const batch = db.batch(); batch.set(db.doc('jobEditions/latest'), edition); batch.set(db.doc(`users/${NEWS_READER_UID}/maikalRecords/jobs_latest`), { ...readerEdition, id: 'jobs_latest', type: 'jobs', updatedAt: now }); await batch.commit();
  console.log(`LinkedIn edition saved to Firebase for the designated account: ${jobs.length} opening(s).`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
