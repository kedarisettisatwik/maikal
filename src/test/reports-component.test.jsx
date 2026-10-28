import { expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReportsSection from '../components/ReportsSection';

it('keeps reports unmounted until expanded, then supports month selection and calendar states', async () => {
  const user = userEvent.setup(), goal = { id: 'read', title: 'Read', goalType: 'checklist', schedule: { type: 'days', days: [4] } };
  render(<ReportsSection goals={[goal]} records={{ 'progress_read_2026-10-08': { value: true } }} date="2026-10-29" />);
  expect(screen.queryByLabelText('Report month')).toBeNull();
  await user.click(screen.getByText('Reports')); await waitFor(() => expect(screen.getByLabelText('Report month')).toBeTruthy());
  let group = screen.getByRole('group', { name: 'Read completion calendar' });
  expect(within(group).getAllByRole('img')).toHaveLength(31);
  expect(within(group).getByLabelText('2026-10-08: Completed').classList.contains('completed')).toBe(true);
  expect(within(group).getByLabelText('2026-10-01: Not completed').classList.contains('not-completed')).toBe(true);
  expect(within(group).getByLabelText('2026-10-02: Not applicable').classList.contains('not-applicable')).toBe(true);
  fireEvent.change(screen.getByLabelText('Report month'), { target: { value: '2026-02' } });
  group = screen.getByRole('group', { name: 'Read completion calendar' }); expect(within(group).getAllByRole('img')).toHaveLength(28);
  await user.click(screen.getByText('Reports')); await waitFor(() => expect(screen.queryByLabelText('Report month')).toBeNull());
});
it('plots daily tracker values with proportional bars and a monthly total', async () => {
  render(<ReportsSection goals={[{ id: 'run', title: 'Run', goalType: 'tracker', trackerUnit: 'time', schedule: { type: 'everyday' } }]} records={{ 'progress_run_2026-10-01': { value: 10 }, 'progress_run_2026-10-02': { value: 20 } }} date="2026-10-29" />);
  await userEvent.click(screen.getByText('Reports')); await waitFor(() => expect(screen.getByRole('group', { name: 'Run daily mins' })).toBeTruthy());
  expect(screen.getByText('30 mins total · 2 days logged')).toBeTruthy();
  expect(screen.getByLabelText('2026-10-01: 10 mins').style.height).toBe('50%'); expect(screen.getByLabelText('2026-10-02: 20 mins').style.height).toBe('100%');
});
