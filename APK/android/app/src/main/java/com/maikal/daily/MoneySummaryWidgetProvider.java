package com.maikal.daily;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.widget.RemoteViews;
import org.json.JSONArray;
import org.json.JSONObject;
import java.text.NumberFormat;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.Locale;

public class MoneySummaryWidgetProvider extends AppWidgetProvider {
    // Amounts stay in paise, matching transaction records; convert only for display.
    static long[] totals(Context c, LocalDate date) throws Exception {
        long today = 0, expenses = 0, income = 0;
        String day = date.toString(), month = day.substring(0, 7);
        JSONArray records = NativeDiaryStore.records(c);
        for (int i = 0; i < records.length(); i++) {
            JSONObject record = records.getJSONObject(i);
            if (!"transaction".equals(record.optString("type")) || record.optBoolean("deleted")) continue;
            String recordDate = record.optString("date"), kind = record.optString("kind");
            long amount = record.optLong("amount", 0);
            if (amount <= 0) continue;
            if ("expense".equals(kind) && day.equals(recordDate)) today += amount;
            if (recordDate.startsWith(month + "-")) {
                if ("expense".equals(kind)) expenses += amount;
                else if ("income".equals(kind)) income += amount;
            }
        }
        return new long[]{today, expenses, income, income - expenses};
    }
    static RemoteViews views(Context c) throws Exception {
        LocalDate date = LocalDate.now();
        long[] totals = totals(c, date);
        NumberFormat money = NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"));
        RemoteViews view = new RemoteViews(c.getPackageName(), R.layout.widget_money_summary);
        view.setTextViewText(R.id.widget_money_period, "Today: " + date.format(DateTimeFormatter.ofPattern("d MMM")) + " · Month: " + date.format(DateTimeFormatter.ofPattern("MMM yyyy")));
        int[] fields = {R.id.widget_day_expense, R.id.widget_month_expense, R.id.widget_month_income, R.id.widget_month_saving};
        for (int i = 0; i < fields.length; i++) view.setTextViewText(fields[i], money.format(totals[i] / 100.0));
        view.setTextColor(R.id.widget_month_saving, Color.parseColor(totals[3] < 0 ? "#E33D3D" : "#285D79"));
        Intent open = new Intent(c, MainActivity.class).setAction("com.maikal.daily.MONEY").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        view.setOnClickPendingIntent(R.id.widget_money_summary, PendingIntent.getActivity(c, 8201, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
        return view;
    }
    static void refresh(Context c) {
        AppWidgetManager manager = AppWidgetManager.getInstance(c);
        int[] ids = manager.getAppWidgetIds(new ComponentName(c, MoneySummaryWidgetProvider.class));
        for (int id : ids) try { manager.updateAppWidget(id, views(c)); }
        catch (Exception e) { android.util.Log.e("Maikal", "Money widget update failed", e); }
    }
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) { refresh(c); }
}
