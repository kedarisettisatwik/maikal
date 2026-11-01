import { describe, expect, it } from 'vitest';
import { goalComplete, scoreDay, scoreSummary, scoreUpdates, withScoreHistory } from '../score-model';
const day = '2026-11-01';
const goal = (id, extra = {}) => ({ id, type: 'goal', title: id, goalType: 'checklist', createdDate: day, schedule: { type: 'everyday' }, ...extra });
const value = (id, amount, date = day) => ({ id: `progress_${id}_${date}`, type: 'progress', date, goalId: id, value: amount, updatedAt: 3 });
function records(...items) { return Object.fromEntries(items.map(i => [i.id, i])); }
describe('daily goal scoring', () => {
  it('awards ten per goal and applies a single daily bonus without compounding', () => {
    let r = records(goal('a'), goal('b'), value('a', true));
    expect(scoreDay(r, day).points).toBe(10);
    r[value('b', true).id] = value('b', true);
    const score = scoreDay(r, day); expect(score.points).toBe(24); expect(score.bonus).toBe(true);
    r[score.id] = { ...score, updatedAt: 4 };
    expect(scoreUpdates(r, day)).toEqual([]); expect(scoreSummary(r, day).overall).toBe(24);
    r[value('b', false).id] = value('b', false); expect(scoreDay(r, day).points).toBe(10);
  });
  it('uses inclusive tracker thresholds and requires an entered value, including zero', () => {
    const pushups = goal('p', { goalType: 'tracker', target: 40, targetRule: 'atLeast' });
    expect(goalComplete(records(pushups, value('p', 40)), pushups, day)).toBe(true);
    expect(goalComplete(records(pushups, value('p', 39)), pushups, day)).toBe(false);
    const limit = goal('l', { goalType: 'tracker', target: 0, targetRule: 'atMost' });
    expect(goalComplete(records(limit), limit, day)).toBe(false);
    expect(goalComplete(records(limit, value('l', 0)), limit, day)).toBe(true);
    expect(goalComplete(records(limit, { ...value('l', 0), deleted: true }), limit, day)).toBe(false);
    expect(goalComplete(records(pushups, value('p', 40)), { ...pushups, target: null }, day)).toBe(false);
  });
  it('counts only scheduled goals and never grants a bonus for an empty day', () => {
    const r = records(goal('future', { createdDate: '2026-11-02' }), goal('monday', { schedule: { type: 'days', days: [1] } }), goal('removed', { deleted: true }));
    expect(scoreDay(r, day)).toMatchObject({ total: 0, completed: 0, bonus: false, points: 0 });
  });
  it('preserves previous-day targets and totals when today’s goal is changed or deleted', () => {
    const yesterday = '2026-10-31';
    const original = goal('p', { createdDate: yesterday, goalType: 'tracker', target: 40 });
    const edited = withScoreHistory({ ...original, target: 50 }, original, day);
    let r = records(edited, value('p', 45, yesterday), value('p', 50));
    let summary = scoreSummary(r, day); expect(summary.yesterday).toMatchObject({ points: 12, total: 1, completed: 1 }); expect(summary.overall).toBe(24); expect(summary.throughYesterday).toBe(12);
    r[summary.yesterday.id] = { ...summary.yesterday, updatedAt: 4 };
    r.p = withScoreHistory({ ...edited, deleted: true }, edited, day);
    summary = scoreSummary(r, day); expect(summary.today.points).toBe(0); expect(summary.yesterday.points).toBe(12); expect(summary.overall).toBe(12);
    r[value('p', 39, yesterday).id] = value('p', 39, yesterday); expect(scoreSummary(r, day).yesterday.points).toBe(0);
  });
  it('handles year rollover and Firestore key ordering without repeated writes', () => {
    const r = records(goal('a', { createdDate: '2026-12-31' }), value('a', true, '2026-12-31'));
    expect(scoreSummary(r, '2027-01-01').yesterday.date).toBe('2026-12-31');
    const saved = scoreDay(r, '2026-12-31'); r[saved.id] = Object.fromEntries(Object.entries({ ...saved, updatedAt: 4 }).reverse());
    expect(scoreUpdates(r, '2026-12-31')).toEqual([]);
  });
});

it('includes goals arriving from another diary without replacing the saved historical target', () => {
 const date='2026-11-02', day='2026-11-01';
 const a=goal('a',{createdDate:day,target:40,goalType:'tracker'}),b=goal('b',{createdDate:day});
 const old=scoreDay(records(a,value('a',40,day)),day);
 const merged=records({...a,target:50},b,value('a',40,day),value('b',true,day),{...old,updatedAt:4});
 expect(scoreSummary(merged,date).yesterday).toMatchObject({completed:2,total:2,points:24});
 expect(scoreSummary(merged,date).yesterday.goals.find(g=>g.id==='a').target).toBe(40);
});
it('honours older-website edits today while retaining yesterday’s revision', () => {
 const g=withScoreHistory(goal('g',{createdDate:'2026-10-31',goalType:'tracker',target:40}),undefined,'2026-10-31');
 const edited={...g,deleted:true,updatedAt:new Date('2026-11-01T12:00:00').getTime()};
 const r=records(edited,value('g',40,'2026-10-31'));
 expect(scoreSummary(r,'2026-11-01').today.total).toBe(0);
 expect(scoreSummary(r,'2026-11-01').yesterday.points).toBe(12);
});
