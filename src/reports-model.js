import { due, progress } from './model';

export function monthDays(month) {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return [];
  const year = Number(match[1]), number = Number(match[2]);
  if (year < 1900 || year > 9999 || number < 1 || number > 12) return [];
  const count = new Date(year, number, 0).getDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}
export function goalMonthReport(goal, records, month) {
  return monthDays(month).map(date => {
    const applicable = due(goal, date), raw = progress(records, goal, date);
    const value = applicable && Number.isFinite(Number(raw)) ? Math.max(0, Number(raw)) : 0;
    const completed = applicable && (goal.goalType === 'tracker' ? value > 0 : Boolean(raw));
    return { date, applicable, completed, value, state: !applicable ? 'not-applicable' : completed ? 'completed' : 'not-completed' };
  });
}
