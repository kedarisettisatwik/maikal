import { cloudEnabled } from './storage';

export function importNativeCompletions(actions, uid, getRecords, save) {
  const acknowledged = [];
  for (const action of [...actions].reverse().sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))) {
    if (action.uid !== uid && !(cloudEnabled(uid) && action.uid === 'local')) continue;
    if (!action.id || !action.goalId || !/^\d{4}-\d{2}-\d{2}$/.test(action.date) || !Number.isFinite(action.timestamp)) continue;
    const records = getRecords(), goal = records[action.goalId];
    if (!goal) continue; // A cloud snapshot may still be loading.
    if (goal.deleted || goal.type !== 'goal') { acknowledged.push(action.id); continue; }
    const tracker=goal.goalType==='tracker';
    if(tracker&&(!Number.isFinite(action.value)||action.value<0||action.value>1e9)){acknowledged.push(action.id);continue;}
    if(!tracker&&Object.prototype.hasOwnProperty.call(action,'value')){acknowledged.push(action.id);continue;}
    const id = `progress_${goal.id}_${action.date}`, existing = records[id];
    if (!existing || existing.updatedAt < action.timestamp) save({ id, type: 'progress', goalId: goal.id, date: action.date, value: tracker ? action.value : true });
    acknowledged.push(action.id);
  }
  return acknowledged;
}
