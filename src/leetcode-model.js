import { NEWS_READER_UID } from './news-model.js';
export const canReadLeetcode = uid => uid === NEWS_READER_UID;
export const leetcodeDay = (now = new Date()) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
export function leetcodeLink(value) {
  try { const url = new URL(value); return url.protocol === 'https:' && /^(www\.)?leetcode\.com$/i.test(url.hostname) && url.pathname.startsWith('/problems/') && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function problemAssignment(problem, date) {
  if (!leetcodeLink(problem.link)) throw new Error('This problem has an invalid LeetCode link.');
  return { id: `leetcode_day_${date}`, type: 'leetcodeDaily', date, problemRecordId: problem.recordId || problem.id, problemId: problem.problemId || problem.id, title: problem.title, difficulty: problem.difficulty, tags: Array.isArray(problem.tags) ? problem.tags : [], link: problem.link, premium_only: Boolean(problem.premium_only), completed: problem.completed === true, updatedAt: Date.now() };
}
