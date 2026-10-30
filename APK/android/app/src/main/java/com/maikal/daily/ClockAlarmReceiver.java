package com.maikal.daily;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import org.json.JSONObject;

public class ClockAlarmReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context c,Intent intent){
        if(!ClockAlarms.FIRE.equals(intent.getAction())&&!ClockAlarms.SNOOZE_FIRE.equals(intent.getAction())){ClockAlarms.restore(c);return;}
        try{JSONObject r=ClockAlarms.find(c,intent.getStringExtra("id"));if(r==null)return;
            if(!DiaryClockAlarms.current(c,r))return;
            boolean snooze=ClockAlarms.SNOOZE_FIRE.equals(intent.getAction());
            if(snooze?r.optLong("snoozedUntil")==0:!r.optBoolean("enabled"))return;
            UpcomingAlarmReceiver.clearNotifications(c,r.getString("id")); r.put("snoozedUntil",0);if(r.optBoolean("oneTime"))r.put("enabled",false);
            ClockAlarms.storeState(c,r);ClockAlarms.schedule(c,r);
            androidx.core.content.ContextCompat.startForegroundService(c,new Intent(c,ClockAlarmService.class).setAction("RING").putExtra("id",r.getString("id")).putExtra("title",r.getString("title")));
        }catch(Exception e){android.util.Log.e("Maikal","Alarm could not ring",e);}
    }
}
