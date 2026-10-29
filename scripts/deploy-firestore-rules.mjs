import { readFile } from 'node:fs/promises';
import { cert } from 'firebase-admin/app';

const key = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || 'null');
if (!key?.private_key || key.project_id !== process.env.FIREBASE_PROJECT_ID) throw new Error('Matching Firebase service account required');
const { access_token: token } = await cert(key).getAccessToken();
const base = `https://firebaserules.googleapis.com/v1/projects/${key.project_id}`;
async function request(path, method, body) {
  const response = await fetch(`${base}${path}`, { method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Rules deployment failed: HTTP ${response.status}: ${data.error?.message || 'Unknown error'}`);
  return data;
}
const rules = await readFile('firestore.rules', 'utf8');
const ruleset = await request('/rulesets', 'POST', { source: { files: [{ name: 'firestore.rules', content: rules }] } });
await request('/releases/cloud.firestore', 'PATCH', { release: { name: `projects/${key.project_id}/releases/cloud.firestore`, rulesetName: ruleset.name }, updateMask: 'rulesetName' });
console.log('Firestore rules deployed: cloud records are restricted to the designated account.');
