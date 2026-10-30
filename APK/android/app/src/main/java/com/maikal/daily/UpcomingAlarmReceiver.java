package com.maikal.daily;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import org.json.JSONObject;

/** Advance notice only. Dismissing it never cancels the ringing alarm. */
public class UpcomingAlarmReceiver extends BroadcastReceiver {
    static final String SHOW="com.maikal.daily.UPCOMING_ALARM",DISMISS="com.maikal.daily.DISMISS_UPCOMING";
    static final long LEAD_MS=10*60*1000L;
    static final int NOTICE=70301;
    private static PendingIntent pending(Context c,String id,long occurrence,String action){
        return PendingIntent.getBroadcast(c,0,new Intent(c,UpcomingAlarmReceiver.class).setAction(action)
            .setData(Uri.parse("maikal-clock://upcoming/"+id+(DISMISS.equals(action)?"/dismiss/"+occurrence:"/scheduled")))
            .putExtra("id",id).putExtra("occurrence",occurrence),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    static long noticeTime(long occurrence){return occurrence-LEAD_MS;}
    static void schedule(Context c,JSONObject r,long occurrence){
        long at=noticeTime(occurrence);
        if(at<=System.currentTimeMillis()||r.optLong("dismissedUpcoming")==occurrence||!ClockAlarms.canSchedule(c))return;
        ((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pending(c,r.optString("id"),occurrence,SHOW));
    }
    static String tag(String id,long occurrence){return "upcoming:"+id+":"+occurrence;}
    static void cancel(Context c,String id){PendingIntent p=pending(c,id,0,SHOW);((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(p);p.cancel();clearNotifications(c,id);}
    static void clearNotifications(Context c,String id){NotificationManager m=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);for(android.service.notification.StatusBarNotification n:m.getActiveNotifications())if(n.getId()==NOTICE&&id.equals(n.getNotification().extras.getString("upcomingAlarmId")))m.cancel(n.getTag(),n.getId());}
    @Override public void onReceive(Context c,Intent intent){
        String id=intent.getStringExtra("id");long occurrence=intent.getLongExtra("occurrence",0);
        if(id==null||occurrence==0)return;
        try{
            JSONObject r=ClockAlarms.find(c,id);if(r==null)return;
            if(!DiaryClockAlarms.current(c,r))return;
            NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
            if(DISMISS.equals(intent.getAction())){
                // Ignore actions from stale notifications without touching a newer occurrence.
                if(occurrence>System.currentTimeMillis()&&ClockAlarms.nextMillis(r,java.time.ZonedDateTime.now())==occurrence){r.put("dismissedUpcoming",occurrence);ClockAlarms.storeState(c,r);}
                manager.cancel(tag(id,occurrence),NOTICE);return;
            }
            if(!SHOW.equals(intent.getAction())||!r.optBoolean("enabled")||r.optLong("dismissedUpcoming")==occurrence||occurrence<=System.currentTimeMillis()||ClockAlarms.nextMillis(r,java.time.ZonedDateTime.now())!=occurrence)return;
            if(Build.VERSION.SDK_INT>=33&&c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return;
            manager.createNotificationChannel(new NotificationChannel("maikal_upcoming_alarms","Upcoming alarms",NotificationManager.IMPORTANCE_DEFAULT));
            PendingIntent dismiss=pending(c,id,occurrence,DISMISS);
            PendingIntent open=PendingIntent.getActivity(c,0,new Intent(c,AlarmsActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            android.os.Bundle extras=new android.os.Bundle();extras.putString("upcomingAlarmId",id);extras.putLong("upcomingOccurrence",occurrence);
            String clock=java.time.Instant.ofEpochMilli(occurrence).atZone(java.time.ZoneId.systemDefault()).format(java.time.format.DateTimeFormatter.ofPattern("h:mm a"));
            manager.notify(tag(id,occurrence),NOTICE,new NotificationCompat.Builder(c,"maikal_upcoming_alarms")
                .setSmallIcon(R.drawable.ic_stat_maikal).setContentTitle("Alarm coming in 10 minutes")
                .setContentText(r.optString("title","Alarm")+" · "+clock).setContentIntent(open).setDeleteIntent(dismiss)
                .addExtras(extras).setAutoCancel(false).setTimeoutAfter(Math.max(1000,occurrence-System.currentTimeMillis()))
                .addAction(0,"Dismiss",dismiss).build());
        }catch(Exception e){android.util.Log.e("Maikal","Upcoming alarm notification failed",e);}
    }
}
