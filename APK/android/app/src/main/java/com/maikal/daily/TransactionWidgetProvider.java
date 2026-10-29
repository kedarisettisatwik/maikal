package com.maikal.daily;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class TransactionWidgetProvider extends AppWidgetProvider {
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        for (int id : ids) {
            RemoteViews view = new RemoteViews(c.getPackageName(), R.layout.widget_transaction);
            for (String kind : new String[]{"expense", "income"}) {
                Intent open = new Intent(c, MainActivity.class).setAction("com.maikal.daily.ADD_" + kind)
                    .putExtra("transactionKind", kind).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
                view.setOnClickPendingIntent("income".equals(kind) ? R.id.widget_income : R.id.widget_expense,
                    PendingIntent.getActivity(c, "income".equals(kind) ? 8101 : 8102, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            manager.updateAppWidget(id, view);
        }
    }
}
