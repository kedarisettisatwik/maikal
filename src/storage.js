import { NEWS_READER_UID } from './news-model';
import { localOnly } from './build-mode';

export const LOCAL_UID = 'local';
export const localKey = `maikal-v2-${LOCAL_UID}`;
export const cloudEnabled = uid => !localOnly && uid === NEWS_READER_UID;
export function readCache(key) {
  try { const cache = JSON.parse(localStorage.getItem(key) || '{}'); return { records: cache.records || {}, dirty: cache.dirty || {} }; }
  catch { return { records: {}, dirty: {} }; }
}
// Copy first, then clear the local source only after the cloud cache is durable.
// The normal dirty-record sync retries this merge even after an offline restart.
export function mergeLocalIntoCloud(uid) {
  if (!cloudEnabled(uid)) return;
  const local = readCache(localKey), key = `maikal-v2-${uid}`, cloud = readCache(key);
  for (const [id, record] of Object.entries(local.records)) {
    if (!['goal', 'event', 'category', 'transaction', 'progress', 'note'].includes(record.type)) continue;
    if (!cloud.records[id] || Number(record.updatedAt || 0) > Number(cloud.records[id].updatedAt || 0)) {
      cloud.records[id] = record; cloud.dirty[id] = true;
    }
  }
  localStorage.setItem(key, JSON.stringify(cloud));
  localStorage.removeItem(localKey);
}
