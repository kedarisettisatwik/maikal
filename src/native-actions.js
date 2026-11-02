import {localDate} from './model';
import { cloudEnabled } from './storage';

export function importNativeCompletions(actions, uid, getRecords, save) {
  const acknowledged = [];
  for (const action of [...actions].reverse().sort((a,b)=>(b.timestamp||0)-(a.timestamp||0))) {
    if (action.uid !== uid && !(cloudEnabled(uid) && action.uid === 'local')) continue;
    if (!action.id || !action.goalId || !/^\d{4}-\d{2}-\d{2}$/.test(action.date) || !Number.isFinite(action.timestamp)) continue;
    const records = getRecords(), goal = records[action.goalId];
    if (!goal) continue; // A cloud snapshot may still be loading.
    if (goal.deleted || !['goal','task'].includes(goal.type)) { acknowledged.push(action.id); continue; }
    if(action.focusDelta){
      if(goal.type==='goal'&&(goal.goalType!=='tracker'||goal.trackerUnit!=='time')){acknowledged.push(action.id);continue;}
      if(!Number.isFinite(action.minutes)||action.minutes<0||action.minutes>1e9){acknowledged.push(action.id);continue;}
      const id=`progress_${goal.id}_${action.date}`,old=records[id];if((goal.type==='task'?goal.timeManualAt:old?.manualTotalAt)>=action.timestamp){acknowledged.push(action.id);continue;}if(!(old?.focusReceipts||[]).includes(action.id)){if((Number(old?.value)||0)+action.minutes>1e9)throw Error('Focus progress exceeds the supported total. Adjust the total before retrying.');save({...old,id,type:'progress',goalId:goal.id,date:action.date,value:(Number(old?.value)||0)+action.minutes,focusReceipts:[...(old?.focusReceipts||[]),action.id]});}
      acknowledged.push(action.id);continue;
    }
    if(goal.type==='task'){if(!action.hasOwnProperty('value')&&action.timestamp>=(goal.updatedAt||0))save({...goal,completed:true,completedAt:action.timestamp,completedDate:action.completedDate||localDate(new Date(action.timestamp))});acknowledged.push(action.id);continue;}
    if(goal.managedBy==='screenTime'){acknowledged.push(action.id);continue;}
    const tracker=goal.goalType==='tracker';
    if(tracker&&(!Number.isFinite(action.value)||action.value<0||action.value>1e9)){acknowledged.push(action.id);continue;}
    if(!tracker&&Object.prototype.hasOwnProperty.call(action,'value')){acknowledged.push(action.id);continue;}
    const id = `progress_${goal.id}_${action.date}`, existing = records[id];
    if (!existing || existing.updatedAt < action.timestamp) {
      const covered=actions.filter(a=>a.focusDelta&&a.uid===action.uid&&a.goalId===action.goalId&&a.date===action.date&&a.timestamp<=action.timestamp).map(a=>a.id);
      save({ ...existing,id, type: 'progress', goalId: goal.id, date: action.date, value: tracker ? action.value : true,...(covered.length?{focusReceipts:[...new Set([...(existing?.focusReceipts||[]),...covered])]}:{}),...(action.manualTotal?{manualTotalAt:action.timestamp}:{}) });
    }
    acknowledged.push(action.id);
  }
  return acknowledged;
}
