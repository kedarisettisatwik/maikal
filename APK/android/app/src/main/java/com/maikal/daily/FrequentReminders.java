package com.maikal.daily;
import android.content.Context;
import java.time.*;
import java.time.temporal.ChronoUnit;
import org.json.*;

/** One rolling OS alarm per frequent-reminder window, not one alarm per interval. */
final class FrequentReminders {
 static final class Occurrence{final LocalDate anchor;final ZonedDateTime at,end;Occurrence(LocalDate day,ZonedDateTime time,ZonedDateTime until){anchor=day;at=time;end=until;}}
 static String signature(JSONObject entry){return entry.optString("id")+"|"+entry.optString("createdDate")+"|"+entry.optJSONObject("schedule")+"|"+entry.optJSONObject("frequentReminders");}
 static Occurrence next(JSONObject entry,ZonedDateTime now)throws Exception{
  JSONObject f=entry.getJSONObject("frequentReminders");int interval=f.getInt("intervalMinutes");if(interval<1||interval>1440)throw new IllegalArgumentException("Invalid frequent-reminder interval");LocalTime start=LocalTime.parse(f.getString("start")),end=LocalTime.parse(f.getString("end"));
  LocalDate anchor=DiaryAlarmReceiver.nextDate(entry,now.toLocalDate().minusDays(1));
  while(anchor!=null){LocalDateTime from=anchor.atTime(start),until=(end.isBefore(start)?anchor.plusDays(1):anchor).atTime(end);long index=Math.max(0,Math.floorDiv(ChronoUnit.MINUTES.between(from,now.toLocalDateTime()),interval));LocalDateTime slot=from.plusMinutes(index*interval);while(!slot.isAfter(until)){ZonedDateTime at=slot.atZone(now.getZone());if(at.isAfter(now))return new Occurrence(anchor,at,until.atZone(now.getZone()));slot=slot.plusMinutes(interval);}anchor=DiaryAlarmReceiver.nextDate(entry,anchor.plusDays(1));}
  return null;
 }
 static boolean goalMet(Context c,JSONObject entry,String date)throws Exception{
  if(!"goal".equals(entry.optString("kind")))return false;JSONObject goal=NativeDiaryStore.goal(c,entry.getString("id"));if(goal==null)return true;
  if(!"tracker".equals(goal.optString("goalType","checklist")))return NativeDiaryStore.completed(c,entry.getString("id"),date);
  if(!goal.has("target")||goal.isNull("target")||!Double.isFinite(goal.optDouble("target")))return false;
  boolean entered=goal.optJSONObject("trackerValues")!=null&&goal.getJSONObject("trackerValues").has(date);String progress="progress_"+goal.getString("id")+"_"+date;
  JSONArray records=NativeDiaryStore.records(c),actions=NativeDiaryStore.actions(c);for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);if(progress.equals(r.optString("id"))&&!r.optBoolean("deleted"))entered=true;}
  for(int i=0;i<actions.length();i++){JSONObject a=actions.getJSONObject(i);if(NativeDiaryStore.uid(c).equals(a.optString("uid"))&&goal.getString("id").equals(a.optString("goalId"))&&date.equals(a.optString("date"))&&a.has("value"))entered=true;}
  String key=new JSONArray().put(NativeDiaryStore.uid(c)).put(goal.getString("id")).put(date).toString();if(new JSONObject(NativeDiaryStore.prefs(c).getString("trackerTotals","{}")).has(key))entered=true;
  if(!entered)return false;double value=NativeDiaryStore.trackerValue(c,goal.getString("id"),date),target=goal.getDouble("target");return "atMost".equals(goal.optString("targetRule"))?value<=target:value>=target;
 }
 static Occurrence nextActive(Context c,JSONObject entry,ZonedDateTime now)throws Exception{Occurrence at=next(entry,now);while(at!=null&&goalMet(c,entry,at.anchor.toString())){if(NativeDiaryStore.goal(c,entry.optString("id"))==null)return null;at=next(entry,at.end.plusSeconds(1));}return at;}
 static boolean validDelivery(JSONObject entry,String anchor,long due,ZonedDateTime now)throws Exception{
  if(anchor==null||due<=0||due>now.toInstant().toEpochMilli()+1000)return false;LocalDate day=LocalDate.parse(anchor);if(!day.equals(DiaryAlarmReceiver.nextDate(entry,day)))return false;
  Occurrence expected=next(entry,Instant.ofEpochMilli(due).atZone(now.getZone()).minusNanos(1));return expected!=null&&expected.anchor.equals(day)&&expected.at.toInstant().toEpochMilli()==due&&!now.isAfter(expected.end.plusMinutes(1));
 }
}
