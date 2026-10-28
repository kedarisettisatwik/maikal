import { expect, it } from 'vitest';
import { goalMonthReport, monthDays } from '../reports-model';
it('uses the actual day count, including leap years', () => {
  expect(monthDays('2026-01')).toHaveLength(31); expect(monthDays('2026-04')).toHaveLength(30);
  expect(monthDays('2026-02')).toHaveLength(28); expect(monthDays('2028-02')).toHaveLength(29);
  expect(monthDays('2100-02')).toHaveLength(28); expect(monthDays('2026-13')).toEqual([]);
});
it('distinguishes completed, applicable and non-applicable calendar dates', () => {
  const goal = { id: 'read', goalType: 'checklist', createdDate: '2026-10-01', schedule: { type: 'days', days: [4] } };
  const records = { 'progress_read_2026-10-08': { value: true } };
  const days = goalMonthReport(goal, records, '2026-10');
  expect(days.find(day => day.date === '2026-10-08').state).toBe('completed');
  expect(days.find(day => day.date === '2026-10-01').state).toBe('not-completed');
  expect(days.find(day => day.date === '2026-10-02').state).toBe('not-applicable');
  expect(goalMonthReport(goal, records, '2026-09').every(day => !day.applicable)).toBe(true);
});
it('supports particular dates, ranges, and legacy completion history', () => {
  const goal = { id: 'one', schedule: { type: 'dates', dates: ['2026-10-05'] }, completedDates: ['2026-10-05'] };
  expect(goalMonthReport(goal, {}, '2026-10').filter(day => day.completed)).toHaveLength(1);
  expect(goalMonthReport({ ...goal, schedule: { type: 'range', from: '2026-10-05', to: '2026-10-07' } }, {}, '2026-10').filter(day => day.applicable)).toHaveLength(3);
});
it('uses tracker values by date and ignores values outside the schedule', () => {
  const goal = { id: 'run', goalType: 'tracker', schedule: { type: 'dates', dates: ['2026-10-01', '2026-10-02'] }, trackerValues: { '2026-10-01': 10, '2026-10-03': 500 } };
  const days = goalMonthReport(goal, { 'progress_run_2026-10-02': { value: 20 } }, '2026-10');
  expect(days.slice(0, 3).map(day => day.value)).toEqual([10, 20, 0]);
});
