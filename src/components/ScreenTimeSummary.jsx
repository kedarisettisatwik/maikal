import { isNative, openTrack } from '../native-notifications';
import { cloudEnabled } from '../storage';
import { latestScreenTime, screenTimeDuration } from '../screen-time';

export default function ScreenTimeSummary({ records, date, uid, state, notify }) {
  const native = isNative();
  const record = latestScreenTime(records, date, native ? state.deviceId : undefined);
  const open = () => openTrack().catch(e => notify(e.message));
  return <div className="note screen-time-summary">
    <h3>Today’s screen time</h3>
    {native && state.loading ? <p>Reading device usage…</p> : native && state.error ? <><p>Usage is unavailable. Open Track to check access.</p><button onClick={open}>Open Track</button></> : native && state.allowed === false ? <><p>Enable Usage access to see your screen time.</p><button onClick={open}>Set up Track</button></> : record ? <>
      <div className="screen-time-value">{screenTimeDuration(record.totalMs)}</div>
      <p>{native ? 'This phone' : record.deviceName} · Updated {new Date(record.observedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{!native && record.timezone ? ` · ${record.timezone}` : ''}</p>
      {native ? <button onClick={open}>Open Track</button> : <p>Last reported by the Android APK. Refreshes when Maikal syncs from your phone.</p>}
    </> : <p>{cloudEnabled(uid) ? 'Open the Firebase APK and enable Usage access to sync this phone’s daily total.' : 'Connect Firebase to see daily screen time synced from your Android APK.'}</p>}
    {!native && record && <small>Latest reporting phone · totals are not combined across devices.</small>}
  </div>;
}
