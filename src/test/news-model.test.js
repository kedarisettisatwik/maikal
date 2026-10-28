import { describe, expect, it } from 'vitest';
import { buildEdition, canonicalUrl, normalizeArticle, plainFeedContent } from '../../scripts/news-model.mjs';
import { safeNewsUrl } from '../news-model';

const now = Date.parse('2026-10-29T00:30:00Z');
const feed = { id: 'technology', name: 'Example News', sourceUrl: 'https://example.com' };
const item = { title: 'A &amp; B announce a study', link: 'https://example.com/story?utm_source=rss', pubDate: 'Wed, 28 Oct 2026 12:00:00 GMT', content: '<p>A short summary. <a href="https://example.com/reports/study.pdf">Official study report</a></p>' };
describe('news normalization', () => {
  it('keeps attribution and genuine report links while stripping HTML', () => {
    const article = normalizeArticle(item, feed, now);
    expect(article.title).toBe('A & B announce a study');
    expect(article.source).toBe('Example News');
    expect(article.url).toBe('https://example.com/story');
    expect(article.summary).not.toContain('<');
    expect(article.references).toEqual([{ label: 'Official study report', url: 'https://example.com/reports/study.pdf' }]);
  });
  it('rejects unsafe links, unknown dates, expired and future stories', () => {
    expect(safeNewsUrl('javascript:alert(1)')).toBe('');
    expect(safeNewsUrl('https://user:password@example.com/')).toBe('');
    expect(normalizeArticle({ ...item, link: 'javascript:alert(1)' }, feed, now)).toBeNull();
    expect(normalizeArticle({ ...item, pubDate: '' }, feed, now)).toBeNull();
    expect(normalizeArticle({ ...item, pubDate: '2026-10-20T00:00:00Z' }, feed, now)).toBeNull();
    expect(normalizeArticle({ ...item, pubDate: '2026-11-01T00:00:00Z' }, feed, now)).toBeNull();
    expect(plainFeedContent('<script>bad()</script><b>Safe</b>').text).toBe('Safe');
  });
  it('deduplicates URLs and combines categories', () => {
    const edition = buildEdition([{ feed, items: [item, item] }, { feed: { ...feed, id: 'business' }, items: [item] }], now);
    expect(edition.articles).toHaveLength(1);
    expect(edition.articles[0].categories).toEqual(['technology', 'business']);
    expect(edition.editionDate).toBe('2026-10-29');
    expect(canonicalUrl(item.link + '#top')).toBe('https://example.com/story');
  });
  it('preserves only recent stories from a failed category', () => {
    const previous = buildEdition([{ feed, items: [item] }], now);
    const edition = buildEdition([{ feed, error: true }], now + 1000, previous);
    expect(edition.articles).toHaveLength(1);
    expect(edition.sources[0].status).toBe('unavailable');
    expect(buildEdition([{ feed, error: true }], now + 3 * 86400000, previous).articles).toHaveLength(0);
  });
  it('limits each category to three fresh stories', () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ ...item, link: `https://example.com/story/${i}` }));
    expect(buildEdition([{ feed, items }], now).articles).toHaveLength(3);
  });
});
