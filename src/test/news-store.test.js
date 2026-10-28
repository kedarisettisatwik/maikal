import { expect, it, vi } from 'vitest';
import { deliverEdition } from '../../scripts/news-store.mjs';
import { NEWS_READER_UID, canReadNews } from '../news-model';

function database() {
  const writes = [], commit = vi.fn().mockResolvedValue();
  return { writes, commit, db: { doc: path => ({ path }), batch: () => ({ set: (ref, data) => writes.push({ path: ref.path, data }), commit }) } };
}
it('delivers only to the designated account and the shared admin document', async () => {
  const store = database(), auth = { getUser: vi.fn().mockResolvedValue({ uid: NEWS_READER_UID }) }, edition = { articles: [], fetchedAt: 123 };
  expect(await deliverEdition(store.db, auth, edition)).toBe(1);
  expect(auth.getUser).toHaveBeenCalledWith(NEWS_READER_UID);
  expect(store.writes.map(write => write.path)).toEqual(['newsEditions/latest', `users/${NEWS_READER_UID}/maikalRecords/news_latest`]);
  expect(store.writes[1].data).toEqual({ ...edition, id: 'news_latest', type: 'news', updatedAt: 123 });
  expect(store.commit).toHaveBeenCalledOnce();
});
it('does not publish if the designated account is absent or disabled', async () => {
  const store = database();
  await expect(deliverEdition(store.db, { getUser: async () => { throw Error('User not found'); } }, {})).rejects.toThrow('User not found');
  expect(store.commit).not.toHaveBeenCalled();
  await expect(deliverEdition(store.db, { getUser: async () => ({ disabled: true }) }, {})).rejects.toThrow('disabled');
});
it('exposes the News section only to the exact UID', () => {
  expect(canReadNews('0kX2kfDq3KV9MIhtDV7IDpuXnfJ3')).toBe(true);
  expect(canReadNews('another-user')).toBe(false);
  expect(canReadNews(null)).toBe(false);
});
