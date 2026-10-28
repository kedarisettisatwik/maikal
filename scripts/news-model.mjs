import { createHash } from 'node:crypto';
import { Parser } from 'htmlparser2';
import { isRecentNews, safeNewsUrl } from '../src/news-model.js';

export function plainFeedContent(html = '') {
  let text = '', skip = 0, currentLink = null;
  const links = [];
  const parser = new Parser({
    onopentag(name, attrs) {
      if (['script', 'style'].includes(name)) skip++;
      if (['p', 'br', 'li', 'div'].includes(name)) text += ' ';
      if (name === 'a') currentLink = { url: safeNewsUrl(attrs.href), label: '' };
    },
    ontext(value) { if (!skip) { text += value; if (currentLink) currentLink.label += value; } },
    onclosetag(name) {
      if (['script', 'style'].includes(name)) skip = Math.max(0, skip - 1);
      if (name === 'a' && currentLink) { if (currentLink.url) links.push(currentLink); currentLink = null; }
      if (['p', 'li', 'div'].includes(name)) text += ' ';
    },
  }, { decodeEntities: true });
  parser.write(String(html)); parser.end();
  return { text: text.replace(/\s+/g, ' ').trim(), links };
}
export function canonicalUrl(value) {
  const link = safeNewsUrl(value);
  if (!link) return '';
  const url = new URL(link); url.hash = '';
  for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid|ocid)$/i.test(key)) url.searchParams.delete(key);
  return url.href;
}
export function normalizeArticle(item, feed, now = Date.now()) {
  const url = canonicalUrl(item.link), title = plainFeedContent(item.title).text.slice(0, 240);
  const publishedAt = Date.parse(item.isoDate || item.pubDate || item.published || '');
  if (!url || !title || !isRecentNews({ publishedAt }, now)) return null;
  const content = plainFeedContent(item.content || item.description || item.contentSnippet || '');
  const originalSource = typeof item.source === 'string' ? item.source : item.source?._ || item.source?.title;
  const source = plainFeedContent(originalSource || feed.name).text.slice(0, 100);
  const sourceUrl = safeNewsUrl(item.source?.$?.url || feed.sourceUrl) || new URL(url).origin;
  // Aggregator snippets often repeat the headline and a list of related headlines.
  const summary = content.text.toLowerCase().startsWith(title.toLowerCase()) ? '' : content.text.slice(0, 180);
  const references = content.links.filter(link => canonicalUrl(link.url) !== url && /report|research|study|survey|\.pdf(?:\?|$)|\/data\//i.test(link.label + ' ' + link.url)).slice(0, 3).map(link => ({ label: link.label.trim().slice(0, 100) || 'Reference report', url: link.url }));
  return { id: createHash('sha256').update(url).digest('hex').slice(0, 24), title, url, source, sourceUrl, summary, publishedAt, categories: [feed.id], references };
}
export function buildEdition(results, now = Date.now(), previous = null) {
  const articles = new Map(), sources = [];
  function include(article) {
    const old = articles.get(article.id);
    if (old) old.categories = [...new Set([...old.categories, ...article.categories])];
    else articles.set(article.id, { ...article, categories: [...article.categories] });
  }
  for (const result of results) {
    if (result.error) {
      sources.push({ category: result.feed.id, name: result.feed.name, status: 'unavailable' });
      for (const article of (previous?.articles || []).filter(article => article.categories.includes(result.feed.id) && isRecentNews(article, now)).sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 3)) include({ ...article, categories: [result.feed.id] });
      continue;
    }
    sources.push({ category: result.feed.id, name: result.feed.name, status: 'updated' });
    result.items.map(item => normalizeArticle(item, result.feed, now)).filter(Boolean).sort((a, b) => b.publishedAt - a.publishedAt).slice(0, 3).forEach(include);
  }
  const editionDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(now));
  return { schemaVersion: 1, editionDate, fetchedAt: now, timezone: 'Asia/Kolkata', articles: [...articles.values()].sort((a, b) => b.publishedAt - a.publishedAt), sources };
}
