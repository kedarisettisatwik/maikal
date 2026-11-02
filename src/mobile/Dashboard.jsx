import {TaskEditor,TaskRow,TaskDetails} from './Tasks';
import CalendarPage from './CalendarPage';
import FocusPage from './FocusPage';
import {goalProgressSummary} from '../goal-progress';
import ScoreTotals from '../components/ScoreTotals';
import useScores from '../useScores';
import { goalComplete, hasTrackerValue, restartScoring } from '../score-model';
import AppInfo,{ThemeChoice} from '../components/AppInfo';
import {APP_VERSION} from '../version';
import {reportUsage} from '../usage';
import {applyTheme} from '../theme';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { registerPlugin } from '@capacitor/core';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { assetUrl } from '../assets';
import { localOnly } from '../build-mode';
import { cloudEnabled } from '../storage';
import { activeRecords, describe, due, localDate, money, progress, unit } from '../model';
import { applyViewMode } from '../view-mode';
import useRecords from '../useRecords';
import useScreenTime from '../useScreenTime';
import { latestScreenTime, screenTimeDuration } from '../screen-time';
import { acknowledgeNativeLaunch, consumeNativeLaunch, pendingNativeShare, acknowledgeNativeShare, enableNotifications, syncNotifications, prepareAlarmAccess, openAlarms, openTrack } from '../native-notifications';
import ActionIconButton from '../components/ActionIconButton';
import LeetcodeSection from '../components/LeetcodeSection';
import NewsSection from '../components/NewsSection';
import JobsSection from '../components/JobsSection';
import ReportsSection from './ReportsSection';
import EntryDialog, { Dialog, Icon } from './EntryDialog';
import NotesPage from './NotesPage';
import MoneyPage from './MoneyPage';
import homeIcon from './assets/home.png';
import moneyIcon from './assets/money.png';
import noteIcon from './assets/note.png';
import timeIcon from './assets/time.png';
import moreIcon from './assets/more.png';
import './mobile.css';
import TimeToolsPanel from './TimeToolsPanel';
import { celebrateGoal, clearCelebration } from './goal-celebration';

