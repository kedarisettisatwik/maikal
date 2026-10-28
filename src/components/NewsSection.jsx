import useNews from '../useNews';
import { isRecentNews, newsCategories, newsTime, safeNewsUrl } from '../news-model';

function NewsArticle({ article }) {
  const link = safeNewsUrl(article.url), sourceUrl = safeNewsUrl(article.sourceUrl);
  if (!link) return null;
  const references = Array.isArray(article.references) ? article.references.filter(reference => safeNewsUrl(reference.url)).slice(0, 3) : [];
  return <article className="news-article"><h4><a href={link} target="_blank" rel="noopener noreferrer">{article.title}</a></h4>{article.summary && <p className="news-summary">{article.summary}</p>}<div className="news-byline">{sourceUrl ? <a href={sourceUrl} target="_blank" rel="noopener noreferrer">{article.source}</a> : <span>{article.source}</span>}<span>{newsTime(article.publishedAt)}</span></div><a className="news-read" href={link} target="_blank" rel="noopener noreferrer">Read original coverage ↗</a>{references.length > 0 && <div className="news-references"><small>REFERENCE REPORTS & RELATED SOURCES</small><ul>{references.map(reference => <li key={reference.url}><a href={safeNewsUrl(reference.url)} target="_blank" rel="noopener noreferrer">{reference.label || 'Reference report'} ↗</a></li>)}</ul></div>}</article>;
}
export function NewsEdition({ edition, loading = false, error = '', now = Date.now() }) {
  const articles = (Array.isArray(edition?.articles) ? edition.articles : []).filter(article => isRecentNews(article, now) && safeNewsUrl(article.url));
  const partial = edition?.sources?.some(source => source.status !== 'updated');
  return <section className="news-section" aria-labelledby="news-title"><div className="sectionhead"><div><span className="section-number">07 / A WINDOW TO THE WORLD</span><h2 id="news-title">News</h2></div><span className="small">Morning edition · 6:00 AM IST</span></div>{edition?.fetchedAt && <p className="small news-updated">Edition updated {newsTime(edition.fetchedAt)}</p>}{error && <p className="report-text" role="status">{error}</p>}{partial && <p className="report-text">Some sources could not be refreshed. Available earlier stories have been retained.</p>}
    {loading && !edition ? <p className="empty" role="status">Opening the morning edition…</p> : !edition ? <p className="empty">Your daily news edition will appear here after the next morning update.</p> : <div className="news-grid">{newsCategories.map(category => { const stories = articles.filter(article => article.categories?.includes(category.id)).slice(0, 3); return <section className="news-category" key={category.id} aria-label={`${category.label} news`}><div className="news-category-heading"><h3>{category.label}</h3>{category.description && <p className="small">{category.description}</p>}</div><div className="news-stories">{stories.length ? stories.map(article => <NewsArticle key={article.id} article={article} />) : <p className="empty">No recent stories in this edition.</p>}</div></section>; })}</div>}
  </section>;
}
export default function NewsSection({ uid }) {
  return <NewsEdition {...useNews(uid)} />;
}
