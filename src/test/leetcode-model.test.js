import { expect, it } from 'vitest';
import { normalizeProblems, catalogOrder } from '../../scripts/leetcode-import-model.mjs';
import { canReadLeetcode, leetcodeDay, leetcodeLink, problemAssignment } from '../leetcode-model';
const problem = { id: '1', title: 'Two Sum', difficulty: 'Easy', tags: ['Array', 'Hash Table'], link: 'https://leetcode.com/problems/two-sum/', premium_only: false };
it('normalizes the one-time import with a completed boolean', () => {
  const records = normalizeProblems([problem]);
  expect(records[0]).toMatchObject({ id: '1', recordId: 'leetcode_problem_1', problemId: '1', type: 'leetcodeProblem', completed: false });
  expect(problem.completed).toBeUndefined();
});
it('orders free problems first and rejects invalid or duplicate data', () => {
  const records = normalizeProblems([{ ...problem, id: '2', premium_only: true }, problem]);
  expect(catalogOrder(records)).toEqual(['leetcode_problem_1', 'leetcode_problem_2']);
  expect(() => normalizeProblems([problem, problem])).toThrow('unique');
  expect(leetcodeLink('https://leetcode.com.evil.example/problems/two-sum/')).toBe('');
});
it('uses an India calendar date and allows only the designated account', () => {
  expect(leetcodeDay(new Date('2026-10-28T18:29:59Z'))).toBe('2026-10-28');
  expect(leetcodeDay(new Date('2026-10-28T18:30:00Z'))).toBe('2026-10-29');
  expect(canReadLeetcode('0kX2kfDq3KV9MIhtDV7IDpuXnfJ3')).toBe(true); expect(canReadLeetcode('other')).toBe(false);
});
it('copies title, difficulty, tags, link and completion into a dated assignment', () => {
  expect(problemAssignment(normalizeProblems([problem])[0], '2026-10-29')).toMatchObject({ id: 'leetcode_day_2026-10-29', date: '2026-10-29', title: 'Two Sum', completed: false, tags: ['Array', 'Hash Table'] });
});