const native = registerPlugin('DiaryAlarms');
const tabs = [['home', homeIcon], ['money', moneyIcon], ['note', noteIcon], ['time', timeIcon], ['more', moreIcon]];
function initialTab() { const hash = window.location.hash.slice(1); return hash === 'notes' ? 'note' : tabs.some(([name]) => name === hash) ? hash : 'home'; }
function Heading({ title, children }) { return <div className="section-heading"><h2>{title}</h2><div className="heading-actions">{children}</div></div>; }
function Tracker({ goal, value, onSave, notify, entered,disabled }) {
  const [draft, setDraft] = useState(String(Number(value) || 0));
  const focus = useRef(false);
  useEffect(() => { if (!focus.current) setDraft(String(Number(value) || 0)); }, [value]);
  function commit() {
    focus.current = false; const number = Number(draft);
    if (!draft.trim() || !Number.isFinite(number) || number < 0 || number > 1e9) { setDraft(String(Number(value) || 0)); notify('Enter a value from 0 to 1,000,000,000.'); return; }
    if (number !== Number(value) || !entered) onSave(number);
  }
  return <input disabled={disabled} className="tracker-input" aria-label={`${goal.title} ${unit(goal)}`} type="number" min="0" max="1000000000" step="any" value={draft} onChange={e => setDraft(e.target.value)} onFocus={() => focus.current = true} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />;
}
export function GoalRow({ goal, records, date, onProgress, onEdit, remove, notify, manage = false,onFocus }) {
  const value = progress(records, goal, date), tracker = goal.goalType === 'tracker', finished = goalComplete(records, goal, date);
  return <div className={`goal-row ${finished ? 'done' : ''}`}>
    <div className="goal-visual"><Icon record={goal} /></div><div className="grow"><h3>{goal.focusEnabled?<button className="text-button" onClick={()=>onFocus(goal)}>{goal.title} · Focus</button>:goal.title}</h3><small>{manage ? describe(goal.schedule || { type: 'everyday' }) : tracker ? `Track in ${unit(goal)}${goal.target != null ? ` · ${goal.targetRule === 'atMost' ? 'At most' : 'At least'} ${goal.target}${finished ? ' · Target met' : ''}` : ''}` : value ? 'Completed today' : 'Daily progress'}</small></div>
    {manage ? goal.managedBy==='screenTime'?<button className="text-button" onClick={()=>openTrack()}>Manage in Track ↗</button>:<div className="row-actions"><ActionIconButton action="edit" label={`Edit goal ${goal.title}`} onClick={() => onEdit(goal)} /><ActionIconButton action="delete" label={`Delete goal ${goal.title}`} onClick={() => goal.managedBy==='screenTime'?openTrack():remove(goal.id)} /></div> : <div className="goal-control">{tracker ? <Tracker disabled={goal.managedBy==='screenTime'} key={`${goal.id}-${date}`} goal={goal} value={value} entered={hasTrackerValue(records, goal, date)} onSave={v => onProgress(goal.id, v, date)} notify={notify} /> : <label className="goal-check"><input type="checkbox" aria-label={`Mark ${goal.title} done`} checked={Boolean(value)} onChange={e => { const checked = e.target.checked; const saved = onProgress(goal.id, checked, date); if (checked && saved !== false) celebrateGoal(e.currentTarget); else clearCelebration(); }} /></label>}</div>}
  </div>;
}
export function PlanRow({ event, manage, onEdit, remove }) {
  return <article className="plan"><div className="plan-time">{event.allDay ? 'All day' : event.startTime || '-'}</div><div className="grow"><h3>{event.title}</h3><p>{manage ? describe(event.schedule || { type: 'everyday' }) : event.notes || (event.allDay ? 'All day' : `${event.startTime} - ${event.endTime}`)}</p></div>{manage && <div className="row-actions"><ActionIconButton action="edit" label={`Edit event ${event.title}`} onClick={() => onEdit(event)} /><ActionIconButton action="delete" label={`Delete event ${event.title}`} onClick={() => remove(event.id)} /></div>}</article>;
}
function AlarmsPage({ records, uid, notify, onEdit, active, revision }) {
  const [alarms, setAlarms] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState('');
  const alive = useRef(false);
  async function refresh() { try { const result = await native.listAlarms(); if (alive.current) { setAlarms((result.alarms || []).filter(a=>!a.timer).sort((a, b) => a.time.localeCompare(b.time))); setError(''); } } catch { if (alive.current) setError('Could not read alarms. Open alarm settings to check permissions.'); } }
  useEffect(() => {
    if (!active) return; alive.current = true; refresh();
    const resume = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(resume, 15000); window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [active, revision]);
  async function toggle(alarm, enabled) { setBusy(alarm.id); try { if (enabled) await prepareAlarmAccess(); await native.setAlarmEnabled({ id: alarm.id, enabled }); await refresh(); } catch (e) { notify(e.message || 'Could not update this alarm.'); } finally { setBusy(''); } }
  return <><div className="page-top"><div className="eyebrow">Your scheduled alerts</div><h1>Alarms</h1><p className="lead">Ringing alarms for goals, events and your day.</p></div><Heading title="All alarms"><button className="view-all" onClick={() => openAlarms().catch(e => notify(e.message))}>+ New alarm</button></Heading>{error && <p role="status" className="helper">{error}</p>}{!alarms.length && <p className="empty">No ringing alarms yet. Add one here, or set alarm times in a goal or event.</p>}{alarms.map(alarm => <div className={`alarm ${alarm.enabled ? '' : 'off'}`} key={alarm.id}><div className="alarm-time">{alarm.time}</div><div className="grow"><h3>{alarm.title}</h3><small>{alarm.diaryLinked ? 'Linked entry' : 'Standalone alarm'}</small><button className="text-button alarm-edit" onClick={() => { const source = records[alarm.sourceId]; if (alarm.diaryLinked && alarm.sourceUid === uid && source && !source.deleted) onEdit(source); else openAlarms().catch(e => notify(e.message)); }}>Edit</button></div><input className="toggle" type="checkbox" aria-label={`Enable ${alarm.title}`} disabled={busy === alarm.id} checked={Boolean(alarm.enabled)} onChange={e => toggle(alarm, e.target.checked)} /></div>)}<p className="helper">Notification times are separate from ringing alarms. Manage both in the linked goal or event form.</p><button className="text-button" onClick={() => openAlarms().catch(e => notify(e.message))}>Alarm settings & permissions ↗</button></>;
}

function TimePage(props){const [tool,setTool]=useState('alarms');return <><div className="time-subtabs" role="tablist" aria-label="Time tools">{['alarms','timer','stopwatch'].map(name=><button type="button" key={name} role="tab" aria-label={name==='alarms'?'Alarms':name==='timer'?'Timer':'Stopwatch'} aria-selected={tool===name} onClick={()=>setTool(name)}>{name==='alarms'?'Alarms':name==='timer'?'Timer':'Stopwatch'}</button>)}</div>{tool==='alarms'?<AlarmsPage {...props}/>:<TimeToolsPanel mode={tool} active={props.active} notify={props.notify}/>}</>}

export default function Dashboard({ user, notify, onConnect, restoring }) {
  const { records, save, remove, error, status } = useRecords(user.uid, notify);
  useEffect(()=>{if(localOnly){reportUsage({});return;}if(restoring)return;const send=()=>reportUsage(records).catch(()=>{});const timer=setTimeout(send,2000),repeat=setInterval(send,15*60000);window.addEventListener('online',send);document.addEventListener('visibilitychange',send);return()=>{clearTimeout(timer);clearInterval(repeat);window.removeEventListener('online',send);document.removeEventListener('visibilitychange',send)}},[records,restoring]);
  const screenTime = useScreenTime(records, save, user.uid, restoring);
  const [focusRecord,setFocusRecord]=useState(null),[taskDetailId,setTaskDetailId]=useState(null);
  const [date, setDate] = useState(localDate), [tab, setTab] = useState(initialTab), [entry, setEntry] = useState(null), [list, setList] = useState(null);
  const [noteLaunch, setNoteLaunch] = useState(null), [sharedNote, setSharedNote] = useState(null), [syncRevision, setSyncRevision] = useState(0), [signingOut, setSigningOut] = useState(false);
  const score = useScores(records, save, date, user.uid, restoring, notify);
  const [moneyLaunch,setMoneyLaunch]=useState(null);
  const viewport = useRef(null), latest = useRef(null), drag = useRef(null), pendingRequest = useRef(null), shareOpened = useRef(null);
  latest.current = { records, tab };
  useLayoutEffect(() => { document.documentElement.dataset.maikalMobile = 'true'; applyTheme(); applyViewMode('normal'); return () => { clearCelebration(); delete document.documentElement.dataset.maikalMobile; }; }, []);
  function go(name, smooth = true) { setTab(name); setList(null); history.replaceState(null, '', '#' + name); viewport.current?.scrollTo({ left: tabs.findIndex(([t]) => t === name) * viewport.current.clientWidth, behavior: smooth && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' }); }
  useLayoutEffect(() => { go(initialTab(), false); const resize = () => { const name = latest.current.tab; viewport.current?.scrollTo({ left: tabs.findIndex(([t]) => t === name) * viewport.current.clientWidth, behavior: 'instant' }); }; window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  useEffect(() => { const backHome = () => go('home'); window.addEventListener('maikal-mobile-home', backHome); return () => window.removeEventListener('maikal-mobile-home', backHome); }, []);
  useEffect(() => { const update = () => setDate(localDate()); const timer = setInterval(update, 30000); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, []);
  useEffect(() => {
    if (restoring) return; let live = true;
    const timer = setTimeout(() => syncNotifications(records, user.uid).then(() => { if (live) setSyncRevision(n => n + 1); }).catch(() => { if (live) notify('Android alerts need attention. Check Time for alarm permissions.'); }), 500);
    return () => { live = false; clearTimeout(timer); };
  }, [records, user.uid, restoring,date]);
  useEffect(() => {
    if (restoring) return; let live = true, busy = false;
    const consume = async () => {
      if (!live || busy || document.hidden) return; busy = true;
      try {
        const current = latest.current.records;
        const { share } = await pendingNativeShare(); if (!live) return;
        if (share) {
          if (current['note_share_' + share.id]) await acknowledgeNativeShare(share.id);
          else if (shareOpened.current !== share.id) { shareOpened.current = share.id; setEntry(null); setSharedNote(share); go('note'); }
          return;
        }
        const command = await consumeNativeLaunch(); if (!live || !command.type) return;
        if (command.uid && command.uid !== user.uid) { if (pendingRequest.current !== command.requestId) { pendingRequest.current = command.requestId; notify('Connect the diary used by this widget or alarm.'); if (!localOnly) onConnect(); } return; }
        if(command.type==='quick'){
          const dialog=document.querySelector('dialog[open]');if(dialog){dialog.dispatchEvent(new Event('cancel',{cancelable:true}));await new Promise(resolve=>setTimeout(resolve,100));if(document.querySelector('dialog[open]')){await acknowledgeNativeLaunch(command.requestId);return;}}
          setEntry(null);setList(null);
          if(command.action==='note'){setNoteLaunch({create:true,requestId:command.requestId});go('note');}
          else if(command.action==='transaction'){go('money');setEntry({type:'transaction'});}
          else if(command.action==='goal'){go('home');setEntry({type:'goal'});}
          else if(command.action==='plan'){setEntry({type:'event',requestId:command.requestId});}
          else if(command.action==='report'){go('more');}
          else if(command.action==='money'){setMoneyLaunch({period:command.moneyPeriod,requestId:command.requestId});go('money');}
          await acknowledgeNativeLaunch(command.requestId);return;
        }
        if (command.type === 'transaction') { go('money'); setEntry(command); }
        else if (command.type === 'entry') { const record = current[command.recordId]; if (!record) return; if (record.deleted) { await acknowledgeNativeLaunch(command.requestId); return; } if(record.managedBy==='screenTime'){await openTrack();await acknowledgeNativeLaunch(command.requestId);return;}setEntry({ type: record.type, record }); }
        else if (['note', 'notes'].includes(command.type)) { setEntry(null); setNoteLaunch(command.type === 'note' ? { id: command.noteId, requestId: command.requestId } : null); go('note'); }
        await acknowledgeNativeLaunch(command.requestId);
      } catch { /* Native requests remain queued until their next successful read. */ } finally { busy = false; }
    };
    consume(); const timer = setInterval(consume, 1200); document.addEventListener('visibilitychange', consume);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', consume); };
  }, [user.uid, restoring]);
  const goals = activeRecords(records, 'goal'), plans = activeRecords(records, 'event'), categories = activeRecords(records, 'category'), transactions = activeRecords(records, 'transaction');
  const todayGoals = goals.filter(g => due(g, date)), events = plans.filter(p => due(p, date)).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const {completed:complete,total:checks}=goalProgressSummary(todayGoals,records,date);
  const usage = latestScreenTime(records, date, screenTime.deviceId);
  function onProgress(goalId, value, day) { if (!latest.current.records[goalId] || latest.current.records[goalId].deleted) return false; if(latest.current.records[goalId].managedBy==='screenTime'){notify('Screen time updates automatically. Edit its target in Track.');return false;} try { save({ ...latest.current.records[`progress_${goalId}_${day}`],id: `progress_${goalId}_${day}`, type: 'progress', goalId, date: day, value,manualTotalAt:Date.now() }); return true; } catch (e) { notify(e.message); return false; } }
  function edit(record) { setTaskDetailId(null); if(record.managedBy==='screenTime'){openTrack().catch(e=>notify(e.message));return;} setList(null); setEntry({ type: record.type, ...(record.type === 'transaction' ? { transaction: record } : { record }) }); }
  async function saveEntry(record) {
    if(latest.current.records[record.id]?.managedBy==='screenTime')throw Error('Edit the screen-time goal in Track.');
    if ((entry?.record || entry?.transaction) && latest.current.records[record.id]?.deleted) throw Error('This item was deleted. Create a new entry instead.');
    if (record.alarmTimes?.length) await prepareAlarmAccess();
    const saved = save(record);
    if ((record.notificationTimes?.length || record.frequentReminders?.enabled) && !record.alarmTimes?.length) enableNotifications().catch(e => notify(e.message));
    try { await syncNotifications({ ...latest.current.records, [record.id]: saved }, user.uid); setSyncRevision(n => n + 1); } catch { notify('Entry saved. Check Time for Android alarm permissions.'); }
  }
  function removeCategory(id) { if (transactions.some(t => t.categoryId === id)) return notify('This category has transactions. Delete those entries first.'); remove(id); }
  function add(type) { if (type === 'note') { setNoteLaunch({ create: true, requestId: crypto.randomUUID() }); go('note'); } else setEntry({ type }); }
  async function logout() { setSigningOut(true); try { await signOut(auth); } catch { notify('Could not sign out.'); setSigningOut(false); } }
  const taskRows=activeRecords(records,'task');
  async function startFocus(record){try{await syncNotifications(latest.current.records,user.uid);setFocusRecord(record);}catch(e){notify(e.message||'Could not open focus.');}}
  const goalProps = { onFocus:startFocus,records, date, onProgress, onEdit: edit, remove, notify };
  const panes = [
    <><div className="page-top"><div className="eyebrow">The daily briefing</div><h1>A fresh page for today.</h1><p className="lead">Small things, done with intention.</p><div className="progress-caption"><span>Today’s goal progress</span><b>{complete} of {checks} complete</b></div><div className="progress-rail" role="progressbar" aria-label="Today’s goal progress" aria-valuemin={0} aria-valuemax={checks||1} aria-valuenow={complete}><span style={{ width: `${checks ? complete / checks * 100 : 0}%` }} /></div></div><section><Heading title="Today’s goals"><button className="view-all" onClick={() => add('goal')}>+ New goal</button><button className="view-all" onClick={() => setList('goals')}>View all ↗</button></Heading>{todayGoals.map(goal => <GoalRow key={goal.id} goal={goal} {...goalProps} />)}{!todayGoals.length && <p className="empty">Add a goal to begin.</p>}</section><section className="section"><Heading title="Events"><button className="view-all" onClick={() => add('event')}>+ New event</button><button className="view-all" onClick={() => setList('plans')}>View all ↗</button></Heading>{events.map(event => <PlanRow key={event.id} event={event} />)}{!events.length && <p className="empty">Nothing scheduled today.</p>}</section><section className="section"><Heading title="Tasks"><button className="view-all" onClick={()=>add('task')}>+ New task</button><button className="view-all" onClick={()=>setList('tasks')}>View all ↗</button></Heading>{taskRows.filter(t=>t.startDate<=date&&(!t.completed||t.deadline===date)).map(task=><TaskRow key={task.id} task={task} records={records} save={save} onOpen={task=>{setList(null);setTaskDetailId(task.id);}}/>)}{!taskRows.length&&<p className="empty">Add a task to begin.</p>}</section><section className="section mobile-screen-time"><Heading title="Today’s screen time"><button className="view-all" onClick={() => openTrack().catch(e => notify(e.message))}>Track ↗</button></Heading><strong>{screenTime.loading ? 'Reading…' : screenTime.allowed === false ? 'Enable usage access' : screenTime.error ? 'Usage unavailable' : usage ? screenTimeDuration(usage.totalMs) : 'No usage data yet'}</strong></section>{cloudEnabled(user.uid) && !localOnly && <div className="private-content"><LeetcodeSection uid={user.uid} notify={notify} /><NewsSection uid={user.uid} /><JobsSection uid={user.uid} /></div>}</>,
    <MoneyPage key={user.uid} uid={user.uid} launch={moneyLaunch} records={records} date={date} transactions={transactions} onEdit={edit} remove={remove} onAdd={() => add('transaction')} />,
    <NotesPage records={records} save={save} remove={remove} status={status} error={error} uid={user.uid} notify={notify} openNote={noteLaunch} shared={sharedNote} onShareDone={async id => { await acknowledgeNativeShare(id); setSharedNote(null); shareOpened.current = null; }} onConnect={localOnly ? undefined : onConnect} onBack={() => go('home')} />,
    <TimePage records={records} uid={user.uid} notify={notify} onEdit={edit} active={tab === 'time'} revision={syncRevision} />,
    <><div className="page-top"><div className="eyebrow">A place for everything</div><h1>Make it your own.</h1></div><div className="action-list">{[['goal','Add goal'],['task','Add task'],['event','Add event'],['category','Add categories'],['transaction','Add transaction'],['note','Add note']].map(([type, title]) => <button className="action-row" key={type} onClick={() => add(type)}><span className="plus">+</span><strong>{title}</strong><span className="arrow">↗</span></button>)}</div><button className="action-row" onClick={() => setList('reports')}><strong>Goal reports</strong><span className="arrow">↗</span></button><button className="action-row" onClick={() => enableNotifications().then(() => syncNotifications(records, user.uid)).then(() => notify('Notifications enabled')).catch(e => notify(e.message))}><strong>Notification permissions</strong><span className="arrow">↗</span></button><button className="action-row" onClick={()=>setList('calendar')}><strong>Calendar</strong><span>↗</span></button><ScoreTotals score={score}/><button className="action-row score-restart" onClick={()=>{if(window.confirm("Start scoring again from today? Today's completed goals and eligible tasks count immediately. Earlier days are excluded. Your goals, progress, tasks, notes and transactions are kept.")){try{save(restartScoring(date));notify('Scoring restarted from today');}catch{notify('Could not restart scoring. Please check device storage.');}}}}><strong>Start over</strong><span className="arrow">↗</span></button><ThemeChoice/><button className="action-row" onClick={()=>setList('about')}><strong>Know more about app</strong><span className="arrow">↗</span></button><p className="helper">MANTRA · Version {APP_VERSION} · {localOnly?'Local APK':'Firebase APK'}</p><section className="account-card"><h3>{localOnly ? 'On this device.' : cloudEnabled(user.uid) ? 'Your connected diary.' : 'Connect your diary.'}</h3><p>{localOnly ? 'Goals, plans, notes and money stay on this device.' : cloudEnabled(user.uid) ? user.email : 'Sign in to your authorized Firebase account for synced records and your private Home edition.'}</p>{!localOnly && (cloudEnabled(user.uid) ? <button className="primary" disabled={signingOut} onClick={logout}>Sign out</button> : <button className="primary" disabled={restoring} onClick={onConnect}>Sign in</button>)}</section><p className="helper" role="status">{status}</p></>
  ];
  return <main className="mobile-app phone" data-active-tab={tab}><header className="app-header"><div className="brand"><img src={assetUrl('logo.png')} alt="MANTRA" /><span>MANTRA<span className="brand-dot">.</span></span></div><div className="edition"><span>{new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span><small>{cloudEnabled(user.uid) ? 'Connected diary' : 'Local diary'}</small></div></header>{error && <div className="mobile-sync-error" role="status">{error}</div>}<div className="viewport" ref={viewport} onScroll={e => { const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth); if (tabs[index]) { setTab(tabs[index][0]); history.replaceState(null, '', '#' + tabs[index][0]); } }} onPointerDown={e => { if (e.pointerType !== 'mouse' || e.target.closest('button,input,select,a,label,summary')) return; drag.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, locked: false }; }} onPointerMove={e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (!d.locked && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - d.y)) { d.locked = true; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.style.scrollSnapType = 'none'; } if (d.locked) { e.currentTarget.scrollLeft = d.left - dx; e.preventDefault(); } }} onPointerUp={e => { const d = drag.current; drag.current = null; e.currentTarget.style.scrollSnapType = ''; if (d?.locked) go(tabs[Math.max(0, Math.min(4, Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)))][0]); }} onPointerCancel={e => { drag.current = null; e.currentTarget.style.scrollSnapType = ''; }}>{panes.map((pane, i) => <section key={tabs[i][0]} role="tabpanel" aria-label={tabs[i][0]} className={`panel mobile-${tabs[i][0]} ${tab === tabs[i][0] ? 'active' : ''}`} inert={tab !== tabs[i][0]}>{pane}</section>)}</div><nav className="tab-bar" style={{'--active-tab': tabs.findIndex(([name]) => name === tab)}} role="tablist" aria-label="Main navigation">{tabs.map(([name, icon], i) => <button key={name} role="tab" aria-label={name[0].toUpperCase() + name.slice(1)} aria-selected={tab === name} onClick={() => go(name)} onKeyDown={e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); const next = (i + (e.key === 'ArrowRight' ? 1 : 4)) % 5; go(tabs[next][0]); e.currentTarget.parentNode.children[next].focus(); } }}><img src={icon} alt="" /></button>)}</nav>{list && <Dialog title={list === 'about' ? 'About MANTRA' : list==='calendar'?'Calendar':list==='tasks'?'Tasks':list === 'goals' ? 'All goals' : list === 'plans' ? 'Events' : 'Goal reports'} onClose={() => setList(null)}>{ list==='calendar'?<CalendarPage records={records} onOpen={record=>record.type==='task'?(setList(null),setTaskDetailId(record.id)):edit(record)}/>:list==='tasks'?taskRows.map(task=><TaskRow key={task.id} task={task} records={records} save={save} onOpen={task=>{setList(null);setTaskDetailId(task.id);}}/>):list === 'about' ? <AppInfo onBack={()=>setList(null)}/> : list === 'goals' ? goals.map(goal => <GoalRow key={goal.id} goal={goal} {...goalProps} manage />) : list === 'plans' ? plans.map(event => <PlanRow key={event.id} event={event} manage onEdit={edit} remove={remove} />) : <ReportsSection goals={goals} records={records} date={date} />}{!['calendar','tasks'].includes(list)&&list !== 'reports' && list !== 'about' && !(list === 'goals' ? goals.length : plans.length) && <p className="empty">Nothing saved yet.</p>}</Dialog>}{taskDetailId&&records[taskDetailId]&&!records[taskDetailId].deleted&&!focusRecord&&<TaskDetails task={records[taskDetailId]} records={records} save={save} onEdit={edit} onFocus={startFocus} remove={remove} onClose={()=>setTaskDetailId(null)}/>} {focusRecord&&<FocusPage record={focusRecord} onClose={()=>setFocusRecord(null)}/>} {entry?.type==='task'?<TaskEditor key={entry.record?.id||'new-task'} task={entry.record} save={saveEntry} onClose={()=>setEntry(null)}/>:entry && <EntryDialog key={`${entry.type}-${entry.record?.id || entry.transaction?.id || 'new'}-${entry.requestId || ''}`} entry={entry} categories={categories} save={saveEntry} removeCategory={removeCategory} notify={notify} onClose={() => setEntry(null)} />}</main>;
}
