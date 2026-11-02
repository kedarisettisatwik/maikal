import {goalProgressSummary} from '../goal-progress';
import {mergeRecords} from '../model';
import { describe, expect, it } from 'vitest';
import { goalComplete, scoreDay, scoreSummary, scoreUpdates, withScoreHistory, restartScoring } from '../score-model';
const day = '2026-11-01';
const goal = (id, extra = {}) => ({ id, type: 'goal', title: id, goalType: 'checklist', createdDate: day, schedule: { type: 'everyday' }, ...extra });
const value = (id, amount, date = day) => ({ id: `progress_${id}_${date}`, type: 'progress', date, goalId: id, value: amount, updatedAt: 3 });
function records(...items) { return Object.fromEntries(items.map(i => [i.id, i])); }
describe('daily goal scoring', () => {
  it('calculates a percentage without points or a completion multiplier', () => {
    let r = records(goal('a'), goal('b'), value('a', true));
    expect(scoreDay(r, day).percentage).toBe(50);
    r[value('b', true).id] = value('b', true);
    const score = scoreDay(r, day); expect(score.percentage).toBe(100); expect(score.points).toBeUndefined();
    r[score.id] = { ...score, updatedAt: 4 };
    expect(scoreUpdates(r, day)).toEqual([]); expect(scoreSummary(r, day).overall).toBe(100);
    r[value('b', false).id] = value('b', false); expect(scoreDay(r, day).percentage).toBe(50);
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
    expect(scoreDay(r, day)).toMatchObject({ total: 0, completed: 0, percentage:null });
  });
  it('preserves edited historical targets but removes deleted goals from every score', () => {
    const yesterday = '2026-10-31';
    const original = goal('p', { createdDate: yesterday, goalType: 'tracker', target: 40 });
    const edited = withScoreHistory({ ...original, target: 50 }, original, day);
    let r = records(edited, value('p', 45, yesterday), value('p', 50));
    let summary = scoreSummary(r, day); expect(summary.yesterday).toMatchObject({ percentage:100, total: 1, completed: 1 }); expect(summary.overall).toBe(100); expect(summary.throughYesterday).toBe(100);
    r[summary.yesterday.id] = { ...summary.yesterday, updatedAt: 4 };
    r.p = withScoreHistory({ ...edited, deleted: true }, edited, day);
    summary = scoreSummary(r, day); expect(summary.today.percentage).toBeNull(); expect(summary.yesterday.percentage).toBeNull(); expect(summary.overall).toBeNull();
    r[value('p', 39, yesterday).id] = value('p', 39, yesterday); expect(scoreSummary(r, day).yesterday.percentage).toBeNull();
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
 expect(scoreSummary(merged,date).yesterday).toMatchObject({completed:2,total:2,percentage:100});
 expect(scoreSummary(merged,date).yesterday.goals.find(g=>g.id==='a').target).toBe(40);
});
it('honours deletion from the older website across all scoring dates', () => {
 const g=withScoreHistory(goal('g',{createdDate:'2026-10-31',goalType:'tracker',target:40}),undefined,'2026-10-31');
 const edited={...g,deleted:true,updatedAt:new Date('2026-11-01T12:00:00').getTime()};
 const r=records(edited,value('g',40,'2026-10-31'));
 expect(scoreSummary(r,'2026-11-01').today.total).toBe(0);
 expect(scoreSummary(r,'2026-11-01').yesterday.percentage).toBeNull();
});

it('recalculates deletion against persisted snapshots and shows empty after all goals are deleted',()=>{
 const yesterday='2026-10-31', a=goal('a',{createdDate:yesterday}), b=goal('b',{createdDate:yesterday});
 const r=records(a,b,value('a',true,yesterday),value('a',true));const old=scoreDay(r,yesterday);r[old.id]=old;
 expect(scoreSummary(r,day).overall).toBe(50);
 r.b=withScoreHistory({...b,deleted:true},b,day);expect(scoreSummary(r,day)).toMatchObject({overall:100,overallTotal:2,overallCompleted:2});
 r.a=withScoreHistory({...a,deleted:true},a,day);expect(scoreSummary(r,day)).toMatchObject({overall:null,overallTotal:0,today:{percentage:null,total:0}});
 expect(scoreUpdates(r,day).find(x=>x.date===yesterday)).toMatchObject({total:0,percentage:null});
});
it('start over excludes old scores but immediately counts today and persists across later days',()=>{
 const a=goal('a',{createdDate:'2026-10-01'}),b=goal('b',{createdDate:'2026-10-01'});
 const r=records(a,b,value('a',true),restartScoring(day));
 const old=scoreDay(records(a,b),'2026-10-31');r[old.id]=old;
 expect(scoreSummary(r,day)).toMatchObject({overall:50,overallTotal:2,overallCompleted:1,today:{percentage:50},yesterday:{total:0}});
 expect(scoreUpdates(r,day).every(x=>x.date>=day)).toBe(true);
 expect(scoreSummary(r,'2026-11-02')).toMatchObject({overall:25,overallTotal:4,overallCompleted:1});
 const copy=JSON.parse(JSON.stringify(r));expect(scoreSummary(copy,day).overall).toBe(50);
 expect(copy.a).toEqual(a);expect(copy['progress_a_'+day].value).toBe(true);
 copy.score_settings=restartScoring('2026-11-02');expect(scoreSummary(copy,'2026-11-02')).toMatchObject({overall:0,overallTotal:2});
});

it('removes deleted targets from the home progress denominator and merges reset settings across sync',()=>{
 const a=goal('a'),b=goal('b',{deleted:true});const r=records(a,b,value('a',true));
 expect(goalProgressSummary([a,b],r,day)).toEqual({total:1,completed:1,percent:100});
 expect(goalProgressSummary([{...a,deleted:true},b],r,day)).toEqual({total:0,completed:0,percent:0});
 const setting={...restartScoring(day),updatedAt:10};const merged=mergeRecords(r,{},[setting]);
 expect(merged.records.score_settings).toEqual(setting);expect(scoreSummary(merged.records,day).overall).toBe(100);
});
