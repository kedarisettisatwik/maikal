import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = () => Capacitor.isNativePlatform();
const DiaryAlarms = registerPlugin('DiaryAlarms');
export async function enableNotifications() {
  if (!isNative()) throw new Error('Install the Android APK for notifications while the app is closed.');
  const result = await LocalNotifications.requestPermissions();
  if (result.display !== 'granted') throw new Error('Enable Maikal notifications in Android settings.');
  const exact = await LocalNotifications.checkExactNotificationSetting();
  if (exact.exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting();
}
export async function syncNotifications(records) {
  if (!isNative()) return;
  const entries = Object.values(records).filter(r => !r.deleted && ['goal', 'event'].includes(r.type) && r.notificationTimes?.length)
    .map(r => ({ id: r.id, title: r.title, kind: r.kind || 'goal', schedule: r.schedule, createdDate: r.createdDate, times: r.notificationTimes }));
  await DiaryAlarms.replace({ entries });
}
