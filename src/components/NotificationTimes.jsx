import { useState } from 'react';

export function NotificationTags({ times = [] }) {
  return times.length ? <div className="notification-tags" aria-label="Notification times">{times.map(time => <span className="tag" key={time}>◷ {time}</span>)}</div> : null;
}
export default function NotificationTimes({ times, onChange, mode = 'notification' }) {
  const [draft, setDraft] = useState('09:00');
  const alarm = mode === 'alarm';
  return <div className="notification-editor"><span className="label">{alarm ? 'Alarm times' : 'Notification times'}</span>
    <div className="notification-tags">{times.map(time => <span className="tag" key={time}>◷ {time} <button type="button" aria-label={`Remove ${mode} ${time}`} onClick={() => onChange(times.filter(t => t !== time))}>×</button></span>)}</div>
    <div className="notification-input"><input type="time" aria-label={`Add ${mode} time`} value={draft} onChange={e => setDraft(e.target.value)} /><button type="button" disabled={!draft || times.includes(draft)} onClick={() => onChange([...times, draft].sort())}>{alarm ? '+ Add alarm time' : '+ Add time'}</button></div>
    <p className="small">{alarm ? 'Optional ringing alarms on scheduled days, separate from notifications. Leave empty for none. Listed in Menu → Alarms, with five-minute snooze and Stop. Android alarm and lock-screen permissions are required.' : 'Device-local times on scheduled days. Closed-app notifications require the Android APK and notification permission.'}</p>
  </div>;
}
