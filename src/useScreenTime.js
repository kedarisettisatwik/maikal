import {screenGoal} from './task-model';
import { useEffect, useRef, useState } from 'react';
import { isNative, screenTimeTotals } from './native-notifications';
import { screenTimeRecords, screenTimeChanged } from './screen-time';

export default function useScreenTime(records, save, uid, restoring) {
  const [state, setState] = useState({ loading: isNative() });
  const latest = useRef({ records, save });
  latest.current = { records, save };
  useEffect(() => {
    if (!isNative() || restoring) return;
    let live = true, busy = false;
    const read = async () => {
      if (!live || busy || document.hidden) return;
      busy = true;
      try {
        const snapshot = await screenTimeTotals();
        if (!live) return;
        for (const record of screenTimeRecords(snapshot)) {
          if (screenTimeChanged(latest.current.records[record.id], record)) latest.current.save(record);
        }
        if(snapshot.goalConfig){const cfg=snapshot.goalConfig,old=latest.current.records[cfg.goalId];if(cfg.enabled||old){const goal=screenGoal(cfg,old);if(!old||['target','deleted','managedBy'].some(k=>old[k]!==goal[k]))latest.current.save(goal);if(cfg.enabled&&snapshot.allowed){for(const r of screenTimeRecords(snapshot)){const p={id:`progress_${goal.id}_${r.date}`,type:'progress',goalId:goal.id,date:r.date,value:Math.round(r.totalMs/600)/100};if(latest.current.records[p.id]?.value!==p.value)latest.current.save(p);}}}}
        setState({ allowed: !!snapshot.allowed, deviceId: snapshot.deviceId, loading: false });
      } catch { if (live) setState(previous => ({ ...previous, loading: false, error: true })); }
      finally { busy = false; }
    };
    read(); const timer = setInterval(read, 60000);
    document.addEventListener('visibilitychange', read);
    window.addEventListener('focus', read);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', read); window.removeEventListener('focus', read); };
  }, [uid, restoring]);
  return state;
}
