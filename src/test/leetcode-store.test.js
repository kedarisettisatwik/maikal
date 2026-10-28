import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ docs: new Map(), reads: vi.fn() }));
vi.mock('../firebase', () => ({ db: {} }));
vi.mock('firebase/firestore', () => ({
  doc: (_db, ...parts) => parts.join('/'),
  runTransaction: async (_db, work) => {
    const pending = []; const result = await work({ get: async path => { mocks.reads(path); return { exists: () => mocks.docs.has(path), data: () => mocks.docs.get(path) }; }, set: (path, value) => pending.push([path, value]), update: (path, value) => pending.push([path, { ...mocks.docs.get(path), ...value }]) });
    for (const [path, value] of pending) mocks.docs.set(path, value); return result;
  },
  writeBatch: () => { const updates = []; return { update: (path, values) => updates.push([path, values]), commit: async () => { for (const [path, values] of updates) mocks.docs.set(path, { ...mocks.docs.get(path), ...values }); } }; },
}));
import { ensureDailyProblem, completeDailyProblem } from '../leetcode-store';
const uid = '0kX2kfDq3KV9MIhtDV7IDpuXnfJ3', base = `users/${uid}/maikalRecords/`;
beforeEach(() => { mocks.docs.clear(); mocks.reads.mockClear(); mocks.docs.set(base + 'leetcode_state', { problemIds: ['leetcode_problem_1', 'leetcode_problem_2'], nextIndex: 0 }); for (const id of [1, 2]) mocks.docs.set(base + `leetcode_problem_${id}`, { id: `leetcode_problem_${id}`, problemId: String(id), title: `Problem ${id}`, difficulty: 'Easy', tags: ['Array'], link: `https://leetcode.com/problems/example-${id}/`, completed: false }); });
it('assigns once per date and fetches a different Firestore problem on the next open day', async () => {
  const first = await ensureDailyProblem(uid, '2026-10-29');
  expect(first.problemId).toBe('1'); expect((await ensureDailyProblem(uid, '2026-10-29')).problemId).toBe('1');
  expect(mocks.docs.get(base + 'leetcode_state').nextIndex).toBe(1);
  const next = await ensureDailyProblem(uid, '2026-10-31'); expect(next.problemId).toBe('2');
  expect(mocks.docs.get(base + 'leetcode_day_2026-10-29').problemId).toBe('1');
  expect(mocks.docs.has(base + 'leetcode_day_2026-10-30')).toBe(false);
});
it('updates the completed boolean on both the history record and catalog problem', async () => {
  const problem = await ensureDailyProblem(uid, '2026-10-29'); await completeDailyProblem(uid, problem, true);
  expect(mocks.docs.get(base + problem.id).completed).toBe(true); expect(mocks.docs.get(base + problem.problemRecordId).completed).toBe(true);
  await completeDailyProblem(uid, problem, false); expect(mocks.docs.get(base + problem.problemRecordId).completed).toBe(false);
});
it('prevents unauthorized reads before accessing Firestore', async () => {
  await expect(ensureDailyProblem('other', '2026-10-29')).rejects.toThrow('not available'); expect(mocks.reads).not.toHaveBeenCalled();
});
