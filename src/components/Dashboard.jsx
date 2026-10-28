import { assetUrl } from '../assets';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import useRecords from '../useRecords';
import { activeRecords, describe, due, localDate, offsetDate, prettyDate } from '../model';
import NewsSection from './NewsSection';
import JobsSection from './JobsSection';
import { canReadJobs } from '../jobs-model';
import { canReadNews } from '../news-model';
import EntryDialog, { NewDialog } from './EntryDialog';
import GoalBoard from './GoalBoard';
import YesterdayReport from './YesterdayReport';
import MoneySection, { DailyTransactions } from './MoneySection';

export default function Dashboard({ user, notify }) {
  const { records, save, remove, error, status } = useRecords(user.uid, notify);
  const [date, setDate] = useState(localDate);
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [entry, setEntry] = useState(null);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => { const update = () => setDate(localDate()); const timer = setInterval(update, 30000); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, []);
  const yesterday = offsetDate(-1, new Date(date + 'T12:00:00'));
  const goals = activeRecords(records, 'goal'), plans = activeRecords(records, 'event'), categories = activeRecords(records, 'category'), transactions = activeRecords(records, 'transaction');
  const todayGoals = goals.filter(g => due(g, date)), yesterdayGoals = goals.filter(g => due(g, yesterday));
  const events = plans.filter(e => due(e, date)).sort((a, b) => (a.allDay ? '00:00' : a.startTime).localeCompare(b.allDay ? '00:00' : b.startTime));
  const todayTransactions = transactions.filter(t => t.date === date), yesterdayTransactions = transactions.filter(t => t.date === yesterday);
  const onEdit = transaction => setEntry({ type: 'transaction', transaction });
  function onProgress(goalId, value, day) { if (!records[goalId] || records[goalId].deleted) return; save({ id: `progress_${goalId}_${day}`, type: 'progress', goalId, date: day, value }); notify('Progress saved'); }
  function removeCategory(id) { if (transactions.some(t => t.categoryId === id)) return notify('This category has transactions. Delete those entries first.'); remove(id); }
  function saveEntry(record) { if (record.type === 'transaction' && entry?.transaction && (!records[record.id] || records[record.id].deleted)) throw new Error('This transaction no longer exists.'); save(record); }
  async function logout() { setSigningOut(true); try { await signOut(auth); notify('Signed out'); } catch { notify('Could not sign out. Please try again.'); setSigningOut(false); } }
  return <main className="sheet"><div className="topbar"><div className="brand-lockup"><img className="app-logo" src={assetUrl('logo.png')} alt="Maikal" /><div><div className="kicker">A journal of everyday progress</div><span className="small">{user.email}</span></div></div><div className="actions"><button className="primary" onClick={() => setEntry({ type: 'new' })}>+ New</button><button disabled={signingOut} onClick={logout}>{signingOut ? 'Signing out…' : 'Sign out'}</button></div></div>
    <header className="masthead"><h1>The Maikal Daily</h1><div className="sub">A little reflection. A little intention. A day well lived.</div></header><div className="edition"><span>{prettyDate(date)}</span><span>Your personal edition · Est. today</span></div>{error && <div id="syncError" role="alert">{error}</div>}
    <section className="intro"><div><div className="kicker">The daily briefing</div><h2>A fresh page for today.</h2><p>{todayGoals.length} goal{todayGoals.length === 1 ? '' : 's'} to give your attention to. {events.length} meeting{events.length === 1 ? '' : 's'} and reminder{events.length === 1 ? '' : 's'} in your diary. A fresh start, at your own pace.</p></div><div className="note"><h3>Small things,<br />done with intention.</h3><p>Yesterday tells a story.<br />Today is yours to write.</p></div></section>
    <div className="columns"><div className="column"><section className="story"><div className="heading-line"><span className="section-number">01 / THE DAY AHEAD</span></div><h2>Today’s goals</h2><GoalBoard goals={goals} todayGoals={todayGoals} records={records} date={date} onProgress={onProgress} remove={remove} notify={notify} /></section>
      <section className="story"><div className="heading-line"><span className="section-number">02 / IN YOUR DIARY</span></div><h2>Meetings & reminders</h2>{events.length ? events.map(event => <div className="item" key={event.id}><div className="time">{event.allDay ? 'All day' : event.startTime}</div><div className="body"><span className="tag">{event.kind}</span><h3>{event.title}</h3>{!event.allDay && <small>{event.startTime} – {event.endTime}</small>}{event.notes && <small>{event.notes}</small>}</div></div>) : <p className="empty">Your diary has some breathing room today.</p>}
        <details style={{ marginTop: 18 }}><summary>All saved plans</summary>{plans.length ? plans.map(event => <div className="item" key={event.id}><div className="body"><h3 className="saved-title">{event.title}</h3><small>{event.kind} · {describe(event.schedule)} · {event.allDay ? 'All day' : `${event.startTime} – ${event.endTime}`}</small></div><button className="mini" onClick={() => remove(event.id)}>Delete</button></div>) : <p className="empty">No plans created yet.</p>}</details>
      </section></div><div className="column right"><section className="story"><div className="heading-line"><span className="section-number">03 / THE RECAP</span></div><h2>About yesterday</h2><YesterdayReport date={yesterday} goals={yesterdayGoals} records={records} transactions={yesterdayTransactions} /></section>
      <section className="story"><div className="heading-line"><span className="section-number">04 / THE MONEY DIARY</span></div><h2>Recent transactions</h2><DailyTransactions label="Today" transactions={todayTransactions} records={records} onEdit={onEdit} remove={remove} /><DailyTransactions label="Yesterday" transactions={yesterdayTransactions} records={records} onEdit={onEdit} remove={remove} /></section></div></div>
    <MoneySection month={month} setMonth={setMonth} transactions={transactions} records={records} onEdit={onEdit} remove={remove} />{canReadNews(user.uid) && <NewsSection uid={user.uid} />}{canReadJobs(user.uid) && <JobsSection uid={user.uid} />}<footer className="footer"><span>THE MAIKAL DAILY · A personal record, one day at a time.</span><span className="status" role="status">{status}</span></footer>
    {entry?.type === 'new' ? <NewDialog onClose={() => setEntry(null)} onChoose={type => setEntry({ type })} /> : entry && <EntryDialog key={`${entry.type}-${entry.transaction?.id || 'new'}`} entry={entry} categories={categories} save={saveEntry} removeCategory={removeCategory} notify={notify} onClose={() => setEntry(null)} />}
  </main>;
}
