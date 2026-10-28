import { expect, it, vi } from 'vitest';
import { deliverEdition } from '../../scripts/news-store.mjs';

function database() {
  const shared = vi.fn().mockResolvedValue(), writes = [], commits = [];
  return { shared, writes, commits, db: { doc: path => ({ path, set: shared }), batch: () => { let count = 0; return { set: (ref, data) => { writes.push({ path: ref.path, data }); count++; }, commit: async () => { commits.push(count); } }; } } };
}
it('delivers across paginated accounts, excluding disabled users', async () => {
  const store = database(), auth = { listUsers: vi.fn().mockResolvedValueOnce({ users: [{ uid: 'one' }, { uid: 'disabled', disabled: true }], pageToken: 'next' }).mockResolvedValueOnce({ users: [{ uid: 'two' }] }) };
  const edition = { articles: [], fetchedAt: 123 };
  expect(await deliverEdition(store.db, auth, edition)).toBe(2);
  expect(auth.listUsers).toHaveBeenLastCalledWith(1000, 'next');
  expect(store.writes.map(write => write.path)).toEqual(['users/one/maikalRecords/news_latest', 'users/two/maikalRecords/news_latest']);
  expect(store.writes[0].data).toEqual({ ...edition, id: 'news_latest', type: 'news', updatedAt: 123 });
});
it('keeps Firestore batches under the write limit', async () => {
  const store = database();
  await deliverEdition(store.db, { listUsers: async () => ({ users: Array.from({ length: 805 }, (_, i) => ({ uid: String(i) })) }) }, { fetchedAt: 1 });
  expect(store.commits).toEqual([400, 400, 5]);
});
it('does not publish if it cannot enumerate account recipients', async () => {
  const store = database();
  await expect(deliverEdition(store.db, { listUsers: async () => { throw Error('Permission denied'); } }, {})).rejects.toThrow('Permission denied');
  expect(store.shared).not.toHaveBeenCalled();
});
