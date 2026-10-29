package com.maikal.daily;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZonedDateTime;

/** Device-local alarm-clock records, independent of diary notifications and cloud sync. */
public final class ClockAlarms {
    static final String FIRE="com.maikal.daily.CLOCK_FIRE", SNOOZE_FIRE="com.maikal.daily.CLOCK_SNOOZE_FIRE";
    static final long SNOOZE_MS=5*60*1000L;
    private static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("maikal_clock_v1",Context.MODE_PRIVATE);}
    static synchronized JSONArray all(Context c){try{return new JSONArray(prefs(c).getString("alarms","[]"));}catch(Exception e){throw new IllegalStateException("Alarm storage could not be read",e);}}
    static synchronized JSONObject find(Context c,String id){JSONArray a=all(c);for(int i=0;i<a.length();i++){JSONObject r=a.optJSONObject(i);if(r!=null&&id.equals(r.optString("id")))return r;}return null;}
    private static void persist(Context c,JSONArray records){if(!prefs(c).edit().putString("alarms",records.toString()).commit())throw new IllegalStateException("Alarm storage is full or unavailable");}
    static synchronized void save(Context c,JSONObject record) throws Exception {
        validate(record);
        if(record.optBoolean("enabled")&&!canSchedule(c))throw new IllegalStateException("Enable Alarms & reminders in Android settings first.");
        JSONArray old=all(c),next=new JSONArray();boolean found=false;
        for(int i=0;i<old.length();i++){JSONObject r=old.getJSONObject(i);if(r.getString("id").equals(record.getString("id"))){next.put(record);found=true;}else next.put(r);}
        if(!found)next.put(record);persist(c,next);cancel(c,record.getString("id"));schedule(c,record);
    }
    static void validate(JSONObject r) throws Exception {
        if(r.getString("id").isEmpty()||r.getString("title").trim().isEmpty())throw new IllegalArgumentException("Enter an alarm name");
        LocalTime.parse(r.getString("time"));JSONObject s=r.getJSONObject("schedule");String type=s.getString("type");
        if(!java.util.Arrays.asList("everyday","days","dates").contains(type))throw new IllegalArgumentException("Choose an alarm schedule");
        if("days".equals(type)){JSONArray days=s.getJSONArray("days");if(days.length()==0)throw new IllegalArgumentException("Choose at least one weekday");for(int i=0;i<days.length();i++)if(days.getInt(i)<0||days.getInt(i)>6)throw new IllegalArgumentException("Invalid weekday");}
        if("dates".equals(type)){JSONArray dates=s.getJSONArray("dates");if(dates.length()==0)throw new IllegalArgumentException("Choose at least one date");for(int i=0;i<dates.length();i++)LocalDate.parse(dates.getString(i));}
        if(r.optBoolean("enabled")&&nextMillis(r,ZonedDateTime.now())==0)throw new IllegalArgumentException("Choose a future alarm time or date");
    }
    static long nextMillis(JSONObject r,ZonedDateTime now) throws Exception {
        LocalDate date=DiaryAlarmReceiver.nextDate(r,now.toLocalDate());if(date==null)return 0;
        ZonedDateTime at=date.atTime(LocalTime.parse(r.getString("time"))).atZone(ZoneId.systemDefault());
        if(!at.isAfter(now)){date=DiaryAlarmReceiver.nextDate(r,date.plusDays(1));if(date==null)return 0;at=date.atTime(LocalTime.parse(r.getString("time"))).atZone(ZoneId.systemDefault());}
        return at.toInstant().toEpochMilli();
    }
    static boolean canSchedule(Context c){return Build.VERSION.SDK_INT<31||((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).canScheduleExactAlarms();}
    private static PendingIntent pending(Context c,String id,boolean snooze){return PendingIntent.getBroadcast(c,0,new Intent(c,ClockAlarmReceiver.class).setAction(snooze?SNOOZE_FIRE:FIRE).setData(Uri.parse("maikal-clock://alarm/"+id+(snooze?"/snooze":"/regular"))).putExtra("id",id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    private static void at(Context c,JSONObject r,long millis,boolean snooze){if(!canSchedule(c))return;PendingIntent show=PendingIntent.getActivity(c,0,new Intent(c,AlarmsActivity.class),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).setAlarmClock(new AlarmManager.AlarmClockInfo(millis,show),pending(c,r.optString("id"),snooze));}
    static void schedule(Context c,JSONObject r) throws Exception {if(r.optBoolean("enabled")){long next=nextMillis(r,ZonedDateTime.now());if(next>0)at(c,r,next,false);}long snoozed=r.optLong("snoozedUntil");if(snoozed>System.currentTimeMillis())at(c,r,snoozed,true);}
    static void cancel(Context c,String id){AlarmManager manager=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);for(boolean snooze:new boolean[]{false,true}){PendingIntent p=pending(c,id,snooze);manager.cancel(p);p.cancel();}}
    static synchronized void delete(Context c,String id){JSONArray records=all(c),next=new JSONArray();for(int i=0;i<records.length();i++)if(!id.equals(records.optJSONObject(i).optString("id")))next.put(records.optJSONObject(i));persist(c,next);cancel(c,id);c.startService(new Intent(c,ClockAlarmService.class).setAction("STOP").putExtra("id",id));}
    static synchronized void snooze(Context c,String id) throws Exception {JSONObject r=find(c,id);if(r==null)return;if(!canSchedule(c))throw new IllegalStateException("Exact alarm permission is required to snooze");r.put("snoozedUntil",System.currentTimeMillis()+SNOOZE_MS);storeState(c,r);at(c,r,r.getLong("snoozedUntil"),true);}
    static synchronized void storeState(Context c,JSONObject r){JSONArray records=all(c),next=new JSONArray();for(int i=0;i<records.length();i++){JSONObject old=records.optJSONObject(i);next.put(r.optString("id").equals(old.optString("id"))?r:old);}persist(c,next);}
    static void restore(Context c){try{JSONArray a=all(c);for(int i=0;i<a.length();i++)schedule(c,a.getJSONObject(i));}catch(Exception e){android.util.Log.e("Maikal","Clock alarms could not be restored",e);}}
}
