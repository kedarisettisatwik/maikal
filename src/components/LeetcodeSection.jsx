import useLeetcode from '../useLeetcode';
import { leetcodeLink } from '../leetcode-model';

function Problem({ problem, toggle, pending }) {
  const link = leetcodeLink(problem.link);
  return <article className={`leetcode-problem ${problem.completed ? 'is-completed' : ''}`}><div className="leetcode-problem-head"><h3>{problem.title}</h3><span className={`difficulty difficulty-${String(problem.difficulty).toLowerCase()}`}>{problem.difficulty}</span></div><div className="leetcode-tags">{(problem.tags || []).map(tag => <span key={tag}>{tag}</span>)}</div>{problem.premium_only && <p className="small">LeetCode Premium problem</p>}<div className="leetcode-actions">{link && <a href={link} target="_blank" rel="noopener noreferrer">Open problem on LeetCode ↗</a>}<label><input type="checkbox" checked={Boolean(problem.completed)} disabled={pending === problem.id} onChange={e => toggle(problem, e.target.checked)} aria-label={`Mark ${problem.title} completed`} />Completed</label></div></article>;
}
export function LeetcodeEdition({ date, today, history = [], loading = false, error = '', pending = '', toggle }) {
  return <section className="leetcode-section" aria-labelledby="leetcode-title"><div className="sectionhead"><div><span className="section-number">06 / DAILY PRACTICE</span><h2 id="leetcode-title">leetcode - problem of the day</h2></div><span className="small">{date} · India time</span></div>{error && <p className="report-text" role="status">{error}</p>}{today ? <Problem problem={today} toggle={toggle} pending={pending} /> : <p className="empty" role="status">{loading ? 'Choosing today’s problem…' : 'Your daily problem is not available yet.'}</p>}<details className="leetcode-history"><summary>History ({history.length})</summary>{history.length ? history.map(problem => <div className="leetcode-history-entry" key={problem.id}><div className="kicker">{problem.date}</div><Problem problem={problem} toggle={toggle} pending={pending} /></div>) : <p className="empty">Your past daily problems will appear here.</p>}</details></section>;
}
export default function LeetcodeSection({ uid, notify }) { return <LeetcodeEdition {...useLeetcode(uid, notify)} />; }
