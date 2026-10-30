import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = () => Capacitor.isNativePlatform();
const DiaryAlarms = registerPlugin('DiaryAlarms');
export const openAlarms = () => DiaryAlarms.openAlarms();
export const pendingNativeShare = () => DiaryAlarms.pendingShare();
export const acknowledgeNativeShare = id => DiaryAlarms.acknowledgeShare({id});
export const openNoteLink = url => DiaryAlarms.openNoteLink({url});
export async function enableNotifications() {
  if (!isNative()) throw new Error('Install the Android APK for notifications while the app is closed.');
  const result = await LocalNotifications.requestPermissions();
  if (result.display !== 'granted') throw new Error('Enable Maikal notifications in Android settings.');
  const exact = await LocalNotifications.checkExactNotificationSetting();
  if (exact.exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting();
}
export async function syncNotifications(records, uid = 'local') {
  if (!isNative()) return;
  const entries = Object.values(records).filter(r => !r.deleted && ['goal', 'event'].includes(r.type) && r.notificationTimes?.length)
    .map(r => ({ id: r.id, title: r.title, kind: r.kind || 'goal', goalType: r.goalType || 'checklist', schedule: r.schedule, createdDate: r.createdDate, times: r.notificationTimes }));
  const snapshot = Object.values(records).filter(r => ['goal', 'event', 'progress', 'transaction', 'note'].includes(r.type));
  await DiaryAlarms.replace({ entries, uid, records: snapshot });
}
export const pendingNativeActions = uid => DiaryAlarms.pendingActions({ uid });
export const acknowledgeNativeActions = ids => DiaryAlarms.acknowledgeActions({ ids });
export const consumeNativeLaunch = () => DiaryAlarms.consumeLaunch();
export const acknowledgeNativeLaunch = requestId => DiaryAlarms.acknowledgeLaunch({ requestId });
