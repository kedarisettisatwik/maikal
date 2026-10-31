import { cloudEnabled } from '../storage';
import { isNative } from '../native-notifications';

export const apkRelease = 'android-v1.10.1';
export default function ApkDownload({ uid, restoring = false }) {
  if (isNative()) return null;
  if (restoring) return <button type="button" disabled>Checking APK edition…</button>;
  const edition = cloudEnabled(uid) ? 'Firebase' : 'Local';
  return <a href={`https://github.com/kedarisettisatwik/maikal/releases/download/${apkRelease}/Maikal-${edition}.apk`} title={`Download Maikal ${edition} edition`}>Install APK · {edition}</a>;
}
