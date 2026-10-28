import { plainText } from './text.js';
import { NEWS_READER_UID } from './news-model.js';
export const canReadJobs = uid => uid === NEWS_READER_UID;
export const JOB_PROFILE = { graduationYear: 2024, experienceYears: 2, location: 'India', limit: 10 };
export function linkedInJobUrl(value) {
  if (typeof value !== 'string') return '';
  try { const url = new URL(value); if (url.protocol !== 'https:' || !/(^|\.)linkedin\.com$/i.test(url.hostname) || url.username || url.password || !/^\/jobs\/view\//.test(url.pathname)) return ''; url.search = ''; url.hash = ''; return url.href; } catch { return ''; }
}
export function jobDate(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' }) : 'Not disclosed';
}

export function cleanJobText(job) {
  const result = { ...job };
  for (const key of ['title', 'company', 'location', 'ctc', 'listedPay', 'experience', 'graduation', 'summary', 'matchNote', 'role']) result[key] = plainText(job[key]);
  return result;
}
