import { assetUrl } from '../assets';
import { useEffect, useState } from 'react';
import { signOut } from 'firebase/auth';
import { NotificationTags } from './NotificationTimes';
import { cloudEnabled } from '../storage';
import { acknowledgeNativeLaunch, consumeNativeLaunch, enableNotifications, isNative, syncNotifications } from '../native-notifications';
import { auth } from '../firebase';
import useRecords from '../useRecords';
import { activeRecords, describe, due, localDate, offsetDate, prettyDate } from '../model';
import NewsSection from './NewsSection';
import LeetcodeSection from './LeetcodeSection';
import ReportsSection from './ReportsSection';
import InstallAppButton from './InstallAppButton';
import { canReadLeetcode } from '../leetcode-model';
import JobsSection from './JobsSection';
import { canReadJobs } from '../jobs-model';
import { canReadNews } from '../news-model';
import EntryDialog, { NewDialog } from './EntryDialog';
import GoalBoard from './GoalBoard';
import YesterdayReport from './YesterdayReport';
import MoneySection, { DailyTransactions } from './MoneySection';

export default function Dashboard({ user, notify, onConnect, restoring }) {
  const { records, save, remove, error, status } = useRecords(user.uid, notify);
  const [date, setDate] = useState(localDate);
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [entry, setEntry] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  useEffect(() => { const update = () => setDate(localDate()); const timer = setInterval(update, 30000); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, []);
  useEffect(() => { let live = true; const timer = setTimeout(() => { syncNotifications(records, user.uid).catch(() => { if (live) notify('Android reminders could not be scheduled. Check notification permissions.'); }); }, 500); return () => { live = false; clearTimeout(timer); }; }, [records, user.uid]);
  useEffect(() => {
    if (!isNative() || restoring) return;
    let live = true, busy = false;
    const consume = async () => {
      if (!live || busy || document.hidden) return;
      busy = true;
      try { const command = await consumeNativeLaunch(); if (live && command.type === 'transaction') { setEntry(command); await acknowledgeNativeLaunch(command.requestId); } }
      catch { /* Preserve the ordinary menu flow if Android is unavailable. */ }
      finally { busy = false; }
    };
    consume(); const timer = setInterval(consume, 1000);
    document.addEventListener('visibilitychange', consume);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', consume); };
  }, [restoring]);
  const yesterday = offsetDate(-1, new Date(date + 'T12:00:00'));
  const goals = activeRecords(records, 'goal'), plans = activeRecords(records, 'event'), categories = activeRecords(records, 'category'), transactions = activeRecords(records, 'transaction');
  const todayGoals = goals.filter(g => due(g, date)), yesterdayGoals = goals.filter(g => due(g, yesterday));
  const events = plans.filter(e => due(e, date)).sort((a, b) => (a.allDay ? '00:00' : a.startTime).localeCompare(b.allDay ? '00:00' : b.startTime));
  const todayTransactions = transactions.filter(t => t.date === date), yesterdayTransactions = transactions.filter(t => t.date === yesterday);
  const onEdit = transaction => setEntry({ type: 'transaction', transaction });
  function onProgress(goalId, value, day) { if (!records[goalId] || records[goalId].deleted) return; save({ id: `progress_${goalId}_${day}`, type: 'progress', goalId, date: day, value }); notify('Progress saved'); }
  function removeCategory(id) { if (transactions.some(t => t.categoryId === id)) return notify('This category has transactions. Delete those entries first.'); remove(id); }
  function saveEntry(record) { if (record.type === 'transaction' && entry?.transaction && (!records[record.id] || records[record.id].deleted)) throw new Error('This transaction no longer exists.'); save(record); if (isNative() && record.notificationTimes?.length) enableNotifications().then(() => syncNotifications({ ...records, [record.id]: record }, user.uid)).catch(e => notify(e.message)); }
  async function logout() { setSigningOut(true); try { await signOut(auth); notify('Signed out'); } catch { notify('Could not sign out. Please try again.'); setSigningOut(false); } }
  return <main className="sheet"><div className="topbar"><div className="brand-lockup"><img className="app-logo" src={assetUrl('logo.png')} alt="Maikal" /><div><div className="kicker">A journal of everyday progress</div><span className="small">{user.email}</span></div></div><div className="app-menu"><button type="button" className="menu-toggle" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>&#9776;</button>{menuOpen && <><button className="menu-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} /><nav className="menu-panel" aria-label="Maikal menu">{[['goal', 'Add goal'], ['meeting', 'Add meeting'], ['reminder', 'Add reminder'], ['category', 'Create category'], ['transaction', 'Add transaction']].map(([type, label]) => <button key={type} onClick={() => { setEntry({ type }); setMenuOpen(false); }}>{label}</button>)}<InstallAppButton />{!isNative() && <a href="https://github.com/kedarisettisatwik/maikal/releases/latest/download/Maikal-debug.apk">Download Android APK</a>}{isNative() && <button onClick={() => enableNotifications().then(() => syncNotifications(records, user.uid)).then(() => notify('Notifications enabled')).catch(e => notify(e.message))}>Enable notifications</button>}{cloudEnabled(user.uid) ? <button disabled={signingOut} onClick={() => { setMenuOpen(false); logout(); }}>{signingOut ? 'Signing out...' : 'Sign out'}</button> : <button disabled={restoring} onClick={() => { setMenuOpen(false); onConnect(); }}>Connect Firebase</button>}</nav></>}</div></div>
    <header className="masthead"><h1>The Maikal Daily</h1><div className="sub">A little reflection. A little intention. A day well lived.</div></header><div className="edition"><span>{prettyDate(date)}</span><span>Your personal edition · Est. today</span></div>{error && <div id="syncError" role="alert">{error}</div>}
    <section className="intro"><div><div className="kicker">The daily briefing</div><h2>A fresh page for today.</h2><p>{todayGoals.length} goal{todayGoals.length === 1 ? '' : 's'} to give your attention to. {events.length} meeting{events.length === 1 ? '' : 's'} and reminder{events.length === 1 ? '' : 's'} in your diary. A fresh start, at your own pace.</p></div><div className="note"><h3>Small things,<br />done with intention.</h3><p>Yesterday tells a story.<br />Today is yours to write.</p></div></section>
    <div className="columns"><div className="column"><section className="story"><div className="heading-line"><span className="section-number">01 / THE DAY AHEAD</span></div><h2>Today’s goals</h2><GoalBoard goals={goals} todayGoals={todayGoals} records={records} date={date} onProgress={onProgress} remove={remove} notify={notify} onEdit={record => setEntry({ type: 'goal', record })} /></section>
      <section className="story"><div className="heading-line"><span className="section-number">02 / IN YOUR DIARY</span></div><h2>Meetings & reminders</h2>{events.length ? events.map(event => <div className="item" key={event.id}><div className="time">{event.allDay ? 'All day' : event.startTime}</div><div className="body"><span className="tag">{event.kind}</span><h3>{event.title}</h3><NotificationTags times={event.notificationTimes} />{!event.allDay && <small>{event.startTime} – {event.endTime}</small>}{event.notes && <small>{event.notes}</small>}</div></div>) : <p className="empty">Your diary has some breathing room today.</p>}
        <details style={{ marginTop: 18 }}><summary>All saved plans</summary>{plans.length ? plans.map(event => <div className="item" key={event.id}><div className="body"><h3 className="saved-title">{event.title}</h3><NotificationTags times={event.notificationTimes} /><small>{event.kind} · {describe(event.schedule)} · {event.allDay ? 'All day' : `${event.startTime} – ${event.endTime}`}</small></div><button className="mini" onClick={() => setEntry({ type: event.kind, record: event })}>Edit</button><button className="mini" onClick={() => remove(event.id)}>Delete</button></div>) : <p className="empty">No plans created yet.</p>}</details>
      </section></div><div className="column right"><section className="story"><div className="heading-line"><span className="section-number">03 / THE RECAP</span></div><h2>About yesterday</h2><YesterdayReport date={yesterday} goals={yesterdayGoals} records={records} transactions={yesterdayTransactions} /></section>
      <section className="story"><div className="heading-line"><span className="section-number">04 / THE MONEY DIARY</span></div><h2>Recent transactions</h2><DailyTransactions label="Today" transactions={todayTransactions} records={records} onEdit={onEdit} remove={remove} /><DailyTransactions label="Yesterday" transactions={yesterdayTransactions} records={records} onEdit={onEdit} remove={remove} /></section></div></div>
    <MoneySection month={month} setMonth={setMonth} transactions={transactions} records={records} onEdit={onEdit} remove={remove} />{canReadLeetcode(user.uid) && <LeetcodeSection uid={user.uid} notify={notify} />}<ReportsSection goals={goals} records={records} date={date} />{canReadNews(user.uid) && <NewsSection uid={user.uid} />}{canReadJobs(user.uid) && <JobsSection uid={user.uid} />}<footer className="footer"><span>THE MAIKAL DAILY · A personal record, one day at a time.</span><span className="status" role="status">{status}</span></footer>
    {entry?.type === 'new' ? <NewDialog onClose={() => setEntry(null)} onChoose={type => setEntry({ type })} /> : entry && <EntryDialog key={`${entry.type}-${entry.transaction?.id || entry.record?.id || 'new'}-${entry.kind || ''}-${entry.requestId || ''}`} entry={entry} categories={categories} save={saveEntry} removeCategory={removeCategory} notify={notify} onClose={() => setEntry(null)} />}
  </main>;
}
