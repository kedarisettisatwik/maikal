import { readFile } from 'node:fs/promises';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { NEWS_READER_UID } from '../src/news-model.js';
import { normalizeProblems, catalogOrder } from './leetcode-import-model.mjs';

async function main() {
  let raw;
  const fileIndex = process.argv.indexOf('--file');
  if (fileIndex !== -1) raw = await readFile(process.argv[fileIndex + 1], 'utf8');
  else {
    const payload = Array.from({ length: 8 }, (_, i) => process.env[`LEETCODE_IMPORT_${i + 1}`] || '').join('');
    if (!payload) throw new Error('The one-time import data is missing. Supply --file or the temporary encrypted import inputs.');
    raw = gunzipSync(Buffer.from(payload, 'base64'), { maxOutputLength: 10000000 }).toString('utf8');
  }
  const problems = normalizeProblems(JSON.parse(raw.replace(/^\uFEFF/, '')));
  let key; try { key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null'); } catch { throw new Error('Invalid Firebase service-account JSON.'); }
  if (key?.type !== 'service_account' || key.project_id !== process.env.FIREBASE_PROJECT_ID) throw new Error('A matching Firebase server credential is required.');
  const app = initializeApp({ credential: cert(key), projectId: key.project_id }), db = getFirestore(app);
  const user = await getAuth(app).getUser(NEWS_READER_UID); if (user.disabled) throw new Error('The designated account is disabled.');
  const base = db.collection(`users/${NEWS_READER_UID}/maikalRecords`);
  for (let start = 0; start < problems.length; start += 400) {
    const chunk = problems.slice(start, start + 400), refs = chunk.map(problem => base.doc(problem.recordId));
    const old = await db.getAll(...refs), batch = db.batch();
    chunk.forEach((problem, i) => batch.set(refs[i], { ...problem, completed: old[i].exists ? old[i].data().completed === true : problem.completed }, { merge: true }));
    await batch.commit(); console.log(`Imported ${Math.min(start + chunk.length, problems.length)} / ${problems.length} problems.`);
  }
  const stateRef = base.doc('leetcode_state');
  const hash = createHash('sha256').update(JSON.stringify(problems.map(problem => problem.problemId))).digest('hex');
  await db.runTransaction(async transaction => {
    const state = await transaction.get(stateRef), previous = state.exists ? state.data() : null;
    const ordered = catalogOrder(problems);
    const previousIds = previous?.problemIds || [], extras = ordered.filter(id => !previousIds.includes(id));
    transaction.set(stateRef, { id: 'leetcode_state', type: 'leetcodeState', problemIds: previousIds.length ? [...previousIds, ...extras] : ordered, nextIndex: previous?.nextIndex || 0, catalogSize: problems.length, catalogHash: hash, updatedAt: Date.now() }, { merge: true });
  });
  const count = (await base.where('type', '==', 'leetcodeProblem').count().get()).data().count;
  if (count !== problems.length) throw new Error(`Catalog count mismatch: ${count} documents, expected ${problems.length}.`);
  console.log(`Verified ${count} Firestore problem documents with a completed boolean. Runtime uses Firestore only.`);
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
