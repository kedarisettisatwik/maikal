import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, query, setDoc, where } from 'firebase/firestore';
import { db } from './firebase';
import { mergeRecords } from './model';
import { cloudEnabled, readCache } from './storage';
import { isNative, pendingNativeActions, acknowledgeNativeActions } from './native-notifications';
import { importNativeCompletions } from './native-actions';

export default function useRecords(uid, notify) {
  const key = `maikal-v2-${uid}`;
  const cloud = cloudEnabled(uid);
  const [cache, setCache] = useState(() => readCache(key));
  const ref = useRef(cache);
  const alive = useRef(true);
  const ready = useRef(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [retry, setRetry] = useState(0);
  const inflight = useRef(new Map());
  const persist = next => {
    if (!alive.current) return;
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { notify('Device storage is full or unavailable. This change may be lost when you close the app.'); throw new Error('Could not save to device storage.'); }
    ref.current = next; setCache(next);
  };
  async function push(record) {
    if (!cloud || !ready.current || !alive.current || inflight.current.get(record.id) === record.updatedAt) return;
    inflight.current.set(record.id, record.updatedAt);
    try {
      await setDoc(doc(db, 'users', uid, 'maikalRecords', record.id), record);
      if (!alive.current) return;
      if (ref.current.records[record.id]?.updatedAt === record.updatedAt) { const dirty = { ...ref.current.dirty }; delete dirty[record.id]; persist({ ...ref.current, dirty }); }
      setError('');
    } catch (e) {
      if (alive.current) setError(e.code === 'permission-denied' ? 'Cloud access denied. Your changes are saved on this device. Check the Firestore rules for your account.' : 'Cloud sync is unavailable. Your changes are saved on this device and will retry when connected.');
    } finally { if (inflight.current.get(record.id) === record.updatedAt) inflight.current.delete(record.id); }
  }
  useEffect(() => {
    alive.current = true; ready.current = false;
    if (!cloud) return () => { alive.current = false; };
    const stop = onSnapshot(query(collection(db, 'users', uid, 'maikalRecords'), where('type', 'in', ['goal', 'event', 'category', 'transaction', 'progress', 'note', 'screentime'])), { includeMetadataChanges: true }, snapshot => {
      if (!alive.current) return;
      persist(mergeRecords(ref.current.records, ref.current.dirty, snapshot.docs.filter(d => !d.metadata.hasPendingWrites).map(d => d.data())));
      setConnected(!snapshot.metadata.fromCache);
      if (!snapshot.metadata.fromCache) {
        ready.current = true; setError('');
        Object.keys(ref.current.dirty).forEach(id => { if (ref.current.records[id]) push(ref.current.records[id]); });
      }
    }, e => {
      ready.current = false; setConnected(false);
      setError(e.code === 'permission-denied' ? 'Cloud access denied. Changes remain on this device. Check Firestore rules for users/{uid}/maikalRecords.' : 'Cloud sync is unavailable. Changes remain on this device.');
    });
    const online = () => setRetry(n => n + 1);
    const offline = () => setConnected(false);
    window.addEventListener('online', online); window.addEventListener('offline', offline);
    return () => { alive.current = false; ready.current = false; stop(); window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
    // The ref owns the latest cache; reconnecting must not reinitialize local records.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, retry, cloud]);
  const save = record => {
    const r = { ...record, updatedAt: Math.max(Date.now(), (ref.current.records[record.id]?.updatedAt || 0) + 1) };
    persist({ records: { ...ref.current.records, [r.id]: r }, dirty: cloud ? { ...ref.current.dirty, [r.id]: true } : {} });
    push(r);
    return r;
  };
  useEffect(() => {
    if (!isNative()) return;
    let live = true, running = false;
    const flush = async () => {
      if (!live || running || document.hidden) return;
      running = true;
      try {
        const { actions = [] } = await pendingNativeActions(uid);
        if (!live) return;
        const ids = importNativeCompletions(actions, uid, () => ref.current.records, save);
        if (ids.length) await acknowledgeNativeActions(ids);
      } catch { if (live) setError('A notification completion is saved on Android and will retry importing into your diary.'); }
      finally { running = false; }
    };
    flush(); const timer = setInterval(flush, 1500);
    document.addEventListener('visibilitychange', flush);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', flush); };
  }, [uid]);
  const remove = id => { const record = ref.current.records[id]; if (record && window.confirm('Delete this item?')) { save({ ...record, deleted: true }); notify('Deleted'); } };
  const count = Object.keys(cache.dirty).length;
  return { records: cache.records, save, remove, error, status: !cloud ? 'Saved on this device' : count ? `${count} change${count === 1 ? '' : 's'} saved locally · ${connected ? 'syncing' : 'sync pending'}` : connected ? 'All changes synced' : 'Using local records · connecting…' };
}
