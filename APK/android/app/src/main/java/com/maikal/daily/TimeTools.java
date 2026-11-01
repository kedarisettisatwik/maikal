package com.maikal.daily;
import android.content.Context;
import android.content.SharedPreferences;
import android.os.SystemClock;
import org.json.*;
final class TimeTools {
 static final String TIMER_ID="mantra_countdown_timer";
 private static SharedPreferences prefs(Context c){return c.getSharedPreferences("mantra_time_tools",0);}
 private static int boot(Context c){return android.provider.Settings.Global.getInt(c.getContentResolver(),android.provider.Settings.Global.BOOT_COUNT,0);}
 static synchronized void restore(Context c)throws Exception{
  SharedPreferences p=prefs(c);int boot=boot(c);if(p.getInt("boot",boot)==boot)return;
  long remaining=Math.min(p.getLong("duration",0),Math.max(0,p.getLong("timerWall",0)-System.currentTimeMillis()));
  long elapsed=p.getLong("swAccum",0)+(p.getBoolean("swRunning",false)?Math.max(0,System.currentTimeMillis()-p.getLong("swWall",System.currentTimeMillis())):0);
  if(!p.edit().putInt("boot",boot).putBoolean("timerRunning",false).putLong("remaining",remaining).putBoolean("swRunning",false).putLong("swAccum",elapsed).commit())throw new IllegalStateException("Could not restore tools");
  JSONObject timer=ClockAlarms.find(c,TIMER_ID);if(timer!=null){ClockAlarms.cancel(c,TIMER_ID);timer.put("enabled",false).put("snoozedUntil",0);ClockAlarms.storeState(c,timer);}
 }
 static synchronized JSONObject state(Context c)throws Exception{
  restore(c);SharedPreferences p=prefs(c);long now=SystemClock.elapsedRealtime();
  return new JSONObject().put("timerRunning",p.getBoolean("timerRunning",false)).put("remainingMs",p.getBoolean("timerRunning",false)?Math.max(0,p.getLong("timerEnd",now)-now):p.getLong("remaining",0)).put("durationMs",p.getLong("duration",300000)).put("finished",p.getBoolean("finished",false)).put("stopwatchRunning",p.getBoolean("swRunning",false)).put("stopwatchMs",p.getLong("swAccum",0)+(p.getBoolean("swRunning",false)?Math.max(0,now-p.getLong("swStart",now)):0)).put("laps",new JSONArray(p.getString("laps","[]")));
 }
 static synchronized void finished(Context c){prefs(c).edit().putBoolean("timerRunning",false).putBoolean("finished",true).putLong("remaining",0).commit();}
 private static void startTimer(Context c,long duration)throws Exception{
  if(duration<1000||duration>86400000)throw new IllegalArgumentException("Choose a duration from one second to 24 hours");
  if(!ClockAlarms.canSchedule(c))throw new IllegalStateException("Enable Alarms & reminders first");
  long end=SystemClock.elapsedRealtime()+duration;java.time.ZonedDateTime at=java.time.ZonedDateTime.now().plusNanos(duration*1000000);
  JSONObject timer=new JSONObject().put("id",TIMER_ID).put("title","Timer finished").put("timer",true).put("timerEnd",end).put("timerBoot",boot(c)).put("time",at.toLocalTime().withNano(0).toString()).put("oneTime",true).put("enabled",true).put("schedule",new JSONObject().put("type","dates").put("dates",new JSONArray().put(at.toLocalDate().toString())));
  ClockAlarms.delete(c,TIMER_ID);ClockAlarms.save(c,timer);
  if(!prefs(c).edit().putInt("boot",boot(c)).putBoolean("timerRunning",true).putBoolean("finished",false).putLong("timerEnd",end).putLong("timerWall",System.currentTimeMillis()+duration).putLong("remaining",duration).commit()){ClockAlarms.delete(c,TIMER_ID);throw new IllegalStateException("Could not save timer");}
 }
 static synchronized JSONObject control(Context c,String command,long duration)throws Exception{
  JSONObject state=state(c);if("status".equals(command))return state;SharedPreferences p=prefs(c);SharedPreferences.Editor edit=p.edit().putInt("boot",boot(c));long now=SystemClock.elapsedRealtime();
  switch(command){
   case "timerStart":startTimer(c,duration);edit.putLong("duration",duration);break;
   case "timerResume":if(!state.getBoolean("timerRunning"))startTimer(c,state.getLong("remainingMs"));break;
   case "timerPause":edit.putLong("remaining",state.getLong("remainingMs")).putBoolean("timerRunning",false);ClockAlarms.delete(c,TIMER_ID);break;
   case "timerReset":ClockAlarms.delete(c,TIMER_ID);edit.putBoolean("timerRunning",false).putBoolean("finished",false).putLong("remaining",0);break;
   case "swStart":if(!state.getBoolean("stopwatchRunning"))edit.putBoolean("swRunning",true).putLong("swStart",now).putLong("swWall",System.currentTimeMillis());break;
   case "swPause":edit.putLong("swAccum",state.getLong("stopwatchMs")).putBoolean("swRunning",false);break;
   case "swReset":edit.putLong("swAccum",0).putBoolean("swRunning",false).putString("laps","[]");break;
   case "swLap":if(state.getBoolean("stopwatchRunning")){JSONArray laps=state.getJSONArray("laps");if(laps.length()>=200)throw new IllegalStateException("Reset the stopwatch after 200 laps");laps.put(state.getLong("stopwatchMs"));edit.putString("laps",laps.toString());}break;
   case "status":break;
   default:throw new IllegalArgumentException("Unknown time tool action");
  }
  if(!edit.commit())throw new IllegalStateException("Could not save time tools");return state(c);
 }
}
