import {taskEligible,taskCompleteBy,validDay} from './task-model';
import { due, progress, localDate, offsetDate } from './model';

export const percentage=(completed,total)=>total?Math.round(completed/total*100):null;
const stable = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object' ? Object.fromEntries(Object.entries(item).sort(([a],[b]) => a.localeCompare(b))) : item);
export const scoreStartDate = records => { const setting=records.score_settings; return setting?.type==='scoreSettings'&&!setting.deleted&&validDay(setting.startDate)?setting.startDate:''; };
export const restartScoring = date => ({id:'score_settings',type:'scoreSettings',startDate:date});
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
  return Object.values(records).filter(g => g.type === 'goal' && !g.deleted).map(g => {
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
export function scoreDay(records,date,definitions){
 const inPeriod=!scoreStartDate(records)||date>=scoreStartDate(records);
 const goals=[...(inPeriod?(definitions||goalsOnDate(records,date)):[])].filter(g=>!records[g.id]?.deleted).filter(g=>g.goalType!=='tracker'||g.target!=null&&g.target!==''&&Number.isFinite(Number(g.target))).sort((a,b)=>a.id.localeCompare(b.id));
 const tasks=Object.values(records).filter(t=>inPeriod&&t.type==='task'&&taskEligible(t,date)).sort((a,b)=>a.id.localeCompare(b.id));
 const completed=goals.filter(g=>goalComplete(records,g,date)).length+tasks.filter(t=>taskCompleteBy(t,date)).length,total=goals.length+tasks.length;
 return {id:`completion_${date}`,type:'completionScore',schemaVersion:2,date,completed,total,percentage:percentage(completed,total),goals:goals.map(g=>({id:g.id,title:g.title,goalType:g.goalType,createdDate:g.createdDate,schedule:g.schedule,target:g.target??null,targetRule:g.targetRule||'atLeast',trackerValues:Object.hasOwn(g.trackerValues||{},date)?{[date]:g.trackerValues[date]}:{},completedDates:(g.completedDates||[]).filter(d=>d===date)})),tasks:tasks.map(t=>({id:t.id,title:t.title,completed:taskCompleteBy(t,date)}))};
}
function historicalGoals(records, date, stored) {
  const eligible = goalsOnDate(records, date), live = new Map(eligible.map(g => [g.id,g]));
  const result = new Map((stored || []).map(g => [g.id,g]));
  for (const [id, prior] of result) {
    const goal = records[id];
    const updatedDay = Number.isFinite(goal?.updatedAt) ? localDate(new Date(goal.updatedAt)) : '';
    if (goal?.deleted || goal && !live.has(id) && (goal.scoringHistory?.length || goal.deleted && updatedDay && updatedDay <= date)) result.delete(id);
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
    if (r.type==='task'&&r.deadline&&r.deadline<=date)days.add(r.deadline);
    if (r.type === 'progress' && r.date <= date) days.add(r.date);
    if (['score','completionScore'].includes(r.type) && r.date <= date) days.add(r.date);
    if (r.type === 'goal') { for (const d of r.completedDates || []) if (d <= date) days.add(d); for (const d of Object.keys(r.trackerValues || {})) if (d <= date) days.add(d); }
  }
  const updates = [];
  for (const day of days) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || scoreStartDate(records) && day<scoreStartDate(records)) continue;
    const old = records[`completion_${day}`];
    const next = scoreDay(records, day, day < date ? historicalGoals(records, day, old?.goals||records[`score_${day}`]?.goals) : undefined);
    if (!next.total && !old) continue;
    const { updatedAt, deleted, ...previous } = old || {};
    if (old?.deleted || stable(previous) !== stable(next)) updates.push(next);
  }
  return updates;
}
export function scoreSummary(records,date){
 const recordsList=Object.values(records),today=scoreDay(records,date),yesterdayDate=offsetDate(-1,new Date(date+'T12:00:00'));
 const goalStarts=recordsList.filter(r=>r.type==='goal'&&!r.deleted).flatMap(r=>[r.createdDate,...(r.scoringHistory||[]).map(h=>h.from)]).filter(d=>validDay(d)&&d<=date);
 const days=new Set([date]);const first=[goalStarts.sort()[0],scoreStartDate(records)].filter(Boolean).sort().at(-1);if(first){let d=first;while(d<=date){days.add(d);d=offsetDate(1,new Date(d+'T12:00:00'));}}
 for(const r of recordsList){const d=r.type==='task'?r.deadline:['score','completionScore'].includes(r.type)?r.date:null;if(validDay(d)&&d<=date)days.add(d);}
 let total=0,completed=0,pastCompleted=0,pastTotal=0;
 for(const day of days){if(scoreStartDate(records)&&day<scoreStartDate(records))continue;const old=records[`completion_${day}`]||records[`score_${day}`];const row=day===date?today:scoreDay(records,day,historicalGoals(records,day,old?.goals));total+=row.total;completed+=row.completed;if(day<date){pastTotal+=row.total;pastCompleted+=row.completed;}}
 const yesterday=scoreDay(records,yesterdayDate,historicalGoals(records,yesterdayDate,(records[`completion_${yesterdayDate}`]||records[`score_${yesterdayDate}`])?.goals));
 return {today,overall:percentage(completed,total),overallCompleted:completed,overallTotal:total,yesterday,throughYesterday:percentage(pastCompleted,pastTotal)};
}
export const scoreNudgesKey = uid => `mantra-score-nudges-${uid}`;
export function scoreNudgesEnabled(uid) { try { return localStorage.getItem(scoreNudgesKey(uid)) !== 'off'; } catch { return true; } }
