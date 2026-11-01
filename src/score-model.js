import { due, progress, localDate, offsetDate } from './model';

export const GOAL_POINTS = 10;
const stable = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b))) : item);
const definition = g => ({ title: g.title || 'Goal', goalType: g.goalType || 'checklist', target: g.target ?? null, targetRule: g.targetRule || 'atLeast', schedule: g.schedule || { type: 'everyday' }, createdDate: g.createdDate || '', deleted: Boolean(g.deleted) });
export function withScoreHistory(record, previous, date = localDate()) {
  const history = [...(previous?.scoringHistory || record.scoringHistory || [])];
  if (!history.length && previous) history.push({ from: previous.createdDate || date, ...definition(previous) });
  const revision = { from: date, ...definition(record) };
  const earlier = history.filter(r => r.from < date);
  if (!earlier.length || stable(definition(earlier.at(-1))) !== stable(definition(record))) earlier.push(revision);
  return { ...record, scoringHistory: earlier };
}
export function goalsOnDate(records, date) {
  return Object.values(records).filter(g => g.type === 'goal').map(g => {
    const history = g.scoringHistory;
    if (!history?.length) return g;
    const revision = history.filter(h => h.from <= date).sort((a,b) => a.from.localeCompare(b.from)).at(-1);
    if (!revision) return { ...g, deleted: true };
    const updatedDay = Number.isFinite(g.updatedAt) ? localDate(new Date(g.updatedAt)) : '';
    return updatedDay > revision.from && updatedDay <= date ? g : { ...g, ...revision };
  }).filter(g => due(g, date));
}
export function hasTrackerValue(records, goal, date) {
  const record = records[`progress_${goal.id}_${date}`];
  return record ? !record.deleted && typeof record.value === 'number' : Object.hasOwn(goal.trackerValues || {}, date);
}
export function goalComplete(records, goal, date) {
  if (records[`progress_${goal.id}_${date}`]?.deleted) return false;
  if (goal.goalType !== 'tracker') return Boolean(progress(records, goal, date));
  if (goal.target === '' || goal.target == null || !Number.isFinite(Number(goal.target)) || !hasTrackerValue(records, goal, date)) return false;
  const value = Number(progress(records, goal, date));
  return Number.isFinite(value) && (goal.targetRule === 'atMost' ? value <= Number(goal.target) : value >= Number(goal.target));
}
export function scoreDay(records, date, definitions) {
  const goals = [...(definitions || goalsOnDate(records, date))].sort((a,b) => a.id.localeCompare(b.id));
  const completed = goals.filter(g => goalComplete(records, g, date)).length;
  const bonus = goals.length > 0 && completed === goals.length;
  return { id: `score_${date}`, type: 'score', date, completed, total: goals.length, bonus, points: completed * (bonus ? 12 : GOAL_POINTS), goals: goals.map(g => ({ id: g.id, title: g.title || 'Goal', goalType: g.goalType || 'checklist', ...(g.goalType === 'tracker' ? { target: g.target ?? null, targetRule: g.targetRule || 'atLeast', trackerValues: Object.hasOwn(g.trackerValues || {}, date) ? { [date]: g.trackerValues[date] } : {} } : { completedDates: (g.completedDates || []).filter(d => d === date) }) })) };
}
function historicalGoals(records, date, stored) {
  const eligible = goalsOnDate(records, date), live = new Map(eligible.map(g => [g.id,g]));
  const result = new Map((stored || []).map(g => [g.id,g]));
  for (const [id, prior] of result) {
    const goal = records[id];
    const updatedDay = Number.isFinite(goal?.updatedAt) ? localDate(new Date(goal.updatedAt)) : '';
    if (goal && !live.has(id) && (goal.scoringHistory?.length || goal.deleted && updatedDay && updatedDay <= date)) result.delete(id);
  }
  for (const goal of eligible) {
    const prior = result.get(goal.id);
    if (!prior || goal.scoringHistory?.length) result.set(goal.id, { ...prior, ...goal });
  }
  return [...result.values()];
}
export function scoreUpdates(records, date) {
  const days = new Set([date, offsetDate(-1, new Date(date + 'T12:00:00'))]);
  for (const r of Object.values(records)) {
    if (r.type === 'progress' && r.date <= date) days.add(r.date);
    if (r.type === 'score' && r.date <= date) days.add(r.date);
    if (r.type === 'goal') { for (const d of r.completedDates || []) if (d <= date) days.add(d); for (const d of Object.keys(r.trackerValues || {})) if (d <= date) days.add(d); }
  }
  const updates = [];
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) continue;
    const old = records[`score_${day}`];
    const next = scoreDay(records, day, day < date ? historicalGoals(records, day, old?.goals) : undefined);
    if (!next.total && !old) continue;
    const { updatedAt, deleted, ...previous } = old || {};
    if (old?.deleted || stable(previous) !== stable(next)) updates.push(next);
  }
  return updates;
}
export function scoreSummary(records, date) {
  const today = scoreDay(records, date), updates = scoreUpdates(records, date);
  const days = new Map(Object.values(records).filter(r => r.type === 'score' && !r.deleted && r.date < date).map(r => [r.date, r.points || 0]));
  for (const r of updates) if (r.date < date) days.set(r.date, r.points);
  const yesterdayDate = offsetDate(-1, new Date(date + 'T12:00:00'));
  const yesterday = updates.find(r => r.date === yesterdayDate) || records[`score_${yesterdayDate}`] || scoreDay(records, yesterdayDate);
  const throughYesterday = [...days.values()].reduce((a, b) => a + b, 0);
  return { today, overall: throughYesterday + today.points, yesterday, throughYesterday };
}
export const scoreNudgesKey = uid => `mantra-score-nudges-${uid}`;
export function scoreNudgesEnabled(uid) { try { return localStorage.getItem(scoreNudgesKey(uid)) !== 'off'; } catch { return true; } }
