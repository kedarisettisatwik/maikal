package com.maikal.daily;

import android.Manifest;
import android.app.AlarmManager;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.service.notification.StatusBarNotification;
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZonedDateTime;
import java.time.ZoneId;
import java.time.Instant;

// Keep one upcoming OS alarm per record/time. On delivery, calculate the next
// occurrence from the persisted schedule. No WebView or network is required.
public class DiaryAlarmReceiver extends BroadcastReceiver {
    private static final String STORE = "maikal_alarms";
    private static SharedPreferences prefs(Context context) { return context.getSharedPreferences(STORE, Context.MODE_PRIVATE); }
    private static PendingIntent pending(Context c, int id) {
        return PendingIntent.getBroadcast(c, id, new Intent(c, DiaryAlarmReceiver.class).setAction("com.maikal.daily.ALARM").putExtra("alarmId", id), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }
    static synchronized void replace(Context c, JSONArray entries) throws Exception {
        AlarmManager manager = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        JSONArray old = new JSONArray(prefs(c).getString("alarms", "[]"));
        for (int i = 0; i < old.length(); i++) { PendingIntent pi = pending(c, i + 1); manager.cancel(pi); pi.cancel(); }
        JSONArray alarms = new JSONArray();
        for (int i = 0; i < entries.length(); i++) {
            JSONObject entry = entries.getJSONObject(i);
            JSONArray times = entry.optJSONArray("times");
            if (times == null) continue;
            for (int t = 0; t < times.length(); t++) {
                JSONObject alarm = new JSONObject(entry.toString());
                alarm.put("time", times.getString(t)); alarms.put(alarm);
            }
        }
        if (!prefs(c).edit().putString("alarms", alarms.toString()).commit()) throw new Exception("Alarm storage unavailable");
        NotificationManager notifications = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        for (StatusBarNotification active : notifications.getActiveNotifications()) {
            String channel = active.getNotification().getChannelId();
            if (!"maikal_reminders".equals(channel) && !"maikal_greetings".equals(channel) && !"maikal_scores".equals(channel)) continue;
            Bundle extras = active.getNotification().extras;
            String account = extras.getString("maikalUid", ""), key = extras.getString("maikalEntry", "");
            boolean keep = account.equals(NativeDiaryStore.uid(c));
            boolean present = false;
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.getJSONObject(i);
                if (key.equals(alarm.getString("id") + "_" + alarm.getString("time"))) { present = true; if("tracker".equals(alarm.optString("goalType"))&&!"delta".equals(extras.getString("maikalReplyMode")))keep=false; }
            }
            if ("tracker".equals(extras.getString("maikalGoalType"))&&!"delta".equals(extras.getString("maikalReplyMode")))keep=false;
            if(("goal".equals(extras.getString("maikalKind"))||"task".equals(extras.getString("maikalKind")))&&FrequentReminders.goalMet(c,new JSONObject().put("kind",extras.getString("maikalKind")).put("id",extras.getString("maikalGoal")),extras.getString("maikalDate",LocalDate.now().toString())))keep=false;
            if (!keep || !present) notifications.cancel(active.getTag(), active.getId());
        }
        reschedule(c);
    }
    static LocalDate nextDate(JSONObject entry, LocalDate from) throws Exception {
        JSONObject s = entry.optJSONObject("schedule");
        if (s == null) return from;
        String created = entry.optString("createdDate", "");
        if (!created.isEmpty() && LocalDate.parse(created).isAfter(from)) from = LocalDate.parse(created);
        switch (s.optString("type", "everyday")) {
            case "everyday": return from;
            case "monthly": {int day=s.optInt("day");if(day<1||day>31)return null;java.time.YearMonth month=java.time.YearMonth.from(from);for(int i=0;i<24;i++,month=month.plusMonths(1)){if(day<=month.lengthOfMonth()){LocalDate candidate=month.atDay(day);if(!candidate.isBefore(from))return candidate;}}return null;}
            case "days": {
                JSONArray days = s.optJSONArray("days");
                if (days == null) return null;
                for (int offset = 0; offset < 7; offset++) {
                    LocalDate date = from.plusDays(offset);
                    int weekday = date.getDayOfWeek().getValue() % 7;
                    for (int i = 0; i < days.length(); i++) if (days.getInt(i) == weekday) return date;
                }
                return null;
            }
            case "dates": {
                JSONArray dates = s.optJSONArray("dates"); LocalDate best = null;
                if (dates != null) for (int i = 0; i < dates.length(); i++) {
                    LocalDate date = LocalDate.parse(dates.getString(i));
                    if (!date.isBefore(from) && (best == null || date.isBefore(best))) best = date;
                }
                return best;
            }
            case "range": {
                LocalDate start = LocalDate.parse(s.getString("from")), end = LocalDate.parse(s.getString("to"));
                LocalDate date = from.isBefore(start) ? start : from;
                return date.isAfter(end) ? null : date;
            }
            default: return null;
        }
    }
    static void schedule(Context c, JSONObject entry, int id) throws Exception {
        ZonedDateTime now=ZonedDateTime.now();
        if("task".equals(entry.optString("kind"))&&FrequentReminders.goalMet(c,entry,now.toLocalDate().toString())){((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(pending(c,id));return;}
        if(entry.optBoolean("frequent")){
            FrequentReminders.Occurrence next=FrequentReminders.nextActive(c,entry,now);if(next==null)return;
            Intent delivery=new Intent(c,DiaryAlarmReceiver.class).setAction("com.maikal.daily.ALARM").putExtra("alarmId",id).putExtra("frequentDue",next.at.toInstant().toEpochMilli()).putExtra("frequentAnchor",next.anchor.toString()).putExtra("frequentSignature",FrequentReminders.signature(entry)).putExtra("reminderKey",entry.getString("id")+"_"+entry.getString("time"));
            PendingIntent pi=PendingIntent.getBroadcast(c,id,delivery,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);AlarmManager manager=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
            if(Build.VERSION.SDK_INT<31||manager.canScheduleExactAlarms())manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.at.toInstant().toEpochMilli(),pi);else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,next.at.toInstant().toEpochMilli(),pi);return;
        }
        LocalTime time=LocalTime.parse(entry.getString("time"));
        LocalDate date = nextDate(entry, now.toLocalDate());
        if (date == null) return;
        ZonedDateTime at = date.atTime(time).atZone(ZoneId.systemDefault());
        if (!at.isAfter(now)) { date = nextDate(entry, date.plusDays(1)); if (date == null) return; at = date.atTime(time).atZone(ZoneId.systemDefault()); }
        AlarmManager manager = (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
        long millis = at.toInstant().toEpochMilli(); PendingIntent pi = pending(c, id);
        if (Build.VERSION.SDK_INT < 31 || manager.canScheduleExactAlarms()) manager.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, pi);
        else manager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, millis, pi);
    }
    static void reschedule(Context c) throws Exception {
        JSONArray alarms = new JSONArray(prefs(c).getString("alarms", "[]"));
        for (int i = 0; i < alarms.length(); i++) schedule(c, alarms.getJSONObject(i), i + 1);
    }
    @Override public void onReceive(Context c, Intent intent) {
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) LegacyPaymentCleanup.run(c);
        try {
            if ("com.maikal.daily.TRACKER_VALUE".equals(intent.getAction())) {
                Bundle reply=androidx.core.app.RemoteInput.getResultsFromIntent(intent);String input=reply==null?"":String.valueOf(reply.getCharSequence("tracker_value","")).trim();
                try{double value=Double.parseDouble(input);if(!NativeDiaryStore.replyProgress(c,intent.getStringExtra("uid"),intent.getStringExtra("goalId"),intent.getStringExtra("date"),value,intent.getStringExtra("replyId"),intent.getBooleanExtra("absolute",false)))throw new IllegalArgumentException();
                    NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);for(StatusBarNotification active:manager.getActiveNotifications()){Bundle e=active.getNotification().extras;if(intent.getStringExtra("goalId").equals(e.getString("maikalGoal"))&&intent.getStringExtra("date").equals(e.getString("maikalDate")))manager.cancel(active.getTag(),active.getId());}TodayWidgetProvider.refresh(c);ScoreReminders.clearIfNoReport(c);reschedule(c);
                }catch(Exception invalid){String message="Enter an additional count or minutes as a number from 0 to 1,000,000,000, without exceeding that total, or open MANTRA to review this goal.";NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);for(StatusBarNotification active:manager.getActiveNotifications()){Bundle e=active.getNotification().extras;if(intent.getStringExtra("goalId").equals(e.getString("maikalGoal"))&&intent.getStringExtra("date").equals(e.getString("maikalDate"))){android.app.Notification.Builder retry=android.app.Notification.Builder.recoverBuilder(c,active.getNotification()).setContentText(message).setStyle(new android.app.Notification.BigTextStyle().bigText(message)).setOnlyAlertOnce(true).setRemoteInputHistory(new CharSequence[]{input});retry.getExtras().putBoolean("android.remoteInputSpinner",false);manager.notify(active.getTag(),active.getId(),retry.build());}}}
                return;
            }
            if ("com.maikal.daily.COMPLETE".equals(intent.getAction())) {
                if (NativeDiaryStore.complete(c, intent.getStringExtra("uid"), intent.getStringExtra("goalId"), intent.getStringExtra("date"))) {
                    NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
                    for (StatusBarNotification active : manager.getActiveNotifications()) {
                        Bundle extra = active.getNotification().extras;
                        if (intent.getStringExtra("goalId").equals(extra.getString("maikalGoal")) && intent.getStringExtra("date").equals(extra.getString("maikalDate"))) manager.cancel(active.getTag(), active.getId());
                    }
                    TodayWidgetProvider.refresh(c);ScoreReminders.clearIfNoReport(c);reschedule(c);
                }
                return;
            }
            if (!"com.maikal.daily.ALARM".equals(intent.getAction())) { reschedule(c); TodayWidgetProvider.refresh(c); return; }
            int id = intent.getIntExtra("alarmId", 0);
            JSONArray alarms = new JSONArray(prefs(c).getString("alarms", "[]"));
            if (id < 1 || id > alarms.length()) return;
            JSONObject entry = alarms.getJSONObject(id - 1);
            if(intent.hasExtra("reminderKey")&&!intent.getStringExtra("reminderKey").equals(entry.getString("id")+"_"+entry.getString("time")))return;
            boolean score="score".equals(entry.optString("kind"));
            if(score)return; // Photo-report notifications were retired.
            boolean greeting = "greeting".equals(entry.optString("kind"));
            if(score){String receipt="scoreNotice_"+NativeDiaryStore.uid(c)+"_"+entry.optString("time");if(!ScoreReminders.deliveryTime(LocalTime.now(),entry.getString("time"))||!ScoreReminders.shouldNotify(c,LocalDate.now())||LocalDate.now().toString().equals(prefs(c).getString(receipt,""))){schedule(c,entry,id);return;}}

            boolean frequent=entry.optBoolean("frequent");String day=frequent?intent.getStringExtra("frequentAnchor"):LocalDate.now().toString();
            long due=intent.getLongExtra("frequentDue",0);
            if(frequent&&(!FrequentReminders.signature(entry).equals(intent.getStringExtra("frequentSignature"))||!FrequentReminders.validDelivery(entry,day,due,ZonedDateTime.now()))){schedule(c,entry,id);return;}
            if(FrequentReminders.goalMet(c,entry,day)){schedule(c,entry,id);return;}
            String deliveryClock=frequent?Instant.ofEpochMilli(due).atZone(ZoneId.systemDefault()).toLocalTime().withSecond(0).withNano(0).toString():entry.getString("time");
            String receipt="reminderReceipt_"+new JSONArray().put(NativeDiaryStore.uid(c)).put(entry.optString("id")).put(deliveryClock).toString();
            if(!greeting&&LocalDate.now().toString().equals(prefs(c).getString(receipt,""))){schedule(c,entry,id);return;}
            if(frequent)entry.put("body","Reminder · "+deliveryClock);
            if(score)entry.put("body",ScoreReminders.message(entry.optString("time"),LocalDate.now().minusDays(1)));
            if(greeting){String[] message=GreetingReminders.message(entry.optString("id"),LocalDate.now());entry.put("title",message[0]).put("body",message[1]);}
            boolean checkbox = ("goal".equals(entry.optString("kind"))||"task".equals(entry.optString("kind"))) && "checklist".equals(entry.optString("goalType", "checklist"));
            if (checkbox && NativeDiaryStore.completed(c, entry.getString("id"), day)) { schedule(c, entry, id); return; }
            boolean tracker="goal".equals(entry.optString("kind"))&&"tracker".equals(entry.optString("goalType"));
            if(tracker){JSONObject goal=NativeDiaryStore.goal(c,entry.getString("id"));String unit=goal!=null&&"time".equals(goal.optString("trackerUnit"))?"minutes":"count";entry.put("body","Current: "+java.text.NumberFormat.getNumberInstance(java.util.Locale.getDefault()).format(NativeDiaryStore.trackerValue(c,entry.getString("id"),day))+" "+unit+" · Add progress or set total");}
            NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
            manager.createNotificationChannel(new NotificationChannel("maikal_reminders", "Goals, events & tasks", NotificationManager.IMPORTANCE_HIGH));
            manager.createNotificationChannel(new NotificationChannel("maikal_scores", "Yesterday report reminders", NotificationManager.IMPORTANCE_DEFAULT));
            manager.createNotificationChannel(new NotificationChannel("maikal_greetings", "Daily greetings", NotificationManager.IMPORTANCE_DEFAULT));
            Intent openIntent=new Intent(c,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);if(score)openIntent.setData(Uri.parse("mantra://report")).putExtra("quickAction","report");
            PendingIntent open=PendingIntent.getActivity(c,id,openIntent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT < 33 || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                Bundle extras = new Bundle();extras.putString("maikalKind",entry.optString("kind"));
                extras.putString("maikalUid", NativeDiaryStore.uid(c)); extras.putString("maikalEntry", entry.getString("id") + "_" + entry.getString("time"));
                extras.putString("maikalGoalType",entry.optString("goalType"));if(tracker)extras.putString("maikalReplyMode","delta");extras.putString("maikalGoal", entry.getString("id")); extras.putString("maikalDate", day);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(c, score ? "maikal_scores" : greeting ? "maikal_greetings" : "maikal_reminders").setSmallIcon(R.drawable.ic_stat_maikal)
                    .addExtras(extras)
                    .setLargeIcon(BitmapFactory.decodeResource(c.getResources(), R.drawable.maikal_logo))
                    .setContentTitle(entry.optString("title", "MANTRA"))
                    .setContentText(entry.optString("body", entry.optString("kind", "Reminder") + " · " + entry.optString("time")))
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(entry.optString("body", entry.optString("kind", "Reminder") + " · " + entry.optString("time"))))
                    .setPriority((greeting || score) ? NotificationCompat.PRIORITY_DEFAULT : NotificationCompat.PRIORITY_HIGH).setContentIntent(open).setAutoCancel(true);
                if (checkbox) {
                    String uid = NativeDiaryStore.uid(c), goalId = entry.getString("id");
                    Intent complete = new Intent(c, DiaryAlarmReceiver.class).setAction("com.maikal.daily.COMPLETE")
                        .setData(new Uri.Builder().scheme("maikal").authority("complete").appendPath(uid).appendPath(goalId).appendPath(day).build())
                        .putExtra("uid", uid).putExtra("goalId", goalId).putExtra("date", day).putExtra("notificationId", id);
                    PendingIntent action = PendingIntent.getBroadcast(c, id, complete, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    builder.addAction(R.drawable.ic_stat_maikal, "Mark as complete", action);
                }
                if("goal".equals(entry.optString("kind"))&&"tracker".equals(entry.optString("goalType"))){
                    String uid=NativeDiaryStore.uid(c),goalId=entry.getString("id");JSONObject goal=NativeDiaryStore.goal(c,goalId);
                    if(goal!=null&&!"screenTime".equals(goal.optString("managedBy")))for(boolean absolute:new boolean[]{false,true}){
                        String replyId=java.util.UUID.randomUUID().toString();Intent reply=new Intent(c,DiaryAlarmReceiver.class).setAction("com.maikal.daily.TRACKER_VALUE").setData(new Uri.Builder().scheme("maikal").authority("tracker").appendPath(uid).appendPath(goalId).appendPath(day).appendPath(replyId).build()).putExtra("uid",uid).putExtra("goalId",goalId).putExtra("date",day).putExtra("replyId",replyId).putExtra("absolute",absolute);
                        PendingIntent action=PendingIntent.getBroadcast(c,id,reply,PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=31?PendingIntent.FLAG_MUTABLE:0));
                        androidx.core.app.RemoteInput input=new androidx.core.app.RemoteInput.Builder("tracker_value").setLabel(absolute?"New total":"Additional count or minutes").setAllowFreeFormInput(true).build();
                        builder.addAction(new NotificationCompat.Action.Builder(R.drawable.ic_stat_maikal,absolute?"Set total":"Add progress",action).addRemoteInput(input).setAllowGeneratedReplies(false).build());
                    }
                }
                manager.notify(entry.getString("id") + "_" + entry.getString("time"), 0, builder.build());
                if(!greeting)prefs(c).edit().putString(receipt,LocalDate.now().toString()).apply();
                if(score)prefs(c).edit().putString("scoreNotice_"+NativeDiaryStore.uid(c)+"_"+entry.optString("time"),day).apply();
            }
            schedule(c, entry, id);
            TodayWidgetProvider.refresh(c);
        } catch (Exception error) { android.util.Log.e("MANTRA", "Reminder scheduling failed", error); }
    }
}
