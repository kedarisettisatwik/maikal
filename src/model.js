export const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const goalIcons = Array.from({ length: 30 }, (_, i) => `iconsGoal/icon${i + 1}.png`);
export const expenseIcons = ['bycicle', 'calendar', 'fast-food', 'fruits', 'fuel', 'giftbox', 'house', 'mansion', 'shopping-cart', 'transportation', 'videos'].map(n => `expenses/${n}.png`);
export const money = n => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
export function localDate(d = new Date()) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
export function offsetDate(offset, now = new Date()) { const d = new Date(now); d.setDate(d.getDate() + offset); return localDate(d); }
export const prettyDate = date => new Date(date + 'T12:00:00').toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
export const activeRecords = (records, type) => Object.values(records).filter(r => r && r.type === type && !r.deleted).sort((a, b) => b.updatedAt - a.updatedAt);
export function due(g, date) {
  if (g.deleted || (g.createdDate && g.createdDate > date)) return false;
  const s = g.schedule || { type: 'everyday' };
  return s.type === 'everyday' || s.type === 'days' && (s.days || []).includes(new Date(date + 'T12:00:00').getDay()) || s.type === 'dates' && (s.dates || []).includes(date) || s.type === 'range' && s.from <= date && date <= s.to;
}
export function progress(records, g, date) {
  const p = records[`progress_${g.id}_${date}`];
  return p && !p.deleted ? p.value : g.goalType === 'tracker' ? Number(g.trackerValues?.[date] || 0) : (g.completedDates || []).includes(date);
}
export const unit = g => g.trackerUnit === 'time' ? 'mins' : 'count';
export function describe(s) { return s.type === 'everyday' ? 'Every day' : s.type === 'days' ? s.days.map(d => weekdays[d]).join(', ') : s.type === 'dates' ? s.dates.join(', ') : `${s.from} → ${s.to}`; }
export function validateSchedule(s) {
  if (s.type === 'days' && !s.days.length) throw new Error('Choose at least one weekday.');
  if (s.type === 'dates' && (!s.dates.length || s.dates.some(d => !d))) throw new Error('Choose your dates.');
  if (s.type === 'range' && (!s.from || !s.to || s.from > s.to)) throw new Error('Choose a valid start and end date.');
  return s.type === 'dates' ? { ...s, dates: [...new Set(s.dates)] } : s;
}
export function transactionTotals(tx) { return tx.reduce((t, r) => { t[r.kind === 'income' ? 'income' : 'expense'] += r.amount; return t; }, { income: 0, expense: 0 }); }
export function expenseCategories(tx) {
  const totals = new Map();
  tx.filter(t => t.kind === 'expense').forEach(t => totals.set(t.categoryId, (totals.get(t.categoryId) || 0) + t.amount));
  return [...totals].map(([id, amount]) => { let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0; return { id, amount, color: `hsl(${hash % 360} 76% 46%)` }; }).sort((a, b) => b.amount - a.amount);
}
export function mergeRecords(local, dirty, remote) {
  const records = { ...local }, pending = { ...dirty };
  for (const r of remote) {
    if (!r || typeof r.id !== 'string' || !['goal', 'event', 'category', 'transaction', 'progress'].includes(r.type)) continue;
    if (!records[r.id] || r.updatedAt > records[r.id].updatedAt) { records[r.id] = r; delete pending[r.id]; }
    else if (r.updatedAt === records[r.id].updatedAt) delete pending[r.id];
  }
  return { records, dirty: pending };
}
export function authError(error) {
  const code = error.code || '';
  const messages = {
    'auth/email-already-in-use': 'An account already uses this email. Sign in or reset your password.',
    'auth/weak-password': 'Choose a stronger password with at least 6 characters.',
    'auth/password-does-not-meet-requirements': 'This password does not meet the project’s password requirements. Try a longer password with uppercase and lowercase letters, numbers, and symbols.',
    'auth/invalid-email': 'Enter a valid email address.',
    'auth/too-many-requests': 'Too many attempts. Please wait before trying again.',
    'auth/operation-not-allowed': 'Email/password authentication must be enabled in Firebase.',
    'auth/network-request-failed': 'Check your internet connection and try again.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/unauthorized-domain': 'Add this site to Firebase Authentication’s authorized domains.',
  };
  if (/invalid-credential|wrong-password|user-not-found/.test(code)) return 'The email or password is incorrect. Please try again.';
  return messages[code] || error.message || 'Something went wrong. Please try again.';
}
