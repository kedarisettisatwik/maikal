package com.maikal.daily;
import android.content.*;
import android.os.*;
import org.json.*;
import java.time.*;
/** One device-local focus session, monotonic timing and an atomic durable progress outbox. */
final class NativeFocus {
 private static android.content.SharedPreferences prefs(Context c){return NativeDiaryStore.prefs(c);}
 private static int boot(Context c){return android.provider.Settings.Global.getInt(c.getContentResolver(),android.provider.Settings.Global.BOOT_COUNT,0);}
 private static JSONObject read(Context c)throws Exception{return new JSONObject(prefs(c).getString("focusSession","{}"));}
 private static void save(Context c,JSONObject s)throws Exception{if(!prefs(c).edit().putString("focusSession",s.toString()).commit())throw new Exception("Could not save focus time");}
 private static void checkpoint(Context c,JSONObject s)throws Exception{
  if(!s.optBoolean("running"))return;
  if(s.optInt("boot")!=boot(c)||s.optInt("pid",android.os.Process.myPid())!=android.os.Process.myPid()){s.put("running",false);return;}
  long elapsed=Math.max(0,SystemClock.elapsedRealtime()-s.optLong("elapsedStart",SystemClock.elapsedRealtime()));
  long wall=s.optLong("wallStart",System.currentTimeMillis());JSONObject days=s.optJSONObject("days");if(days==null)days=new JSONObject();
  while(elapsed>0){LocalDate day=Instant.ofEpochMilli(wall).atZone(ZoneId.systemDefault()).toLocalDate();long end=day.plusDays(1).atStartOfDay(ZoneId.systemDefault()).toInstant().toEpochMilli();long part=Math.min(elapsed,Math.max(1,end-wall));days.put(day.toString(),days.optLong(day.toString())+part);wall+=part;elapsed-=part;}
  s.put("days",days).put("elapsedStart",SystemClock.elapsedRealtime()).put("wallStart",System.currentTimeMillis());
 }
 static synchronized JSONObject control(Context c,String command,String id)throws Exception{
  JSONObject s=read(c);checkpoint(c,s);
  if("start".equals(command)||"resume".equals(command)){
   JSONObject entry=NativeDiaryStore.goal(c,id);if(entry==null||!entry.optBoolean("focusEnabled")||!("task".equals(entry.optString("type"))&&entry.optBoolean("trackTime")||"goal".equals(entry.optString("type"))&&"tracker".equals(entry.optString("goalType"))&&"time".equals(entry.optString("trackerUnit"))))throw new IllegalArgumentException("This item does not have focus mode enabled");
   if(s.has("id")&&!id.equals(s.optString("id")))throw new IllegalStateException("Finish the existing focus session first: "+s.optString("title"));
   if(!s.has("id"))s=new JSONObject().put("id",id).put("uid",NativeDiaryStore.uid(c)).put("title",entry.optString("title")).put("session",java.util.UUID.randomUUID().toString()).put("days",new JSONObject());
   if(!NativeDiaryStore.uid(c).equals(s.optString("uid")))throw new IllegalStateException("Open the diary that owns this focus session");
   s.put("running",true).put("pid",android.os.Process.myPid()).put("boot",boot(c)).put("elapsedStart",SystemClock.elapsedRealtime()).put("wallStart",System.currentTimeMillis());
  }else if("pause".equals(command)){s.put("running",false);}
  else if("stop".equals(command)){
   if(s.has("id")){JSONArray actions=NativeDiaryStore.actions(c);long timestamp=System.currentTimeMillis();for(int i=0;i<actions.length();i++)timestamp=Math.max(timestamp,actions.getJSONObject(i).optLong("timestamp")+1);JSONObject days=s.optJSONObject("days");if(days!=null){java.util.Iterator<String> keys=days.keys();while(keys.hasNext()){String day=keys.next();double minutes=days.optLong(day)/60000.0;if(minutes>0)actions.put(new JSONObject().put("id","focus_"+s.getString("session")+"_"+day).put("uid",s.getString("uid")).put("goalId",s.getString("id")).put("date",day).put("focusDelta",true).put("minutes",minutes).put("timestamp",timestamp++));}}
    if(!prefs(c).edit().putString("actions",actions.toString()).putString("focusSession","{}").commit())throw new Exception("Could not save focus progress");s=new JSONObject();
   }
  }else if(!"status".equals(command))throw new IllegalArgumentException("Unknown focus action");
  save(c,s);long total=0;JSONObject days=s.optJSONObject("days");if(days!=null){java.util.Iterator<String> it=days.keys();while(it.hasNext())total+=days.optLong(it.next());}return new JSONObject(s.toString()).put("elapsedMs",total);
 }
 static void pause(Context c){try{control(c,"pause","");}catch(Exception e){android.util.Log.e("MANTRA","Focus could not pause",e);}}
 static void recordsChanged(Context c,JSONArray records)throws Exception{JSONObject s=read(c);if(!s.has("id"))return;JSONObject entry=null;for(int i=0;i<records.length();i++)if(s.optString("id").equals(records.getJSONObject(i).optString("id")))entry=records.getJSONObject(i);if(entry==null||entry.optBoolean("deleted")||!entry.optBoolean("focusEnabled")||!("task".equals(entry.optString("type"))&&entry.optBoolean("trackTime")||"goal".equals(entry.optString("type"))&&"tracker".equals(entry.optString("goalType"))&&"time".equals(entry.optString("trackerUnit"))))control(c,"stop","");}
 static void switchAccount(Context c,String uid)throws Exception{JSONObject s=read(c);if(s.has("id")&&!uid.equals(s.optString("uid")))control(c,"stop","");}
}
