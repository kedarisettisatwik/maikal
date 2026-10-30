import { useState } from 'react';
import { describe, unit } from '../model';
import { goalMonthReport } from '../reports-model';
import { Icon } from './EntryDialog';

const labels = { completed: 'Completed', 'not-completed': 'Not completed', 'not-applicable': 'Not applicable' };
const monthLabel = days => new Date(days[0].date + 'T12:00:00').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
function ReportFooter({ goal, days, tracker = false }) {
  const caption = tracker ? `Daily ${unit(goal)}` : describe(goal.schedule || { type: 'everyday' });
  return <footer className="report-card-footer"><span title={caption}>{caption}</span><span>{monthLabel(days)}</span></footer>;
}
function CheckboxReport({ goal, days }) {
  const offset = (new Date(days[0].date + 'T12:00:00').getDay() + 6) % 7;
  const completed = days.filter(day => day.completed).length, applicable = days.filter(day => day.applicable).length;
  return <article className="goal-report"><div className="report-goal-title"><Icon record={goal} /><div><h3 title={goal.title}>{goal.title}</h3><small>{completed} / {applicable} scheduled days completed</small></div></div><div className="report-calendar"><div className="calendar-weekdays" aria-hidden="true">{['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}</div><div className="calendar-squares" role="group" aria-label={`${goal.title} completion calendar`}>{Array.from({ length: offset }, (_, index) => <span key={`blank-${index}`} aria-hidden="true" />)}{days.map(day => <span key={day.date} role="img" className={`report-square ${day.state}`} title={`${day.date}: ${labels[day.state]}`} aria-label={`${day.date}: ${labels[day.state]}`}>{Number(day.date.slice(-2))}</span>)}</div></div><ReportFooter goal={goal} days={days} /></article>;
}
function TrackerReport({ goal, days }) {
  const maximum = Math.max(0, ...days.map(day => day.value)), total = days.reduce((sum, day) => sum + day.value, 0), recorded = days.filter(day => day.applicable && day.value > 0).length;
  const axis = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
  const top = Math.max(1, maximum), ticks = [...new Set([1, 8, 15, 22, days.length])];
  return <article className="goal-report tracker-report"><div className="report-goal-title"><Icon record={goal} /><div><h3 title={goal.title}>{goal.title}</h3><small title={`${total.toLocaleString('en-IN')} ${unit(goal)} total · ${recorded} days logged`}>{total.toLocaleString('en-IN')} {unit(goal)} total · {recorded} days logged</small></div></div><div className="tracker-chart"><div className="tracker-axis" aria-hidden="true"><span>{axis.format(top)}</span><span>{axis.format(top / 2)}</span><span>0</span></div><div className="tracker-plot"><div className="tracker-bars" role="group" aria-label={`${goal.title} daily ${unit(goal)}`} style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }}>{days.map(day => <div key={day.date} className={`tracker-column ${!day.applicable ? 'not-applicable' : ''}`}><div className="tracker-bar-space"><span role="img" tabIndex={0} aria-label={`${day.date}: ${day.applicable ? `${day.value} ${unit(goal)}` : 'Not applicable'}`} title={`${day.date}: ${day.applicable ? `${day.value} ${unit(goal)}` : 'Not applicable'}`} className={`tracker-report-bar ${day.value ? '' : 'zero'}`} style={{ height: day.value && maximum ? `${day.value / maximum * 100}%` : '2px' }} /></div></div>)}</div><div className="tracker-chart-labels" aria-hidden="true">{ticks.map(day => <span key={day}>{day}</span>)}</div></div></div><ReportFooter goal={goal} days={days} tracker /></article>;
}
export default function ReportsSection({ goals, records, date }) {
  const [expanded, setExpanded] = useState(false), [month, setMonth] = useState(() => date.slice(0, 7));
  const reports = expanded ? goals.map(goal => ({ goal, days: goalMonthReport(goal, records, month) })) : [];
  return <section className="reports-section"><details onToggle={event => setExpanded(event.currentTarget.open)}><summary className="reports-toggle"><h2>Reports</h2><span className="small">{expanded ? 'Collapse' : 'Expand'} ▾</span></summary>{expanded && <div className="reports-content"><label className="report-month"><span>Report month</span><input type="month" value={month} min="1900-01" max="9999-12" onChange={event => { if (event.target.value) setMonth(event.target.value); }} /></label><div className="reports-legend"><span><i className="report-square completed" />Completed</span><span><i className="report-square not-completed" />Scheduled, not completed</span><span><i className="report-square not-applicable" />Not applicable</span></div>{!goals.length ? <p className="empty">Create a goal to start your monthly reports.</p> : <div className="goal-reports-grid">{reports.map(({ goal, days }) => days.length ? goal.goalType === 'tracker' ? <TrackerReport key={goal.id} goal={goal} days={days} /> : <CheckboxReport key={goal.id} goal={goal} days={days} /> : null)}</div>}</div>}</details></section>;
}
