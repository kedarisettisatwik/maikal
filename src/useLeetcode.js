import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from './firebase';
import { canReadLeetcode, leetcodeDay } from './leetcode-model';
import { completeDailyProblem, ensureDailyProblem } from './leetcode-store';

export default function useLeetcode(uid, notify) {
  const [date, setDate] = useState(leetcodeDay);
  const [entries, setEntries] = useState(() => { try { const data = JSON.parse(localStorage.getItem(`maikal-leetcode-${uid}`) || '[]'); return Array.isArray(data) ? data : []; } catch { return []; } });
  const [loading, setLoading] = useState(true), [error, setError] = useState(''), [pending, setPending] = useState(''), [retry, setRetry] = useState(0);
  useEffect(() => { const update = () => setDate(leetcodeDay()), online = () => setRetry(n => n + 1); const timer = setInterval(update, 30000); document.addEventListener('visibilitychange', update); window.addEventListener('online', online); return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update); window.removeEventListener('online', online); }; }, []);
  useEffect(() => {
    if (!canReadLeetcode(uid)) return;
    let live = true; setLoading(true); setError('');
    const stop = onSnapshot(query(collection(db, 'users', uid, 'maikalRecords'), where('type', '==', 'leetcodeDaily')), snapshot => {
      const values = snapshot.docs.map(doc => doc.data()).sort((a, b) => b.date.localeCompare(a.date));
      setEntries(values);
      try { localStorage.setItem(`maikal-leetcode-${uid}`, JSON.stringify(values)); } catch { /* Firestore remains the source of truth. */ }
    }, () => { if (live) setError('Your problem history could not be refreshed. Please check your connection.'); });
    ensureDailyProblem(uid, date).then(assignment => { if (!live) return; setEntries(previous => [assignment, ...previous.filter(entry => entry.id !== assignment.id)].sort((a, b) => b.date.localeCompare(a.date))); }).catch(error => { if (live) setError(error.message); }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; stop(); };
  }, [uid, date, retry]);
  async function toggle(assignment, completed) {
    setPending(assignment.id);
    setEntries(previous => previous.map(entry => entry.id === assignment.id ? { ...entry, completed } : entry));
    try { await completeDailyProblem(uid, assignment, completed); notify(completed ? 'Problem marked completed' : 'Problem marked incomplete'); }
    catch { setEntries(previous => previous.map(entry => entry.id === assignment.id ? { ...entry, completed: assignment.completed } : entry)); notify('Could not save completion. Please try again.'); }
    finally { setPending(''); }
  }
  return { date, today: entries.find(entry => entry.date === date), history: entries.filter(entry => entry.date < date), loading, error, pending, toggle };
}
