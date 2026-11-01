package com.maikal.daily;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.widget.RemoteViews;
import java.util.concurrent.*;

/** A separate compact widget containing only today's screen-time total. */
public class TotalScreenTimeWidgetProvider extends AppWidgetProvider {
    private static final ExecutorService worker=Executors.newSingleThreadExecutor();
    static RemoteViews views(Context c) {
        RemoteViews view=new RemoteViews(c.getPackageName(),R.layout.widget_total_screen_time);
        view.setInt(R.id.widget_total_card,"setBackgroundResource",MantraTheme.dark(c)?R.drawable.widget_paper_dark:R.drawable.widget_total_paper);view.setTextColor(R.id.widget_total_label,MantraTheme.color(c,0xff536159));view.setTextColor(R.id.widget_total_value,MantraTheme.color(c,0xff25704d));
        Intent open=new Intent(c,TrackActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        view.setOnClickPendingIntent(R.id.widget_total_card,PendingIntent.getActivity(c,9302,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        try {
            view.setTextViewText(R.id.widget_total_value,ScreenTime.allowed(c)?ScreenTime.duration(ScreenTime.read(c,0).total):"Enable access");
        } catch(Exception e) { view.setTextViewText(R.id.widget_total_value,"Tap to retry"); }
        return view;
    }
    static void refresh(Context c) {
        Context app=c.getApplicationContext();
        int[] ids=AppWidgetManager.getInstance(app).getAppWidgetIds(new ComponentName(app,TotalScreenTimeWidgetProvider.class));
        if(ids.length>0)worker.execute(()->update(app,ids));
    }
    private static void update(Context c,int[] ids) { RemoteViews view=views(c);for(int id:ids)AppWidgetManager.getInstance(c).updateAppWidget(id,view); }
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids) {
        PendingResult pending=goAsync();Context app=c.getApplicationContext();
        worker.execute(()->{try{update(app,ids);}finally{pending.finish();}});
    }
    @Override public void onReceive(Context c,Intent intent) {
        super.onReceive(c,intent);String action=intent.getAction();
        if(Intent.ACTION_DATE_CHANGED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)) {
            PendingResult pending=goAsync();Context app=c.getApplicationContext();
            worker.execute(()->{try{int[] ids=AppWidgetManager.getInstance(app).getAppWidgetIds(new ComponentName(app,TotalScreenTimeWidgetProvider.class));if(ids.length>0)update(app,ids);}finally{pending.finish();}});
        }
    }
}
