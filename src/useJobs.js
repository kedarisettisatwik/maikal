import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { canReadJobs } from './jobs-model';

export default function useJobs(uid) {
  const key = `maikal-jobs-${uid}`;
  const [state, setState] = useState(() => { try { const edition = canReadJobs(uid) ? JSON.parse(localStorage.getItem(key) || 'null') : null; return { edition, loading: !edition, error: '' }; } catch { return { edition: null, loading: true, error: '' }; } });
  useEffect(() => {
    if (!canReadJobs(uid)) return;
    return onSnapshot(doc(db, 'users', uid, 'maikalRecords', 'jobs_latest'), snapshot => {
      const edition = snapshot.exists() ? snapshot.data() : null;
      if (edition && !Array.isArray(edition.jobs)) { setState(previous => ({ ...previous, loading: false, error: 'Job openings are temporarily unavailable.' })); return; }
      if (!edition && snapshot.metadata.fromCache) { setState(previous => ({ ...previous, loading: false })); return; }
      setState({ edition, loading: false, error: '' });
      try { if (edition) localStorage.setItem(key, JSON.stringify(edition)); else localStorage.removeItem(key); } catch { /* Openings remain readable without caching. */ }
    }, () => setState(previous => ({ ...previous, loading: false, error: 'Job openings could not be refreshed. The last available edition is shown.' })));
  }, [uid, key]);
  return state;
}
