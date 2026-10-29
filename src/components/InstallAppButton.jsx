import { useEffect, useState } from 'react';
import { isNative } from '../native-notifications';
import toast from 'react-hot-toast';

let deferredPrompt = null;
if (typeof window !== 'undefined') window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault(); deferredPrompt = event; window.dispatchEvent(new Event('maikal-install-ready'));
});
export default function InstallAppButton() {
  const installed = () => Boolean(window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone);
  const [standalone, setStandalone] = useState(installed);
  const [, refresh] = useState(0);
  useEffect(() => {
    const ready = () => refresh(n => n + 1), done = () => { deferredPrompt = null; setStandalone(true); };
    window.addEventListener('maikal-install-ready', ready); window.addEventListener('appinstalled', done);
    return () => { window.removeEventListener('maikal-install-ready', ready); window.removeEventListener('appinstalled', done); };
  }, []);
  async function install() {
    if (deferredPrompt) {
      const event = deferredPrompt; deferredPrompt = null;
      try { await event.prompt(); const choice = await event.userChoice; if (choice.outcome === 'accepted') toast.success('Maikal is being installed'); }
      catch { toast('Use your browser menu → Add to Home screen → Install.'); }
    } else if (/iPad|iPhone|iPod/.test(navigator.userAgent) || navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1) toast('In Safari: tap Share → Add to Home Screen → Add.', { duration: 6500 });
    else toast('Open Maikal in Chrome or Edge, then use the browser menu → Add to Home screen or Install app.', { duration: 6500 });
  }
  return standalone || isNative() ? null : <button type="button" onClick={install}>Install app</button>;
}
