import { expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
vi.mock('../useLeetcode', () => ({ default: () => ({ date: '2026-10-29', history: [], loading: false }) }));
import { LeetcodeEdition } from '../components/LeetcodeSection';
const today = { id: 'leetcode_day_2026-10-29', problemRecordId: 'leetcode_problem_1', title: 'Two Sum', difficulty: 'Easy', tags: ['Array', 'Hash Table'], link: 'https://leetcode.com/problems/two-sum/', completed: false, date: '2026-10-29' };
it('renders the exact heading, problem fields, history dropdown and completion control', () => {
  const toggle = vi.fn(); render(<LeetcodeEdition date="2026-10-29" today={today} history={[{ ...today, id: 'old', date: '2026-10-28', title: 'Past problem', completed: true }]} toggle={toggle} />);
  expect(screen.getByRole('heading', { name: 'leetcode - problem of the day' })).toBeTruthy(); expect(screen.getAllByText('Easy')).toHaveLength(2); expect(screen.getAllByText('Hash Table')).toHaveLength(2);
  expect(screen.getAllByRole('link', { name: /Open problem on LeetCode/ })[0].getAttribute('href')).toBe(today.link);
  fireEvent.click(screen.getByLabelText('Mark Two Sum completed')); expect(toggle).toHaveBeenCalledWith(today, true);
  expect(screen.getByText('History (1)').closest('details')).toBeTruthy(); expect(screen.getByText('2026-10-28')).toBeTruthy();
});
