import { leetcodeLink } from '../src/leetcode-model.js';

export function normalizeProblems(data) {
  if (!Array.isArray(data) || !data.length || data.length > 20000) throw new Error('Expected a non-empty problem array.');
  const seen = new Set();
  return data.map(problem => {
    const problemId = String(problem.id);
    if (!/^\d+$/.test(problemId) || seen.has(problemId)) throw new Error('Problem IDs must be unique numbers.');
    seen.add(problemId);
    if (typeof problem.title !== 'string' || !problem.title.trim() || !['Easy', 'Medium', 'Hard'].includes(problem.difficulty) || !leetcodeLink(problem.link)) throw new Error(`Invalid problem ${problemId}.`);
    return { id: problemId, recordId: `leetcode_problem_${problemId}`, type: 'leetcodeProblem', problemId, title: problem.title.trim(), difficulty: problem.difficulty, tags: Array.isArray(problem.tags) ? [...new Set(problem.tags.filter(tag => typeof tag === 'string'))] : [], link: leetcodeLink(problem.link), premium_only: Boolean(problem.premium_only), completed: problem.completed === true };
  });
}
export function catalogOrder(problems) {
  return [...problems].sort((a, b) => Number(a.premium_only) - Number(b.premium_only) || Number(a.problemId) - Number(b.problemId)).map(problem => problem.recordId);
}
