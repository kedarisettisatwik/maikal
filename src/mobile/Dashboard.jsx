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
import ReportsSection from '../components/ReportsSection';
import EntryDialog, { Dialog, Icon } from './EntryDialog';
import NotesPage from './NotesPage';
import MoneyPage from './MoneyPage';
import homeIcon from './assets/home.png';
import moneyIcon from './assets/money.png';
import noteIcon from './assets/note.png';
import timeIcon from './assets/time.png';
import moreIcon from './assets/more.png';
import './mobile.css';

const native = registerPlugin('DiaryAlarms');
const tabs = [['home', homeIcon], ['money', moneyIcon], ['note', noteIcon], ['time', timeIcon], ['more', moreIcon]];
function initialTab() { const hash = window.location.hash.slice(1); return hash === 'notes' ? 'note' : tabs.some(([name]) => name === hash) ? hash : 'home'; }
function Heading({ title, children }) { return <div className="section-heading"><h2>{title}</h2><div className="heading-actions">{children}</div></div>; }
function Tracker({ goal, value, onSave, notify }) {
  const [draft, setDraft] = useState(String(Number(value) || 0));
  const focus = useRef(false);
  useEffect(() => { if (!focus.current) setDraft(String(Number(value) || 0)); }, [value]);
  function commit() {
    focus.current = false; const number = Number(draft);
    if (!draft.trim() || !Number.isFinite(number) || number < 0 || number > 1e9) { setDraft(String(Number(value) || 0)); notify('Enter a value from 0 to 1,000,000,000.'); return; }
    if (number !== Number(value)) onSave(number);
  }
  return <input className="tracker-input" aria-label={`${goal.title} ${unit(goal)}`} type="number" min="0" max="1000000000" step="any" value={draft} onChange={e => setDraft(e.target.value)} onFocus={() => focus.current = true} onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } }} />;
}
export function GoalRow({ goal, records, date, onProgress, onEdit, remove, notify, manage = false }) {
  const value = progress(records, goal, date), tracker = goal.goalType === 'tracker';
  return <div className={`goal-row ${!tracker && value ? 'done' : ''}`}>
    <div className="goal-visual"><Icon record={goal} /></div><div className="grow"><h3>{goal.title}</h3><small>{manage ? describe(goal.schedule || { type: 'everyday' }) : tracker ? `Track in ${unit(goal)}` : value ? 'Completed today' : 'Daily progress'}</small></div>
    {manage ? <div className="row-actions"><ActionIconButton action="edit" label={`Edit goal ${goal.title}`} onClick={() => onEdit(goal)} /><ActionIconButton action="delete" label={`Delete goal ${goal.title}`} onClick={() => remove(goal.id)} /></div> : <div className="goal-control">{tracker ? <Tracker key={`${goal.id}-${date}`} goal={goal} value={value} onSave={v => onProgress(goal.id, v, date)} notify={notify} /> : <label className="goal-check"><input type="checkbox" aria-label={`Mark ${goal.title} done`} checked={Boolean(value)} onChange={e => onProgress(goal.id, e.target.checked, date)} /></label>}</div>}
  </div>;
}
export function PlanRow({ event, manage, onEdit, remove }) {
  return <article className="plan"><div className="plan-time">{event.allDay ? 'All day' : event.startTime || '-'}</div><div className="grow"><h3>{event.title}</h3><p>{manage ? describe(event.schedule || { type: 'everyday' }) : event.notes || (event.allDay ? 'All day' : `${event.startTime} - ${event.endTime}`)}</p></div>{manage && <div className="row-actions"><ActionIconButton action="edit" label={`Edit reminder ${event.title}`} onClick={() => onEdit(event)} /><ActionIconButton action="delete" label={`Delete reminder ${event.title}`} onClick={() => remove(event.id)} /></div>}</article>;
}
function TimePage({ records, uid, notify, onEdit, active, revision }) {
  const [alarms, setAlarms] = useState([]), [error, setError] = useState(''), [busy, setBusy] = useState('');
  const alive = useRef(false);
  async function refresh() { try { const result = await native.listAlarms(); if (alive.current) { setAlarms((result.alarms || []).sort((a, b) => a.time.localeCompare(b.time))); setError(''); } } catch { if (alive.current) setError('Could not read alarms. Open alarm settings to check permissions.'); } }
  useEffect(() => {
    if (!active) return; alive.current = true; refresh();
    const resume = () => { if (!document.hidden) refresh(); };
    const timer = setInterval(resume, 15000); window.addEventListener('focus', resume); document.addEventListener('visibilitychange', resume);
    return () => { alive.current = false; clearInterval(timer); window.removeEventListener('focus', resume); document.removeEventListener('visibilitychange', resume); };
  }, [active, revision]);
  async function toggle(alarm, enabled) { setBusy(alarm.id); try { if (enabled) await prepareAlarmAccess(); await native.setAlarmEnabled({ id: alarm.id, enabled }); await refresh(); } catch (e) { notify(e.message || 'Could not update this alarm.'); } finally { setBusy(''); } }
  return <><div className="page-top"><div className="eyebrow">Your scheduled alerts</div><h1>Alarms</h1><p className="lead">Ringing alarms for goals, reminders and your day.</p></div><Heading title="All alarms"><button className="view-all" onClick={() => openAlarms().catch(e => notify(e.message))}>+ New alarm</button></Heading>{error && <p role="status" className="helper">{error}</p>}{!alarms.length && <p className="empty">No ringing alarms yet. Add one here, or set alarm times in a goal or reminder.</p>}{alarms.map(alarm => <div className={`alarm ${alarm.enabled ? '' : 'off'}`} key={alarm.id}><div className="alarm-time">{alarm.time}</div><div className="grow"><h3>{alarm.title}</h3><small>{alarm.diaryLinked ? 'Linked entry' : 'Standalone alarm'}</small><button className="text-button alarm-edit" onClick={() => { const source = records[alarm.sourceId]; if (alarm.diaryLinked && alarm.sourceUid === uid && source && !source.deleted) onEdit(source); else openAlarms().catch(e => notify(e.message)); }}>Edit</button></div><input className="toggle" type="checkbox" aria-label={`Enable ${alarm.title}`} disabled={busy === alarm.id} checked={Boolean(alarm.enabled)} onChange={e => toggle(alarm, e.target.checked)} /></div>)}<p className="helper">Notification times are separate from ringing alarms. Manage both in the linked goal or reminder form.</p><button className="text-button" onClick={() => openAlarms().catch(e => notify(e.message))}>Alarm settings & permissions ↗</button></>;
}

