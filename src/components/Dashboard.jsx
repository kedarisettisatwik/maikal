import { assetUrl } from '../assets';
import { localOnly } from '../build-mode';
import { openAlarms, openTrack, prepareAlarmAccess } from '../native-notifications';
import { pendingNativeShare, acknowledgeNativeShare } from '../native-notifications';
import NotesPage from './NotesPage';
import ScreenTimeSummary from './ScreenTimeSummary';
import useScreenTime from '../useScreenTime';
import '../notes.css';
import { useEffect, useState, useRef } from 'react';
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
import ApkDownload from './ApkDownload';
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
  const screenTime = useScreenTime(records, save, user.uid, restoring);
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [entry, setEntry] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [showNotes,setShowNotes]=useState(()=>window.location.hash==='#notes');
  const [sharedNote,setSharedNote]=useState(null);
  const [noteLaunch,setNoteLaunch]=useState(null);
  const requestedWidgetConnect=useRef(null);
  useEffect(()=>{const change=()=>setShowNotes(window.location.hash==='#notes');window.addEventListener('hashchange',change);return()=>window.removeEventListener('hashchange',change);},[]);
  useEffect(()=>{
    if(!isNative()||restoring)return;
    let live=true,busy=false;
    const consume=async()=>{if(!live||busy||document.hidden)return;busy=true;try{const {share}=await pendingNativeShare();if(live&&share){if(records['note_share_'+share.id])await acknowledgeNativeShare(share.id);else{setSharedNote(previous=>previous||share);window.location.hash='notes';setShowNotes(true);}}}catch{}finally{busy=false}};
    consume();const timer=setInterval(consume,1000);document.addEventListener('visibilitychange',consume);return()=>{live=false;clearInterval(timer);document.removeEventListener('visibilitychange',consume)};
  },[restoring,records]);
  useEffect(() => { const update = () => setDate(localDate()); const timer = setInterval(update, 30000); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, []);
  useEffect(() => { if(restoring)return; let live = true; const timer = setTimeout(() => { syncNotifications(records, user.uid).catch(() => { if (live) notify('Android alerts could not be scheduled. Check alarm and notification permissions.'); }); }, 500); return () => { live = false; clearTimeout(timer); }; }, [records, user.uid, restoring]);
  useEffect(() => {
    if (!isNative() || restoring) return;
    let live = true, busy = false;
    const consume = async () => {
      if (!live || busy || document.hidden) return;
      busy = true;
      try { const command = await consumeNativeLaunch();
        if(live && command.type === 'entry') {
          if(command.uid !== user.uid) {
            if(requestedWidgetConnect.current !== command.requestId){requestedWidgetConnect.current=command.requestId;notify('Connect the diary used by this alarm.');if(!localOnly)onConnect();}return;
          }
          const record=records[command.recordId];
          if(!record){if(requestedWidgetConnect.current!==command.requestId){requestedWidgetConnect.current=command.requestId;notify('Waiting for the linked entry to sync.');}return;}
          if(record.deleted){notify('This linked entry has been deleted.');await acknowledgeNativeLaunch(command.requestId);return;}
          window.location.hash='';setShowNotes(false);setEntry({type:record.type==='event'?record.kind:record.type,record});await acknowledgeNativeLaunch(command.requestId);return;
        }
        if(live && ['note','notes'].includes(command.type)) {
          if(command.type==='note' && command.uid!==user.uid) {
            if(requestedWidgetConnect.current!==command.requestId){requestedWidgetConnect.current=command.requestId;notify('Connect the diary used by this note widget.');if(!localOnly)onConnect();}return;
          }
          setEntry(null);setNoteLaunch(command.type==='note'?{id:command.noteId,requestId:command.requestId}:null);window.location.hash='notes';setShowNotes(true);await acknowledgeNativeLaunch(command.requestId);return;
        }
        if (live && command.type === 'transaction') { setEntry(command); await acknowledgeNativeLaunch(command.requestId); } }
      catch { /* Preserve the ordinary menu flow if Android is unavailable. */ }
      finally { busy = false; }
    };
    consume(); const timer = setInterval(consume, 1000);
    document.addEventListener('visibilitychange', consume);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', consume); };
  }, [restoring, records]);
  const yesterday = offsetDate(-1, new Date(date + 'T12:00:00'));
  const goals = activeRecords(records, 'goal'), plans = activeRecords(records, 'event'), categories = activeRecords(records, 'category'), transactions = activeRecords(records, 'transaction');
  const todayGoals = goals.filter(g => due(g, date)), yesterdayGoals = goals.filter(g => due(g, yesterday));
  const events = plans.filter(e => due(e, date)).sort((a, b) => (a.allDay ? '00:00' : a.startTime).localeCompare(b.allDay ? '00:00' : b.startTime));
  const todayTransactions = transactions.filter(t => t.date === date), yesterdayTransactions = transactions.filter(t => t.date === yesterday);
  const onEdit = transaction => setEntry({ type: 'transaction', transaction });
  function onProgress(goalId, value, day) { if (!records[goalId] || records[goalId].deleted) return; save({ id: `progress_${goalId}_${day}`, type: 'progress', goalId, date: day, value }); notify('Progress saved'); }
  function removeCategory(id) { if (transactions.some(t => t.categoryId === id)) return notify('This category has transactions. Delete those entries first.'); remove(id); }
  async function saveEntry(record) {
    if (record.type === 'transaction' && entry?.transaction && (!records[record.id] || records[record.id].deleted)) throw new Error('This transaction no longer exists.');
    if (isNative() && record.alarmTimes?.length) await prepareAlarmAccess();
    const saved = save(record);
    if (isNative()) {
      if (record.notificationTimes?.length && !record.alarmTimes?.length) enableNotifications().catch(e => notify(e.message));
      try { await syncNotifications({ ...records, [record.id]: saved }, user.uid); }
      catch { notify('Entry saved. Android alerts need attention; open Alarms to check permissions.'); }
    }
  }
  async function logout() { setSigningOut(true); try { await signOut(auth); notify('Signed out'); } catch { notify('Could not sign out. Please try again.'); setSigningOut(false); } }
  if(showNotes)return <NotesPage records={records} save={save} remove={remove} status={status} error={error} uid={user.uid} notify={notify} shared={sharedNote} openNote={noteLaunch} onShareDone={async id=>{await acknowledgeNativeShare(id);setSharedNote(null);}} onConnect={!localOnly?onConnect:undefined} onBack={()=>{window.location.hash='';setShowNotes(false);}}/>;
  return <main className="sheet"><div className="topbar"><div className="brand-lockup"><img className="app-logo" src={assetUrl('logo.png')} alt="Maikal" /><div><div className="kicker">A journal of everyday progress</div><span className="small">{user.email}</span></div></div><div className="app-menu"><button type="button" className="menu-toggle" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>&#9776;</button>{menuOpen && <><button className="menu-backdrop" aria-label="Close menu" onClick={() => setMenuOpen(false)} /><nav className="menu-panel" aria-label="Maikal menu">{[['goal', 'Add goal'], ['meeting', 'Add meeting'], ['reminder', 'Add reminder'], ['category', 'Create category'], ['transaction', 'Add transaction']].map(([type, label]) => <button key={type} onClick={() => { setEntry({ type }); setMenuOpen(false); }}>{label}</button>)}<button onClick={() => { setMenuOpen(false); window.location.hash="notes"; setShowNotes(true); }}>Notes</button><button type="button" onClick={() => { setMenuOpen(false); window.location.reload(); }}>Refresh</button><InstallAppButton />{isNative() && <button onClick={() => { setMenuOpen(false); openAlarms().catch(e => notify(e.message)); }}>Alarms</button>}{isNative() && <button onClick={() => { setMenuOpen(false); openTrack().catch(e => notify(e.message)); }}>Track</button>}<ApkDownload uid={user.uid} restoring={restoring} />{isNative() && <button onClick={() => enableNotifications().then(() => syncNotifications(records, user.uid)).then(() => notify('Notifications enabled')).catch(e => notify(e.message))}>Enable notifications</button>}{cloudEnabled(user.uid) ? <button disabled={signingOut} onClick={() => { setMenuOpen(false); logout(); }}>{signingOut ? 'Signing out...' : 'Sign out'}</button> : !localOnly && <button disabled={restoring} onClick={() => { setMenuOpen(false); onConnect(); }}>Connect Firebase</button>}</nav></>}</div></div>
    <header className="masthead"><h1>The Maikal Daily</h1><div className="sub">A little reflection. A little intention. A day well lived.</div></header><div className="edition"><span>{prettyDate(date)}</span><span>Your personal edition · Est. today</span></div>{error && <div id="syncError" role="alert">{error}</div>}
    <section className="intro"><div><div className="kicker">The daily briefing</div><h2>A fresh page for today.</h2><p>{todayGoals.length} goal{todayGoals.length === 1 ? '' : 's'} to give your attention to. {events.length} meeting{events.length === 1 ? '' : 's'} and reminder{events.length === 1 ? '' : 's'} in your diary. A fresh start, at your own pace.</p></div><ScreenTimeSummary records={records} date={date} uid={user.uid} state={screenTime} notify={notify} /></section>
    <div className="columns"><div className="column"><section className="story"><div className="heading-line"><span className="section-number">01 / THE DAY AHEAD</span></div><h2>Today’s goals</h2><GoalBoard goals={goals} todayGoals={todayGoals} records={records} date={date} onProgress={onProgress} remove={remove} notify={notify} onEdit={record => setEntry({ type: 'goal', record })} /></section>
      <section className="story"><div className="heading-line"><span className="section-number">02 / IN YOUR DIARY</span></div><h2>Meetings & reminders</h2>{events.length ? events.map(event => <div className="item" key={event.id}><div className="time">{event.allDay ? 'All day' : event.startTime}</div><div className="body"><span className="tag">{event.kind}</span><div className="entry-title-row"><h3>{event.title}</h3><NotificationTags times={event.notificationTimes} /></div>{!event.allDay && <small>{event.startTime} – {event.endTime}</small>}{event.notes && <small>{event.notes}</small>}</div></div>) : <p className="empty">Your diary has some breathing room today.</p>}
        <details style={{ marginTop: 18 }}><summary>All saved plans</summary>{plans.length ? plans.map(event => <div className="item" key={event.id}><div className="body"><div className="entry-title-row"><h3 className="saved-title">{event.title}</h3><NotificationTags times={event.notificationTimes} /></div><small>{event.kind} · {describe(event.schedule)} · {event.allDay ? 'All day' : `${event.startTime} – ${event.endTime}`}</small></div><button className="mini" onClick={() => setEntry({ type: event.kind, record: event })}>Edit</button><button className="mini" onClick={() => remove(event.id)}>Delete</button></div>) : <p className="empty">No plans created yet.</p>}</details>
      </section></div><div className="column right"><section className="story"><div className="heading-line"><span className="section-number">03 / THE RECAP</span></div><h2>About yesterday</h2><YesterdayReport date={yesterday} goals={yesterdayGoals} records={records} transactions={yesterdayTransactions} /></section>
      <section className="story"><div className="heading-line"><span className="section-number">04 / THE MONEY DIARY</span></div><h2>Recent transactions</h2><DailyTransactions label="Today" transactions={todayTransactions} records={records} onEdit={onEdit} remove={remove} /><DailyTransactions label="Yesterday" transactions={yesterdayTransactions} records={records} onEdit={onEdit} remove={remove} /></section></div></div>
    <MoneySection month={month} setMonth={setMonth} transactions={transactions} records={records} onEdit={onEdit} remove={remove} />{canReadLeetcode(user.uid) && <LeetcodeSection uid={user.uid} notify={notify} />}<ReportsSection goals={goals} records={records} date={date} />{canReadNews(user.uid) && <NewsSection uid={user.uid} />}{canReadJobs(user.uid) && <JobsSection uid={user.uid} />}<footer className="footer"><span>THE MAIKAL DAILY · A personal record, one day at a time.</span><span className="status" role="status">{status}</span></footer>
    {entry?.type === 'new' ? <NewDialog onClose={() => setEntry(null)} onChoose={type => setEntry({ type })} /> : entry && <EntryDialog key={`${entry.type}-${entry.transaction?.id || entry.record?.id || 'new'}-${entry.kind || ''}-${entry.requestId || ''}`} entry={entry} categories={categories} save={saveEntry} removeCategory={removeCategory} notify={notify} onClose={() => setEntry(null)} />}
  </main>;
}
