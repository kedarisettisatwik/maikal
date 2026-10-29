import { useState } from 'react';

export function NotificationTags({ times = [] }) {
  return times.length ? <div className="notification-tags" aria-label="Notification times">{times.map(time => <span className="tag" key={time}>◷ {time}</span>)}</div> : null;
}
export default function NotificationTimes({ times, onChange }) {
  const [draft, setDraft] = useState('09:00');
  return <div className="notification-editor"><span className="label">Notification times</span>
    <div className="notification-tags">{times.map(time => <span className="tag" key={time}>◷ {time} <button type="button" aria-label={`Remove notification ${time}`} onClick={() => onChange(times.filter(t => t !== time))}>×</button></span>)}</div>
    <div className="notification-input"><input type="time" aria-label="Add notification time" value={draft} onChange={e => setDraft(e.target.value)} /><button type="button" disabled={!draft || times.includes(draft)} onClick={() => onChange([...times, draft].sort())}>+ Add time</button></div>
    <p className="small">Device-local times on scheduled days. Closed-app notifications require the Android APK and notification permission.</p>
  </div>;
}
