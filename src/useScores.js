import { useEffect, useState } from 'react';
import { scoreNudgesEnabled, scoreNudgesKey, scoreSummary, scoreUpdates } from './score-model';
import { enableNotifications, isNative, syncNotifications } from './native-notifications';

export default function useScores(records, save, date, uid, restoring, notify) {
  const [nudges, setNudges] = useState(() => scoreNudgesEnabled(uid));
  useEffect(() => {
    if (restoring) return;
    try { for (const update of scoreUpdates(records, date)) save(update); }
    catch { notify('Could not save your score. Please check device storage.'); }
  }, [records, date, restoring]);
  async function setReminders(enabled) {
    try {
      if (enabled && isNative()) await enableNotifications();
      localStorage.setItem(scoreNudgesKey(uid), enabled ? 'on' : 'off');
      setNudges(enabled);
      await syncNotifications(records, uid);
    } catch (error) { notify(error.message || 'Could not update score reminders.'); }
  }
  return { ...scoreSummary(records, date), nudges, setReminders };
}
