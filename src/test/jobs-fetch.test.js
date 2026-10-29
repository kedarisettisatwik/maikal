import { expect, it, vi } from 'vitest';
import { verifyCandidates } from '../../scripts/jobs-fetch.mjs';
const candidates = [1, 2, 3, 4].map(id => ({ id: String(id), url: `https://www.linkedin.com/jobs/view/${id}` }));
it('publishes verified partial matches and stops immediately at a restriction', async () => {
  const readPage = vi.fn().mockResolvedValueOnce('one').mockResolvedValueOnce('two').mockRejectedValueOnce(Object.assign(new Error('restricted'), { restricted: true }));
  const result = await verifyCandidates(candidates, { readPage, parse: (_, c) => c, select: x => x, pause: vi.fn(), warn: vi.fn() });
  expect(result.jobs.map(j => j.id)).toEqual(['1', '2']);
  expect(result.restricted).toBe(true);
  expect(readPage).toHaveBeenCalledTimes(3);
});
it('returns no replacement jobs if access is blocked before verification', async () => {
  const result = await verifyCandidates(candidates, { readPage: vi.fn().mockRejectedValue(Object.assign(new Error('restricted'), { restricted: true })), parse: vi.fn(), select: x => x, pause: vi.fn(), warn: vi.fn() });
  expect(result.jobs).toEqual([]); expect(result.restricted).toBe(true);
});
