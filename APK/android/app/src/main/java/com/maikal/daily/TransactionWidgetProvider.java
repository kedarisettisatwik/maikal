package com.maikal.daily;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

public class TransactionWidgetProvider extends AppWidgetProvider {
    @Override public void onReceive(Context c, Intent intent) {
        super.onReceive(c, intent);
        if (Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())) {
            AppWidgetManager manager = AppWidgetManager.getInstance(c);
            onUpdate(c, manager, manager.getAppWidgetIds(new android.content.ComponentName(c, TransactionWidgetProvider.class)));
        }
    }
    static RemoteViews views(Context c) {
            RemoteViews view = new RemoteViews(c.getPackageName(), R.layout.widget_transaction);
            Intent open = new Intent(c, MainActivity.class).setAction("com.maikal.daily.ADD_TRANSACTION")
                .putExtra("transactionKind", "expense").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
            view.setOnClickPendingIntent(R.id.widget_add_transaction,
                PendingIntent.getActivity(c, 8103, open, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            return view;
    }
    @Override public void onUpdate(Context c, AppWidgetManager manager, int[] ids) {
        for (int id : ids) manager.updateAppWidget(id, views(c));
    }
}
