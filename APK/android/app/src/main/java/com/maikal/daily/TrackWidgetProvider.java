package com.maikal.daily;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.widget.RemoteViews;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.*;

public class TrackWidgetProvider extends AppWidgetProvider {
    private static final ExecutorService worker=Executors.newSingleThreadExecutor();
    static RemoteViews views(Context c){
        RemoteViews view=new RemoteViews(c.getPackageName(),R.layout.widget_track); MantraTheme.widget(c,view,R.layout.widget_track);
        Intent open=new Intent(c,TrackActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        view.setOnClickPendingIntent(R.id.widget_track_card,PendingIntent.getActivity(c,9301,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        try{
            if(!ScreenTime.allowed(c)){view.setTextViewText(R.id.widget_track_total,"Enable usage access");return view;}
            ScreenTime.Result usage=ScreenTime.read(c,0);view.setTextViewText(R.id.widget_track_total,ScreenTime.duration(usage.total));
        }catch(Exception e){view.setTextViewText(R.id.widget_track_total,"Tap to retry");}
        return view;
    }
    static void refresh(Context c){TotalScreenTimeWidgetProvider.refresh(c);Context app=c.getApplicationContext();int[] ids=AppWidgetManager.getInstance(app).getAppWidgetIds(new ComponentName(app,TrackWidgetProvider.class));if(ids.length>0)worker.execute(()->update(app,ids));}
    private static void update(Context c,int[] ids){RemoteViews view=views(c);for(int id:ids)AppWidgetManager.getInstance(c).updateAppWidget(id,view);}
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){PendingResult pending=goAsync();Context app=c.getApplicationContext();worker.execute(()->{try{update(app,ids);}finally{pending.finish();}});}
    @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);String action=intent.getAction();if(Intent.ACTION_DATE_CHANGED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)){PendingResult pending=goAsync();Context app=c.getApplicationContext();worker.execute(()->{try{int[] ids=AppWidgetManager.getInstance(app).getAppWidgetIds(new ComponentName(app,TrackWidgetProvider.class));if(ids.length>0)update(app,ids);}finally{pending.finish();}});}}
}
