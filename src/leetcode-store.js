import { doc, runTransaction, writeBatch } from 'firebase/firestore';
import { db } from './firebase';
import { canReadLeetcode, problemAssignment } from './leetcode-model';

export async function ensureDailyProblem(uid, date) {
  if (!canReadLeetcode(uid)) throw new Error('This daily problem is not available for this account.');
  const ref = id => doc(db, 'users', uid, 'maikalRecords', id);
  return runTransaction(db, async transaction => {
    const todayRef = ref(`leetcode_day_${date}`), today = await transaction.get(todayRef);
    if (today.exists()) return today.data();
    const stateRef = ref('leetcode_state'), stateDoc = await transaction.get(stateRef);
    if (!stateDoc.exists()) throw new Error('The problem library is still being prepared. Please try again shortly.');
    const state = stateDoc.data(), index = state.nextIndex || 0;
    if (!Array.isArray(state.problemIds) || !Number.isInteger(index) || index < 0 || index >= state.problemIds.length) throw new Error('Every problem in your imported library has been assigned. Your past problems remain in History.');
    const problemId = state.problemIds[index];
    if (!/^leetcode_problem_\d+$/.test(problemId)) throw new Error('The problem library needs attention.');
    const problemRef = ref(problemId), problem = await transaction.get(problemRef);
    if (!problem.exists()) throw new Error('The next problem is unavailable. Please try again later.');
    const assignment = problemAssignment(problem.data(), date);
    transaction.set(todayRef, assignment);
    transaction.update(stateRef, { nextIndex: index + 1, updatedAt: Date.now() });
    transaction.update(problemRef, { assignedDate: date });
    return assignment;
  });
}
export async function completeDailyProblem(uid, assignment, completed) {
  if (!canReadLeetcode(uid) || !/^leetcode_day_\d{4}-\d{2}-\d{2}$/.test(assignment.id) || !/^leetcode_problem_\d+$/.test(assignment.problemRecordId)) throw new Error('Invalid daily problem.');
  const batch = writeBatch(db), base = ['users', uid, 'maikalRecords'];
  batch.update(doc(db, ...base, assignment.id), { completed: Boolean(completed), updatedAt: Date.now() });
  batch.update(doc(db, ...base, assignment.problemRecordId), { completed: Boolean(completed), updatedAt: Date.now() });
  await batch.commit();
}
