import SignInForm from './components/SignInForm';
import toast from 'react-hot-toast';
import { notify } from './notifications';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, authReady } from './firebase';
import Dashboard from './components/Dashboard.jsx';
import { Dialog } from './components/EntryDialog';
import { cloudEnabled, LOCAL_UID, mergeLocalIntoCloud } from './storage';

export { default as AuthScreen } from './components/SignInForm';
export default function App() {
  const [user, setUser] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [restoring, setRestoring] = useState(true);
  useEffect(() => {
    let live = true, stop;
    authReady.then(() => { if (live) stop = onAuthStateChanged(auth, next => {
      if (!live) return;
      if (next && !cloudEnabled(next.uid)) {
        signOut(auth).catch(() => {}); toast.error('Cloud storage is available only for the authorized Maikal account.');
        setUser(null); setRestoring(false); return;
      }
      if (next) {
        try { mergeLocalIntoCloud(next.uid); }
        catch { toast.error('Could not merge local data. Free device storage and reconnect.'); setRestoring(false); return; }
        setConnecting(false);
      }
      setUser(next); setRestoring(false);
    }, () => { setRestoring(false); toast.error('Firebase is unavailable. Your local diary is ready.'); });
    }).catch(() => { if (live) setRestoring(false); });
    return () => { live = false; stop?.(); };
  }, []);
  return <><Dashboard key={user?.uid || LOCAL_UID} user={user || { uid: LOCAL_UID, email: 'Local diary - this device' }} notify={notify} onConnect={() => setConnecting(true)} restoring={restoring} />
    {connecting && <Dialog title="Connect Firebase" onClose={() => setConnecting(false)}><SignInForm /></Dialog>}
  </>;
}
