import { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { mergeRecords } from './model';

export default function useRecords(uid, notify) {
  const key = `maikal-v2-${uid}`;
  const [cache, setCache] = useState(() => { try { const c = JSON.parse(localStorage.getItem(key) || '{}'); return { records: c.records || {}, dirty: c.dirty || {} }; } catch { return { records: {}, dirty: {} }; } });
  const ref = useRef(cache);
  const alive = useRef(true);
  const ready = useRef(false);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);
  const [retry, setRetry] = useState(0);
  const inflight = useRef(new Map());
  const persist = next => {
    ref.current = next;
    if (!alive.current) return;
    setCache(next);
    try { localStorage.setItem(key, JSON.stringify(next)); }
    catch { notify('Browser storage is unavailable. Keep a cloud connection to save changes.'); }
  };
  async function push(record) {
    if (!ready.current || !alive.current || inflight.current.get(record.id) === record.updatedAt) return;
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
    const stop = onSnapshot(collection(db, 'users', uid, 'maikalRecords'), { includeMetadataChanges: true }, snapshot => {
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
  }, [uid, retry]);
  const save = record => {
    const r = { ...record, updatedAt: Math.max(Date.now(), (ref.current.records[record.id]?.updatedAt || 0) + 1) };
    persist({ records: { ...ref.current.records, [r.id]: r }, dirty: { ...ref.current.dirty, [r.id]: true } });
    push(r);
    return r;
  };
  const remove = id => { const record = ref.current.records[id]; if (record && window.confirm('Delete this item?')) { save({ ...record, deleted: true }); notify('Deleted'); } };
  const count = Object.keys(cache.dirty).length;
  return { records: cache.records, save, remove, error, status: count ? `${count} change${count === 1 ? '' : 's'} saved locally · ${connected ? 'syncing' : 'sync pending'}` : connected ? 'All changes synced' : 'Using local records · connecting…' };
}
