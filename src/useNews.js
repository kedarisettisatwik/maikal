import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { canReadNews } from './news-model';

export default function useNews(uid) {
  const key = `maikal-news-${uid}`;
  const [state, setState] = useState(() => { try { const edition = JSON.parse(localStorage.getItem(key) || 'null'); return { edition, loading: !edition, error: '' }; } catch { return { edition: null, loading: true, error: '' }; } });
  useEffect(() => {
    if (!canReadNews(uid)) return;
    return onSnapshot(doc(db, 'users', uid, 'maikalRecords', 'news_latest'), snapshot => {
    const edition = snapshot.exists() ? snapshot.data() : null;
    if (edition && !Array.isArray(edition.articles)) { setState(previous => ({ ...previous, loading: false, error: 'News is temporarily unavailable.' })); return; }
    if (!edition && snapshot.metadata.fromCache) { setState(previous => ({ ...previous, loading: false })); return; }
    setState({ edition, loading: false, error: '' });
    try { if (edition) localStorage.setItem(key, JSON.stringify(edition)); else localStorage.removeItem(key); } catch { /* News can still be read without a local cache. */ }
  }, () => setState(previous => ({ ...previous, loading: false, error: 'News could not be refreshed. Please try again later.' })));
  }, [uid, key]);
  return state;
}
