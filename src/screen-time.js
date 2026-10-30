export function screenTimeRecords(snapshot) {
  if (!snapshot?.allowed || !snapshot.deviceId) return [];
  return (snapshot.days || []).filter(day => /^\d{4}-\d{2}-\d{2}$/.test(day.date) && Number.isFinite(day.totalMs) && day.totalMs >= 0 && day.totalMs <= 25 * 3600000 && Number.isFinite(day.observedAt))
    .map(day => ({ id: `screentime_${snapshot.deviceId}_${day.date}`, type: 'screentime', date: day.date, totalMs: day.totalMs, observedAt: day.observedAt, deviceId: snapshot.deviceId, deviceName: snapshot.deviceName || 'Android phone', timezone: snapshot.timezone || '', source: 'android' }));
}
export function screenTimeChanged(previous, next) {
  return !previous || previous.deleted || Math.floor(previous.totalMs / 60000) !== Math.floor(next.totalMs / 60000) || next.observedAt - previous.observedAt >= 300000;
}
export function latestScreenTime(records, date, deviceId) {
  return Object.values(records).filter(r => r.type === 'screentime' && !r.deleted && r.date === date && Number.isFinite(r.totalMs) && r.totalMs >= 0 && (!deviceId || r.deviceId === deviceId))
    .sort((a, b) => b.observedAt - a.observedAt)[0];
}
export function screenTimeDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  return minutes === 0 && ms > 0 ? '< 1 min' : `${minutes >= 60 ? Math.floor(minutes / 60) + ' h ' : ''}${minutes % 60} min`;
}
