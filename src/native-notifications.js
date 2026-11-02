import { Capacitor, registerPlugin } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

export const isNative = () => Capacitor.isNativePlatform();
const DiaryAlarms = registerPlugin('DiaryAlarms');
export const openAlarms = () => DiaryAlarms.openAlarms();
export const prepareAlarmAccess = () => DiaryAlarms.prepareAlarmAccess();
export const openTrack = () => DiaryAlarms.openTrack();
export const screenTimeTotals = () => DiaryAlarms.screenTimeTotals();
export const pendingNativeShare = () => DiaryAlarms.pendingShare();
export const acknowledgeNativeShare = id => DiaryAlarms.acknowledgeShare({id});
export const openNoteLink = url => DiaryAlarms.openNoteLink({url});
export async function enableNotifications() {
  if (!isNative()) throw new Error('Install the Android APK for notifications while the app is closed.');
  const result = await LocalNotifications.requestPermissions();
  if (result.display !== 'granted') throw new Error('Enable MANTRA notifications in Android settings.');
  const exact = await LocalNotifications.checkExactNotificationSetting();
  if (exact.exact_alarm !== 'granted') await LocalNotifications.changeExactNotificationSetting();
}
export async function syncNotifications(records, uid = 'local') {
  if (!isNative()) return;
  const entries=Object.values(records).filter(r=>!r.deleted&&!(r.type==='task'&&r.completed)&&['goal','event','task'].includes(r.type)).flatMap(r=>{
    const base={id:r.id,title:r.title,kind:r.type,goalType:r.goalType||'checklist',schedule:r.schedule,createdDate:r.type==='task'?r.startDate:r.createdDate};
    const result=r.notificationTimes?.length?[{...base,times:[...new Set(r.notificationTimes)]}]:[];
    if(r.frequentReminders?.enabled)result.push({...base,frequent:true,frequentReminders:r.frequentReminders,times:['frequent']});return result;
  });
  const snapshot = Object.values(records).filter(r => ['goal', 'task', 'event', 'progress', 'transaction', 'note', 'score'].includes(r.type));
  await DiaryAlarms.replace({ entries, uid, records: snapshot, scoreNudges: false });
}
export const pendingNativeActions = uid => DiaryAlarms.pendingActions({ uid });
export const acknowledgeNativeActions = ids => DiaryAlarms.acknowledgeActions({ ids });
export const consumeNativeLaunch = () => DiaryAlarms.consumeLaunch();
export const acknowledgeNativeLaunch = requestId => DiaryAlarms.acknowledgeLaunch({ requestId });