export default function Dashboard({ user, notify, onConnect, restoring }) {
  const { records, save, remove, error, status } = useRecords(user.uid, notify);
  const screenTime = useScreenTime(records, save, user.uid, restoring);
  const [date, setDate] = useState(localDate), [tab, setTab] = useState(initialTab), [entry, setEntry] = useState(null), [list, setList] = useState(null);
  const [noteLaunch, setNoteLaunch] = useState(null), [sharedNote, setSharedNote] = useState(null), [syncRevision, setSyncRevision] = useState(0), [signingOut, setSigningOut] = useState(false);
  const viewport = useRef(null), latest = useRef(null), drag = useRef(null), pendingRequest = useRef(null), shareOpened = useRef(null);
  latest.current = { records, tab };
  useLayoutEffect(() => { document.documentElement.dataset.maikalMobile = 'true'; applyViewMode('normal'); return () => { delete document.documentElement.dataset.maikalMobile; }; }, []);
  function go(name, smooth = true) { setTab(name); setList(null); history.replaceState(null, '', '#' + name); viewport.current?.scrollTo({ left: tabs.findIndex(([t]) => t === name) * viewport.current.clientWidth, behavior: smooth && !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'instant' }); }
  useLayoutEffect(() => { go(initialTab(), false); const resize = () => { const name = latest.current.tab; viewport.current?.scrollTo({ left: tabs.findIndex(([t]) => t === name) * viewport.current.clientWidth, behavior: 'instant' }); }; window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize); }, []);
  useEffect(() => { const backHome = () => go('home'); window.addEventListener('maikal-mobile-home', backHome); return () => window.removeEventListener('maikal-mobile-home', backHome); }, []);
  useEffect(() => { const update = () => setDate(localDate()); const timer = setInterval(update, 30000); document.addEventListener('visibilitychange', update); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); }; }, []);
  useEffect(() => {
    if (restoring) return; let live = true;
    const timer = setTimeout(() => syncNotifications(records, user.uid).then(() => { if (live) setSyncRevision(n => n + 1); }).catch(() => { if (live) notify('Android alerts need attention. Check Time for alarm permissions.'); }), 500);
    return () => { live = false; clearTimeout(timer); };
  }, [records, user.uid, restoring]);
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
        }
        const command = await consumeNativeLaunch(); if (!live || !command.type) return;
        if (command.uid && command.uid !== user.uid) { if (pendingRequest.current !== command.requestId) { pendingRequest.current = command.requestId; notify('Connect the diary used by this widget or alarm.'); if (!localOnly) onConnect(); } return; }
        if (command.type === 'transaction') { go('money'); setEntry(command); }
        else if (command.type === 'entry') { const record = current[command.recordId]; if (!record) return; if (record.deleted) { await acknowledgeNativeLaunch(command.requestId); return; } setEntry({ type: record.type === 'event' ? record.kind : record.type, record }); }
        else if (['note', 'notes'].includes(command.type)) { setEntry(null); setNoteLaunch(command.type === 'note' ? { id: command.noteId, requestId: command.requestId } : null); go('note'); }
        await acknowledgeNativeLaunch(command.requestId);
      } catch { /* Native requests remain queued until their next successful read. */ } finally { busy = false; }
    };
    consume(); const timer = setInterval(consume, 1200); document.addEventListener('visibilitychange', consume);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', consume); };
  }, [user.uid, restoring]);
  const goals = activeRecords(records, 'goal'), plans = activeRecords(records, 'event'), categories = activeRecords(records, 'category'), transactions = activeRecords(records, 'transaction');
  const todayGoals = goals.filter(g => due(g, date)), events = plans.filter(p => due(p, date)).sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const complete = todayGoals.filter(g => g.goalType !== 'tracker' && Boolean(progress(records, g, date))).length;
  const checks = todayGoals.filter(g => g.goalType !== 'tracker').length;
  const usage = latestScreenTime(records, date, screenTime.deviceId);
  function onProgress(goalId, value, day) { if (!latest.current.records[goalId] || latest.current.records[goalId].deleted) return; try { save({ id: `progress_${goalId}_${day}`, type: 'progress', goalId, date: day, value }); } catch (e) { notify(e.message); } }
  function edit(record) { setList(null); setEntry({ type: record.type === 'event' ? record.kind : record.type, ...(record.type === 'transaction' ? { transaction: record } : { record }) }); }
  async function saveEntry(record) {
    if ((entry?.record || entry?.transaction) && latest.current.records[record.id]?.deleted) throw Error('This item was deleted. Create a new entry instead.');
    if (record.alarmTimes?.length) await prepareAlarmAccess();
    const saved = save(record);
    if (record.notificationTimes?.length && !record.alarmTimes?.length) enableNotifications().catch(e => notify(e.message));
    try { await syncNotifications({ ...latest.current.records, [record.id]: saved }, user.uid); setSyncRevision(n => n + 1); } catch { notify('Entry saved. Check Time for Android alarm permissions.'); }
  }
  function removeCategory(id) { if (transactions.some(t => t.categoryId === id)) return notify('This category has transactions. Delete those entries first.'); remove(id); }
  function add(type) { if (type === 'note') { setNoteLaunch({ create: true, requestId: crypto.randomUUID() }); go('note'); } else setEntry({ type }); }
  async function logout() { setSigningOut(true); try { await signOut(auth); } catch { notify('Could not sign out.'); setSigningOut(false); } }
  const goalProps = { records, date, onProgress, onEdit: edit, remove, notify };
  const panes = [
    <><div className="page-top"><div className="eyebrow">The daily briefing</div><h1>A fresh page for today.</h1><p className="lead">Small things, done with intention.</p><div className="progress-caption"><span>Today’s checkboxes</span><b>{complete} of {checks} complete</b></div><div className="progress-rail"><span style={{ width: `${checks ? complete / checks * 100 : 0}%` }} /></div></div><section><Heading title="Today’s goals"><button className="view-all" onClick={() => add('goal')}>+ New goal</button><button className="view-all" onClick={() => setList('goals')}>View all ↗</button></Heading>{todayGoals.map(goal => <GoalRow key={goal.id} goal={goal} {...goalProps} />)}{!todayGoals.length && <p className="empty">Add a goal to begin.</p>}</section><section className="section"><Heading title="Reminders & Meetings"><button className="view-all" onClick={() => add('reminder')}>+ New reminder</button><button className="view-all" onClick={() => setList('plans')}>View all ↗</button></Heading>{events.map(event => <PlanRow key={event.id} event={event} />)}{!events.length && <p className="empty">Nothing scheduled today.</p>}</section><section className="section mobile-screen-time"><Heading title="Today’s screen time"><button className="view-all" onClick={() => openTrack().catch(e => notify(e.message))}>Track ↗</button></Heading><strong>{screenTime.loading ? 'Reading…' : screenTime.allowed === false ? 'Enable usage access' : screenTime.error ? 'Usage unavailable' : usage ? screenTimeDuration(usage.totalMs) : 'No usage data yet'}</strong></section>{cloudEnabled(user.uid) && !localOnly && <div className="private-content"><LeetcodeSection uid={user.uid} notify={notify} /><NewsSection uid={user.uid} /><JobsSection uid={user.uid} /></div>}</>,
    <MoneyPage records={records} date={date} transactions={transactions} onEdit={edit} remove={remove} onAdd={() => add('transaction')} />,
    <NotesPage records={records} save={save} remove={remove} status={status} error={error} uid={user.uid} notify={notify} openNote={noteLaunch} shared={sharedNote} onShareDone={async id => { await acknowledgeNativeShare(id); setSharedNote(null); shareOpened.current = null; }} onConnect={localOnly ? undefined : onConnect} onBack={() => go('home')} />,
    <TimePage records={records} uid={user.uid} notify={notify} onEdit={edit} active={tab === 'time'} revision={syncRevision} />,
    <><div className="page-top"><div className="eyebrow">A place for everything</div><h1>Make it your own.</h1></div><div className="action-list">{[['goal','Add goal'],['reminder','Add reminder'],['meeting','Add meeting'],['category','Add categories'],['transaction','Add transaction'],['note','Add note']].map(([type, title]) => <button className="action-row" key={type} onClick={() => add(type)}><span className="plus">+</span><strong>{title}</strong><span className="arrow">↗</span></button>)}</div><button className="action-row" onClick={() => setList('reports')}><strong>Goal reports</strong><span className="arrow">↗</span></button><button className="action-row" onClick={() => enableNotifications().then(() => syncNotifications(records, user.uid)).then(() => notify('Notifications enabled')).catch(e => notify(e.message))}><strong>Notification permissions</strong><span className="arrow">↗</span></button><section className="account-card"><h3>{localOnly ? 'On this device.' : cloudEnabled(user.uid) ? 'Your connected diary.' : 'Connect your diary.'}</h3><p>{localOnly ? 'Goals, plans, notes and money stay on this device.' : cloudEnabled(user.uid) ? user.email : 'Sign in to your authorized Firebase account for synced records and your private Home edition.'}</p>{!localOnly && (cloudEnabled(user.uid) ? <button className="primary" disabled={signingOut} onClick={logout}>Sign out</button> : <button className="primary" disabled={restoring} onClick={onConnect}>Sign in</button>)}</section><p className="helper" role="status">{status}</p></>
  ];
  return <main className="mobile-app phone" data-active-tab={tab}><header className="app-header"><div className="brand"><img src={assetUrl('logo.png')} alt="Maikal" /><span>maikal<span className="brand-dot">.</span></span></div><div className="edition"><span>{new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}</span><small>{cloudEnabled(user.uid) ? 'Connected diary' : 'Local diary'}</small></div></header>{error && <div className="mobile-sync-error" role="status">{error}</div>}<div className="viewport" ref={viewport} onScroll={e => { const index = Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth); if (tabs[index]) { setTab(tabs[index][0]); history.replaceState(null, '', '#' + tabs[index][0]); } }} onPointerDown={e => { if (e.pointerType !== 'mouse' || e.target.closest('button,input,select,a,label,summary')) return; drag.current = { x: e.clientX, y: e.clientY, left: e.currentTarget.scrollLeft, locked: false }; }} onPointerMove={e => { const d = drag.current; if (!d) return; const dx = e.clientX - d.x; if (!d.locked && Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(e.clientY - d.y)) { d.locked = true; e.currentTarget.setPointerCapture(e.pointerId); e.currentTarget.style.scrollSnapType = 'none'; } if (d.locked) { e.currentTarget.scrollLeft = d.left - dx; e.preventDefault(); } }} onPointerUp={e => { const d = drag.current; drag.current = null; e.currentTarget.style.scrollSnapType = ''; if (d?.locked) go(tabs[Math.max(0, Math.min(4, Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth)))][0]); }} onPointerCancel={e => { drag.current = null; e.currentTarget.style.scrollSnapType = ''; }}>{panes.map((pane, i) => <section key={tabs[i][0]} role="tabpanel" aria-label={tabs[i][0]} className={`panel mobile-${tabs[i][0]} ${tab === tabs[i][0] ? 'active' : ''}`} inert={tab !== tabs[i][0]}>{pane}</section>)}</div><nav className="tab-bar" role="tablist" aria-label="Main navigation">{tabs.map(([name, icon], i) => <button key={name} role="tab" aria-label={name[0].toUpperCase() + name.slice(1)} aria-selected={tab === name} onClick={() => go(name)} onKeyDown={e => { if (['ArrowLeft','ArrowRight'].includes(e.key)) { e.preventDefault(); const next = (i + (e.key === 'ArrowRight' ? 1 : 4)) % 5; go(tabs[next][0]); e.currentTarget.parentNode.children[next].focus(); } }}><img src={icon} alt="" /></button>)}</nav>{list && <Dialog title={list === 'goals' ? 'All goals' : list === 'plans' ? 'Reminders & Meetings' : 'Goal reports'} onClose={() => setList(null)}>{list === 'goals' ? goals.map(goal => <GoalRow key={goal.id} goal={goal} {...goalProps} manage />) : list === 'plans' ? plans.map(event => <PlanRow key={event.id} event={event} manage onEdit={edit} remove={remove} />) : <ReportsSection goals={goals} records={records} date={date} />}{list !== 'reports' && !(list === 'goals' ? goals.length : plans.length) && <p className="empty">Nothing saved yet.</p>}</Dialog>}{entry && <EntryDialog key={`${entry.type}-${entry.record?.id || entry.transaction?.id || 'new'}-${entry.requestId || ''}`} entry={entry} categories={categories} save={saveEntry} removeCategory={removeCategory} notify={notify} onClose={() => setEntry(null)} />}</main>;
}
