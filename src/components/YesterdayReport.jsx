import { expenseCategories, money, prettyDate, progress, unit } from '../model';

export default function YesterdayReport({ date, goals, records, transactions }) {
  const checks = goals.filter(g => g.goalType !== 'tracker'), done = checks.filter(g => Boolean(progress(records, g, date))), trackers = goals.filter(g => g.goalType === 'tracker');
  const categories = expenseCategories(transactions), spent = categories.reduce((s, c) => s + c.amount, 0);
  return <><div className="small">{prettyDate(date)}</div><div className="report-number">{done.length}<span> / {checks.length} checkbox goals completed</span></div>{done.length ? <ul className="report-list">{done.map(g => <li key={g.id}>{g.title}</li>)}</ul> : <p className="report-text">{checks.length ? 'No checkbox goals marked complete.' : 'No checkbox goals scheduled yesterday.'}</p>}
    <h3 style={{ marginTop: 22 }}>The progress you made</h3>{trackers.length ? <ul className="report-list">{trackers.map(g => <li key={g.id}>{g.title} — <strong>{Number(progress(records, g, date)) || 0} {unit(g)}</strong></li>)}</ul> : <p className="report-text">No tracker goals scheduled yesterday.</p>}
    <h3 style={{ marginTop: 22 }}>Where the money went</h3><p className="report-text">You spent <strong>{money(spent / 100)}</strong> yesterday.</p>{categories.length > 0 && <ul className="report-list">{categories.map(c => <li key={c.id}>{records[c.id]?.name || 'Uncategorized'} — <strong>{money(c.amount / 100)}</strong></li>)}</ul>}
  </>;
}
