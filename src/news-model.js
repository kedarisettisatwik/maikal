export const newsCategories = [
  { id: 'india', label: 'India' },
  { id: 'world', label: 'World' },
  { id: 'technology', label: 'Technology' },
  { id: 'business', label: 'Business' },
  { id: 'layoffs', label: 'Layoffs' },
];
export function safeNewsUrl(value) {
  if (typeof value !== 'string') return '';
  try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : ''; } catch { return ''; }
}
export function newsTime(value) {
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) + ' IST' : '';
}
export const isRecentNews = (article, now = Date.now()) => Number.isFinite(article.publishedAt) && article.publishedAt > now - 48 * 3600000 && article.publishedAt <= now + 3600000;
