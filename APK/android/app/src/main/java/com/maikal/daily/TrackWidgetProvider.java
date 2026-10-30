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
        RemoteViews view=new RemoteViews(c.getPackageName(),R.layout.widget_track);
        Intent open=new Intent(c,TrackActivity.class).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        view.setOnClickPendingIntent(R.id.widget_track_card,PendingIntent.getActivity(c,9301,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        try{
            if(!ScreenTime.allowed(c)){view.setTextViewText(R.id.widget_track_total,"Set up screen time");view.setTextViewText(R.id.widget_track_subtitle,"Tap to enable usage access in Maikal.");view.setTextViewText(R.id.widget_track_apps,"");view.setTextViewText(R.id.widget_track_updated,"Usage access needed");return view;}
            ScreenTime.Result usage=ScreenTime.read(c,0);view.setTextViewText(R.id.widget_track_total,ScreenTime.duration(usage.total));view.setTextViewText(R.id.widget_track_subtitle,"Total screen time · Today");StringBuilder apps=new StringBuilder();List<Map.Entry<String,Long>> rows=ScreenTime.sorted(usage);for(int i=0;i<Math.min(3,rows.size());i++){Map.Entry<String,Long> app=rows.get(i);if(i>0)apps.append('\n');apps.append(ScreenTime.label(c,app.getKey())).append("  ·  ").append(ScreenTime.duration(app.getValue()));}view.setTextViewText(R.id.widget_track_apps,rows.isEmpty()?"No app usage yet today":apps.toString());view.setTextViewText(R.id.widget_track_updated,"Updated "+LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm")));
        }catch(Exception e){view.setTextViewText(R.id.widget_track_total,"Usage unavailable");view.setTextViewText(R.id.widget_track_subtitle,"Unlock your phone and open Track.");view.setTextViewText(R.id.widget_track_apps,"");view.setTextViewText(R.id.widget_track_updated,"Tap to retry");}
        return view;
    }
    static void refresh(Context c){Context app=c.getApplicationContext();int[] ids=AppWidgetManager.getInstance(app).getAppWidgetIds(new ComponentName(app,TrackWidgetProvider.class));if(ids.length>0)worker.execute(()->update(app,ids));}
    private static void update(Context c,int[] ids){RemoteViews view=views(c);for(int id:ids)AppWidgetManager.getInstance(c).updateAppWidget(id,view);}
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){PendingResult pending=goAsync();Context app=c.getApplicationContext();worker.execute(()->{try{update(app,ids);}finally{pending.finish();}});}
    @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);String action=intent.getAction();if(Intent.ACTION_DATE_CHANGED.equals(action)||Intent.ACTION_TIMEZONE_CHANGED.equals(action)||Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)){PendingResult pending=goAsync();Context app=c.getApplicationContext();worker.execute(()->{try{int[] ids=AppWidgetManager.getInstance(app).getAppWidgetIds(new ComponentName(app,TrackWidgetProvider.class));if(ids.length>0)update(app,ids);}finally{pending.finish();}});}}
}
