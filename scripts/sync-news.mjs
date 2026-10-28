import { readFile } from 'node:fs/promises';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import RSSParser from 'rss-parser';
import { buildEdition } from './news-model.mjs';
import { deliverEdition } from './news-store.mjs';

const dryRun = process.argv.includes('--dry-run') || process.env.NEWS_DRY_RUN === 'true';
const parser = new RSSParser({ customFields: { item: ['source'] } });
async function fetchFeed(feed) {
  let error;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(feed.url, { signal: AbortSignal.timeout(20000), headers: { 'User-Agent': 'MaikalNews/1.0 (+https://kedarisettisatwik.github.io/maikal/)', Accept: 'application/rss+xml,application/xml,text/xml' } });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      if (Number(response.headers.get('content-length')) > 2000000) throw new Error('Feed too large');
      const xml = await response.text();
      if (xml.length > 2000000) throw new Error('Feed too large');
      const parsed = await parser.parseString(xml);
      return { feed, items: parsed.items || [] };
    } catch (e) { error = e; }
  }
  console.warn(`${feed.id}: source unavailable (${error?.name || 'fetch failed'})`);
  return { feed, error: true };
}
function serverCredential() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('Add the Firebase service-account JSON as the repository Actions secret FIREBASE_SERVICE_ACCOUNT. The browser API configuration cannot authorize this import.');
  let credential;
  try { credential = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT); } catch { throw new Error('FIREBASE_SERVICE_ACCOUNT must contain valid service-account JSON.'); }
  if (credential.type !== 'service_account' || !credential.client_email || !credential.private_key) throw new Error('FIREBASE_SERVICE_ACCOUNT is not a service-account key. Generate it under Firebase Project settings → Service accounts.');
  const project = process.env.FIREBASE_PROJECT_ID;
  if (!project || credential.project_id !== project) throw new Error('The service-account project does not match FIREBASE_PROJECT_ID.');
  return credential;
}
async function main() {
  const credential = dryRun ? null : serverCredential();
  const feeds = JSON.parse((await readFile(new URL('./news-sources.json', import.meta.url), 'utf8')).replace(/^\uFEFF/, ''));
  const results = await Promise.all(feeds.map(fetchFeed));
  if (results.every(r => r.error)) throw new Error('All news feeds are unavailable. The previous edition was retained.');
  let edition = buildEdition(results);
  if (!edition.articles.length) throw new Error('No recent articles were found. The previous edition was retained.');
  console.log(JSON.stringify({ editionDate: edition.editionDate, articles: edition.articles.length, sources: edition.sources, dryRun }));
  if (dryRun) return;
  const app = initializeApp({ credential: cert(credential), projectId: credential.project_id });
  const db = getFirestore(app), auth = getAuth(app);
  const latest = db.doc('newsEditions/latest');
  const previous = await latest.get();
  edition = buildEdition(results, Date.now(), previous.exists ? previous.data() : null);
  const count = await deliverEdition(db, auth, edition);
  console.log(`News edition saved to Firestore and delivered to ${count} account(s).`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
