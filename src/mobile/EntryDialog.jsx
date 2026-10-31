import toast, { Toaster } from 'react-hot-toast';
import { assetUrl } from '../assets';
import { useLayoutEffect, useRef, useState } from 'react';
import { isNative } from '../native-notifications';
import { applyViewMode } from '../view-mode';
import NotificationTimes from '../components/NotificationTimes';
import ActionIconButton from '../components/ActionIconButton';
import { expenseIcons, goalIcons, localDate, validateSchedule, weekdays } from '../model';

export function Dialog({ children, title = 'A new entry', onClose }) {
  const ref = useRef(null);
  const native = isNative();
  useLayoutEffect(() => {
    const dialog = ref.current, viewport = document.querySelector('meta[name="viewport"]');
    const previous = viewport?.getAttribute('content');
    const previousDialog = document.documentElement.getAttribute('data-maikal-dialog');
    if (native) document.documentElement.setAttribute('data-maikal-dialog', 'true');
    if (native) viewport?.setAttribute('content', 'width=device-width, initial-scale=1, minimum-scale=0.5, maximum-scale=5, user-scalable=yes');
    dialog.showModal();
    return () => { dialog.close(); if (native) { const mode = document.documentElement.dataset.maikalView; if (mode) applyViewMode(mode); else if (previous) viewport?.setAttribute('content', previous); if (previousDialog === null) document.documentElement.removeAttribute('data-maikal-dialog'); else document.documentElement.setAttribute('data-maikal-dialog',previousDialog); } };
  }, [native]);
  return <dialog ref={ref} className={native ? 'native-form-page' : undefined} onCancel={e => { e.preventDefault(); onClose(); }}><div className="dialoghead"><span className="kicker">{title}</span><button type="button" onClick={onClose} aria-label={native ? 'Back to diary' : 'Close dialog'}>{native ? '← Back' : '×'}</button></div>{children}<Toaster toasterId="dialog" position="top-center" toastOptions={{ duration: 4200 }} /></dialog>;
}
export function Icon({ record }) { return record.iconMode === 'emoji' ? <span style={{ fontSize: 26 }}>{record.icon}</span> : record.icon ? <img src={assetUrl(record.icon)} alt="" /> : null; }
export function IconPicker({ paths, value, onChange, children }) {
  return <div className="icons" aria-label="Choose an icon">{paths.map((path, i) => <button key={path} type="button" aria-pressed={value === path} aria-label={path.startsWith('iconsGoal') ? `Goal icon ${i + 1}` : path.split('/').pop().replace('.png', '')} className={value === path ? 'selected' : ''} onClick={() => onChange(path)}><img src={assetUrl(path)} alt="" /></button>)}{children}</div>;
}
export function Schedule({ value, onChange }) {
  const types = [['everyday', 'Every day'], ['days', 'Particular days'], ['dates', 'Particular dates'], ['range', 'Date range']];
  const update = patch => onChange({ ...value, ...patch });
  return <div><span className="label">Repeat schedule</span><div className="segments">{types.map(([type, label]) => <button key={type} type="button" aria-pressed={value.type === type} className={value.type === type ? 'selected' : ''} onClick={() => update({ type })}>{label}</button>)}</div>
    {value.type === 'days' && <div className="days">{weekdays.map((day, i) => <label key={day}><input type="checkbox" checked={value.days.includes(i)} onChange={e => update({ days: e.target.checked ? [...value.days, i].sort() : value.days.filter(d => d !== i) })} />{day}</label>)}</div>}
    {value.type === 'dates' && <><div className="dates">{value.dates.map((date, i) => <div key={i}><input type="date" value={date} required aria-label={`Scheduled date ${i + 1}`} onChange={e => update({ dates: value.dates.map((d, j) => i === j ? e.target.value : d) })} /><button type="button" aria-label="Remove date" disabled={value.dates.length === 1} onClick={() => update({ dates: value.dates.filter((_, j) => i !== j) })}>×</button></div>)}</div><button type="button" style={{ marginBottom: 20 }} onClick={() => update({ dates: [...value.dates, ''] })}>+ Add another date</button></>}
    {value.type === 'range' && <div className="row"><label className="field"><span>From</span><input type="date" value={value.from} max={value.to || undefined} onChange={e => update({ from: e.target.value })} required /></label><label className="field"><span>To</span><input type="date" value={value.to} min={value.from || undefined} onChange={e => update({ to: e.target.value })} required /></label></div>}
  </div>;
}
const initialSchedule = () => ({ type: 'everyday', days: [], dates: [''], from: '', to: '' });
export default function EntryDialog({ entry, categories, save, removeCategory, notify, onClose }) {
  const type = entry.type;
  const editing = entry.transaction || entry.record;
  const [schedule, setSchedule] = useState(() => editing?.schedule || initialSchedule());
  const [icon, setIcon] = useState(editing?.icon || (type === 'category' ? expenseIcons[3] : goalIcons[0]));
  const [iconMode, setIconMode] = useState(editing?.iconMode || 'select');
  const [emoji, setEmoji] = useState(editing?.iconMode === 'emoji' ? editing.icon : '');
  const [goalType, setGoalType] = useState(editing?.goalType || 'checklist');
  const [allDay, setAllDay] = useState(editing?.allDay ?? true);
  const [kind, setKind] = useState(editing?.kind || entry.kind || 'expense');
  const [categoryId, setCategoryId] = useState(editing?.categoryId || '');
  const [error, setError] = useState('');
  const [notificationTimes, setNotificationTimes] = useState(editing?.notificationTimes || []);
  const [alarmTimes, setAlarmTimes] = useState(editing?.alarmTimes || []);
  const [saving, setSaving] = useState(false);
  const title = editing && type !== 'transaction' ? `Edit ${type}` : type === 'goal' ? 'Create a goal' : type === 'category' ? 'Create a category' : type === 'transaction' ? editing ? 'Edit transaction' : 'Add a transaction' : `Create a ${type}`;
  async function submit(e) {
    e.preventDefault(); setError('');
    if (saving) return;
    setSaving(true);
    const data = new FormData(e.currentTarget);
    try {
      let record = { ...editing, id: editing?.id || crypto.randomUUID(), type };
      if (type === 'goal' || type === 'meeting' || type === 'reminder') {
        const title = data.get('title').trim();
        if (!title) throw new Error('Enter a title.');
        record = { ...record, title, schedule: validateSchedule(schedule), createdDate: editing?.createdDate || localDate(), notificationTimes };
        if (isNative()) record.alarmTimes = [...new Set(alarmTimes)].sort();
        if (type === 'goal') {
          if (iconMode === 'emoji' && !emoji.trim()) throw new Error('Enter an emoji or choose another icon style.');
          record = { ...record, iconMode, icon: iconMode === 'select' ? icon : iconMode === 'emoji' ? emoji.trim() : '', goalType, trackerUnit: data.get('trackerUnit') || 'count' };
        } else {
          const startTime = allDay ? '' : data.get('startTime'), endTime = allDay ? '' : data.get('endTime');
          if (!allDay && (!startTime || !endTime || endTime <= startTime)) throw new Error('End time must be after start time.');
          record = { ...record, type: 'event', kind: type, allDay, startTime, endTime, notes: data.get('notes').trim(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone };
        }
      } else if (type === 'category') {
        const name = data.get('name').trim();
        if (!name) throw new Error('Enter a category name.');
        if (categories.some(c => c.id !== editing?.id && c.kind === kind && c.name.toLowerCase() === name.toLowerCase())) throw new Error('That category already exists.');
        if (iconMode === 'emoji' && !emoji.trim()) throw new Error('Enter your category emoji or choose a provided icon.');
        record = { ...record, name, kind, iconMode, icon: iconMode === 'emoji' ? emoji.trim() : icon };
      } else {
        const amount = Number(data.get('amount')), category = categories.find(c => c.id === categoryId && c.kind === kind);
        if (!Number.isFinite(amount) || amount <= 0) throw new Error('Enter a positive amount.');
        if (!category) throw new Error('Choose a matching category first.');
        record = { ...record, kind, amount: Math.round(amount * 100), categoryId, date: data.get('date'), note: data.get('note').trim() };
      }
      await save(record); onClose(); toast.success(editing ? 'Updated' : 'Saved');
    } catch (error) { setError(error.message); toast.error(error.message, { toasterId: 'dialog' }); }
    finally { setSaving(false); }
  }
  return <Dialog onClose={onClose}><form onSubmit={submit}><h2>{title}</h2>
    {(type === 'goal' || type === 'meeting' || type === 'reminder') && <>
      <label className="field"><span>Title</span><input name="title" defaultValue={editing?.title} required maxLength={150} placeholder={type === 'goal' ? 'e.g. Read for 20 minutes' : 'Give your plan a name'} /></label>
      {type === 'goal' ? <><span className="label">Make it yours</span>{iconMode === 'select' && <IconPicker paths={goalIcons} value={icon} onChange={setIcon} />}<div className="row"><label className="field"><span>Icon style</span><select value={iconMode} onChange={e => setIconMode(e.target.value)}><option value="select">Choose an icon</option><option value="emoji">My own emoji</option><option value="none">No icon</option></select></label>{iconMode === 'emoji' && <label className="field"><span>Your emoji</span><input value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={16} /></label>}</div><div className="row"><label className="field"><span>Goal type</span><select value={goalType} onChange={e => setGoalType(e.target.value)}><option value="checklist">Checkbox</option><option value="tracker">Tracker</option></select></label>{goalType === 'tracker' && <label className="field"><span>Track in</span><select name="trackerUnit" defaultValue={editing?.trackerUnit || 'count'}><option value="count">Count</option><option value="time">Minutes</option></select></label>}</div></> : <label className="field"><span>Notes or location</span><textarea name="notes" defaultValue={editing?.notes} rows={2} maxLength={1000} placeholder="Add a little context" /></label>}
      <Schedule value={schedule} onChange={setSchedule} />
      {type !== 'goal' && <><label className="field"><input type="checkbox" checked={allDay} onChange={e => setAllDay(e.target.checked)} /> All day</label>{!allDay && <div className="row"><label className="field"><span>Start time</span><input name="startTime" defaultValue={editing?.startTime} type="time" required /></label><label className="field"><span>End time</span><input name="endTime" defaultValue={editing?.endTime} type="time" required /></label></div>}<p className="small" style={{ marginBottom: 20 }}>Times use your device’s local timezone. Notifications follow the times selected below.</p></>}
      <NotificationTimes times={notificationTimes} onChange={setNotificationTimes} />
      {isNative() && <NotificationTimes mode="alarm" times={alarmTimes} onChange={setAlarmTimes} />}
    </>}
    {type === 'category' && <><div className="row"><label className="field"><span>Name</span><input name="name" defaultValue={editing?.name} maxLength={60} placeholder="e.g. Groceries" required /></label><label className="field"><span>Type</span><select value={kind} onChange={e => setKind(e.target.value)}><option value="expense">Expense</option><option value="income">Income</option></select></label></div><span className="label">Category icon</span><IconPicker paths={expenseIcons} value={iconMode === 'select' ? icon : ''} onChange={value => { setIcon(value); setIconMode('select'); }}><input className={`category-emoji-square ${iconMode === 'emoji' ? 'selected' : ''}`} aria-label="Your category emoji" title="Type or paste your own emoji" value={emoji} maxLength={16} autoComplete="off" onChange={e => { setEmoji(e.target.value); setIconMode('emoji'); }} /></IconPicker><p className="small category-emoji-help">Use the empty square to type or paste your own emoji.</p></>}
    {type === 'transaction' && <><div className="row"><label className="field"><span>Type</span><select value={kind} onChange={e => { setKind(e.target.value); setCategoryId(''); }}><option value="expense">Expense</option><option value="income">Income</option></select></label><label className="field"><span>Amount (INR)</span><input name="amount" type="number" min="0.01" max="999999999" step="0.01" defaultValue={editing ? (editing.amount / 100).toFixed(2) : ''} required placeholder="0.00" /></label></div><div className="row"><label className="field"><span>Category</span><select value={categoryId} onChange={e => setCategoryId(e.target.value)} required><option value="">Choose a category</option>{categories.filter(c => c.kind === kind).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label><label className="field"><span>Date</span><input name="date" type="date" defaultValue={editing?.date || localDate()} required /></label></div>{!categories.some(c => c.kind === kind) && <p className="report-text">Create an {kind} category using Menu → Create category first.</p>}<label className="field"><span>Note (optional)</span><input name="note" maxLength={200} defaultValue={editing?.note || ''} placeholder="What was it for?" /></label></>}
    {error && <p className="error" role="alert" style={{ marginBottom: 14 }}>{error}</p>}
    <button type="submit" disabled={saving} className="primary wide">{saving ? 'Saving…' : type === 'transaction' ? editing ? 'Update transaction' : 'Save transaction' : type === 'category' ? 'Add category' : editing ? `Update ${type}` : `Create ${type}`}</button>
    {type === 'category' && <div>{categories.map(c => <div className="item" key={c.id}><Icon record={c} /><div className="body">{c.name}<small>{c.kind}</small></div><ActionIconButton action="delete" label={`Delete category ${c.name}`} onClick={() => removeCategory(c.id)} /></div>)}</div>}
  </form></Dialog>;
}
export function NewDialog({ onChoose, onClose }) {
  return <Dialog title="What would you like to add?" onClose={onClose}><div className="choices">{[['goal', 'A goal', 'Build a habit or track your progress.'], ['meeting', 'A meeting', 'Make time for a conversation.'], ['reminder', 'A reminder', 'Keep something important in sight.'], ['category', 'A category', 'Organize your income and expenses.'], ['transaction', 'A transaction', 'Record money coming in or going out.']].map(([type, title, subtitle]) => <button key={type} onClick={() => onChoose(type)}>{title}<small>{subtitle}</small></button>)}</div></Dialog>;
}
