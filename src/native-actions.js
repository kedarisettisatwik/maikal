import { cloudEnabled } from './storage';

export function importNativeCompletions(actions, uid, getRecords, save) {
  const acknowledged = [];
  for (const action of actions) {
    if (action.uid !== uid && !(cloudEnabled(uid) && action.uid === 'local')) continue;
    if (!action.id || !action.goalId || !/^\d{4}-\d{2}-\d{2}$/.test(action.date) || !Number.isFinite(action.timestamp)) continue;
    const records = getRecords(), goal = records[action.goalId];
    if (!goal) continue; // A cloud snapshot may still be loading.
    if (goal.deleted || goal.type !== 'goal' || goal.goalType === 'tracker') { acknowledged.push(action.id); continue; }
    const id = `progress_${goal.id}_${action.date}`, existing = records[id];
    if (!existing || existing.updatedAt < action.timestamp) save({ id, type: 'progress', goalId: goal.id, date: action.date, value: true });
    acknowledged.push(action.id);
  }
  return acknowledged;
}
