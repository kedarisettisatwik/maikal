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
            if (!"maikal_reminders".equals(channel) && !"maikal_greetings".equals(channel)) continue;
            Bundle extras = active.getNotification().extras;
            String account = extras.getString("maikalUid", ""), key = extras.getString("maikalEntry", "");
            boolean keep = account.equals(NativeDiaryStore.uid(c));
            boolean present = false;
            for (int i = 0; i < alarms.length(); i++) {
                JSONObject alarm = alarms.getJSONObject(i);
                if (key.equals(alarm.getString("id") + "_" + alarm.getString("time"))) present = true;
            }
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
        ZonedDateTime now = ZonedDateTime.now(); LocalTime time = LocalTime.parse(entry.getString("time"));
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
        try {
            if ("com.maikal.daily.COMPLETE".equals(intent.getAction())) {
                if (NativeDiaryStore.complete(c, intent.getStringExtra("uid"), intent.getStringExtra("goalId"), intent.getStringExtra("date"))) {
                    NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
                    for (StatusBarNotification active : manager.getActiveNotifications()) {
                        Bundle extra = active.getNotification().extras;
                        if (intent.getStringExtra("goalId").equals(extra.getString("maikalGoal")) && intent.getStringExtra("date").equals(extra.getString("maikalDate"))) manager.cancel(active.getTag(), active.getId());
                    }
                    TodayWidgetProvider.refresh(c);
                }
                return;
            }
            if (!"com.maikal.daily.ALARM".equals(intent.getAction())) { reschedule(c); TodayWidgetProvider.refresh(c); return; }
            int id = intent.getIntExtra("alarmId", 0);
            JSONArray alarms = new JSONArray(prefs(c).getString("alarms", "[]"));
            if (id < 1 || id > alarms.length()) return;
            JSONObject entry = alarms.getJSONObject(id - 1);
            boolean greeting = "greeting".equals(entry.optString("kind"));
            String day = LocalDate.now().toString();
            boolean checkbox = "goal".equals(entry.optString("kind")) && "checklist".equals(entry.optString("goalType", "checklist"));
            if (checkbox && NativeDiaryStore.completed(c, entry.getString("id"), day)) { schedule(c, entry, id); return; }
            NotificationManager manager = (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
            manager.createNotificationChannel(new NotificationChannel("maikal_reminders", "Goals & plans", NotificationManager.IMPORTANCE_HIGH));
            manager.createNotificationChannel(new NotificationChannel("maikal_greetings", "Daily greetings", NotificationManager.IMPORTANCE_DEFAULT));
            PendingIntent open = PendingIntent.getActivity(c, id, new Intent(c, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP | Intent.FLAG_ACTIVITY_SINGLE_TOP), PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
            if (Build.VERSION.SDK_INT < 33 || c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) == PackageManager.PERMISSION_GRANTED) {
                Bundle extras = new Bundle();
                extras.putString("maikalUid", NativeDiaryStore.uid(c)); extras.putString("maikalEntry", entry.getString("id") + "_" + entry.getString("time"));
                extras.putString("maikalGoal", entry.getString("id")); extras.putString("maikalDate", day);
                NotificationCompat.Builder builder = new NotificationCompat.Builder(c, greeting ? "maikal_greetings" : "maikal_reminders").setSmallIcon(R.drawable.ic_stat_maikal)
                    .addExtras(extras)
                    .setLargeIcon(BitmapFactory.decodeResource(c.getResources(), R.drawable.maikal_logo))
                    .setContentTitle(entry.optString("title", "Maikal"))
                    .setContentText(entry.optString("body", entry.optString("kind", "Reminder") + " · " + entry.optString("time")))
                    .setStyle(new NotificationCompat.BigTextStyle().bigText(entry.optString("body", entry.optString("kind", "Reminder") + " · " + entry.optString("time"))))
                    .setPriority(greeting ? NotificationCompat.PRIORITY_DEFAULT : NotificationCompat.PRIORITY_HIGH).setContentIntent(open).setAutoCancel(true);
                if (checkbox) {
                    String uid = NativeDiaryStore.uid(c), goalId = entry.getString("id");
                    Intent complete = new Intent(c, DiaryAlarmReceiver.class).setAction("com.maikal.daily.COMPLETE")
                        .setData(new Uri.Builder().scheme("maikal").authority("complete").appendPath(uid).appendPath(goalId).appendPath(day).build())
                        .putExtra("uid", uid).putExtra("goalId", goalId).putExtra("date", day).putExtra("notificationId", id);
                    PendingIntent action = PendingIntent.getBroadcast(c, id, complete, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
                    builder.addAction(R.drawable.ic_stat_maikal, "Mark as complete", action);
                }
                manager.notify(entry.getString("id") + "_" + entry.getString("time"), 0, builder.build());
            }
            schedule(c, entry, id);
            TodayWidgetProvider.refresh(c);
        } catch (Exception error) { android.util.Log.e("Maikal", "Reminder scheduling failed", error); }
    }
}
