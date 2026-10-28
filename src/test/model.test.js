import { describe, expect, it } from 'vitest';
import { due, expenseCategories, mergeRecords, offsetDate, progress, transactionTotals, validateSchedule } from '../model';

describe('daily schedules and progress', () => {
  it('handles daily, weekdays, dates, inclusive ranges, and creation dates', () => {
    expect(due({ schedule: { type: 'everyday' } }, '2026-10-29')).toBe(true);
    expect(due({ schedule: { type: 'days', days: [4] } }, '2026-10-29')).toBe(true);
    expect(due({ schedule: { type: 'days', days: [1] } }, '2026-10-29')).toBe(false);
    expect(due({ schedule: { type: 'dates', dates: ['2026-10-28'] } }, '2026-10-29')).toBe(false);
    expect(due({ schedule: { type: 'range', from: '2026-10-28', to: '2026-10-29' } }, '2026-10-29')).toBe(true);
    expect(due({ createdDate: '2026-10-29', schedule: { type: 'everyday' } }, '2026-10-28')).toBe(false);
    expect(offsetDate(-1, new Date(2026, 0, 1, 12))).toBe('2025-12-31');
  });
  it('rejects empty weekdays and reversed ranges', () => {
    expect(() => validateSchedule({ type: 'days', days: [] })).toThrow('weekday');
    expect(() => validateSchedule({ type: 'range', from: '2026-10-29', to: '2026-10-28' })).toThrow('valid');
  });
  it('keeps tracker values separate by date and reads the existing HTML data format', () => {
    const g = { id: 'g', goalType: 'tracker', trackerValues: { '2026-10-28': 25 } };
    const records = { progress_g_2026_ignored: {}, 'progress_g_2026-10-29': { value: 50 } };
    expect(progress(records, g, '2026-10-28')).toBe(25);
    expect(progress(records, g, '2026-10-29')).toBe(50);
  });
});
describe('money and sync', () => {
  it('calculates integer-cent totals and expense-only category shares', () => {
    const tx = [{ kind: 'income', amount: 10000, categoryId: 'salary' }, { kind: 'expense', amount: 750, categoryId: 'food' }, { kind: 'expense', amount: 250, categoryId: 'travel' }];
    expect(transactionTotals(tx)).toEqual({ income: 10000, expense: 1000 });
    expect(expenseCategories(tx).map(c => [c.id, c.amount])).toEqual([['food', 750], ['travel', 250]]);
    expect(expenseCategories([])).toEqual([]);
  });
  it('keeps newer pending edits and accepts remote tombstones', () => {
    const result = mergeRecords({ a: { id: 'a', type: 'goal', updatedAt: 3 }, b: { id: 'b', type: 'goal', updatedAt: 1 } }, { a: true, b: true }, [{ id: 'a', type: 'goal', updatedAt: 2 }, { id: 'b', type: 'goal', deleted: true, updatedAt: 4 }]);
    expect(result.records.a.updatedAt).toBe(3); expect(result.dirty.a).toBe(true);
    expect(result.records.b.deleted).toBe(true); expect(result.dirty.b).toBeUndefined();
  });
});
