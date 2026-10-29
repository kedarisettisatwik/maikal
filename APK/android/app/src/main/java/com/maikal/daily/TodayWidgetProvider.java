package com.maikal.daily;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;

public class TodayWidgetProvider extends AppWidgetProvider {
    static ArrayList<JSONObject> today(Context c) throws Exception {
        ArrayList<JSONObject> result = new ArrayList<>();
        JSONArray records = NativeDiaryStore.records(c); LocalDate date = LocalDate.now();
        for (int i = 0; i < records.length(); i++) {
            JSONObject record = records.getJSONObject(i);
            if (!record.optBoolean("deleted") && ("goal".equals(record.optString("type")) || "event".equals(record.optString("type")))
                && date.equals(DiaryAlarmReceiver.nextDate(record, date))) result.add(record);
        }
        result.sort(Comparator.comparing((JSONObject r) -> "goal".equals(r.optString("type")) ? "0" : "1" + r.optString("startTime", ""))
            .thenComparing(r -> r.optString("title")));
        return result;
    }
    static RemoteViews row(Context c, JSONObject r) throws Exception {
        RemoteViews row = new RemoteViews(c.getPackageName(), R.layout.widget_today_row);
        String date = LocalDate.now().toString(); boolean goal = "goal".equals(r.optString("type"));
        boolean tracker = goal && "tracker".equals(r.optString("goalType"));
        boolean done = goal && !tracker && NativeDiaryStore.completed(c, r.getString("id"), date);
        String detail;
        if (tracker) {
            double value = 0; JSONObject legacy = r.optJSONObject("trackerValues");
            if (legacy != null) value = legacy.optDouble(date, 0);
            JSONArray records = NativeDiaryStore.records(c);
            for (int i = 0; i < records.length(); i++) {
                JSONObject p = records.getJSONObject(i);
                if (("progress_" + r.getString("id") + "_" + date).equals(p.optString("id")) && !p.optBoolean("deleted")) value = p.optDouble("value", 0);
            }
            detail = "Tracker · " + (value == Math.rint(value) ? String.valueOf((long)value) : String.valueOf(value)) + ("time".equals(r.optString("trackerUnit")) ? " mins" : " count");
        } else detail = goal ? done ? "Goal · Completed" : "Goal · To do" : r.optString("kind", "Reminder") + " · " + (r.optBoolean("allDay") ? "All day" : r.optString("startTime"));
        row.setTextViewText(R.id.widget_row_title, (done ? "✓ " : "") + r.optString("title"));
        row.setTextViewText(R.id.widget_row_detail, detail);
        row.setTextColor(R.id.widget_row_title, Color.parseColor(done ? "#008B47" : "#253439"));
        row.setOnClickFillInIntent(R.id.widget_row, new Intent());
        return row;
    }
    static void update(Context c, AppWidgetManager manager, int id) throws Exception {
        RemoteViews view = new RemoteViews(c.getPackageName(), R.layout.widget_today);
        view.setTextViewText(R.id.widget_date, LocalDate.now().format(DateTimeFormatter.ofPattern("EEE, d MMM")));
        Intent open = new Intent(c, MainActivity.class).setAction("com.maikal.daily.OPEN").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        view.setOnClickPendingIntent(R.id.widget_header, PendingIntent.getActivity(c, 8000, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        int mutable = Build.VERSION.SDK_INT >= 31 ? PendingIntent.FLAG_MUTABLE : 0;
        view.setPendingIntentTemplate(R.id.widget_list, PendingIntent.getActivity(c, 8001, open, PendingIntent.FLAG_UPDATE_CURRENT | mutable));
        view.setEmptyView(R.id.widget_list, R.id.widget_empty);
        if (Build.VERSION.SDK_INT >= 31) {
            RemoteViews.RemoteCollectionItems.Builder items = new RemoteViews.RemoteCollectionItems.Builder().setHasStableIds(true).setViewTypeCount(1);
            ArrayList<JSONObject> records = today(c);
            for (int i = 0; i < records.size(); i++) items.addItem(i, row(c, records.get(i)));
            view.setRemoteAdapter(R.id.widget_list, items.build());
        } else {
            Intent service = new Intent(c, TodayWidgetService.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
            service.setData(Uri.parse("maikal://today-widget/" + id));
            view.setRemoteAdapter(R.id.widget_list, service);
        }
        manager.updateAppWidget(id, view);
        if (Build.VERSION.SDK_INT < 31) manager.notifyAppWidgetViewDataChanged(id, R.id.widget_list);
    }
    static void refresh(Context c) {
        AppWidgetManager manager = AppWidgetManager.getInstance(c);
        int[] ids = manager.getAppWidgetIds(new ComponentName(c, TodayWidgetProvider.class));
        for (int id : ids) try { update(c, manager, id); } catch (Exception e) { android.util.Log.e("Maikal", "Widget update failed", e); }
    }
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) { refresh(c); }
}
