package com.maikal.daily;

import android.content.Context;
import java.nio.charset.StandardCharsets;
import java.time.ZonedDateTime;
import java.util.*;
import org.json.*;

/** Maps diary alarm times to stable, account-scoped native alarms. Never replaces standalone alarms. */
final class DiaryClockAlarms {
    static String id(String uid,String recordId,String time){return "diary_"+UUID.nameUUIDFromBytes((uid+"\n"+recordId+"\n"+time).getBytes(StandardCharsets.UTF_8));}
    private static String values(JSONArray array){SortedSet<String> result=new TreeSet<>();if(array!=null)for(int i=0;i<array.length();i++)result.add(array.optString(i));return result.toString();}
    static String signature(JSONObject source){JSONObject schedule=source.optJSONObject("schedule");if(schedule==null)return "";return source.optString("createdDate")+"|"+schedule.optString("type")+"|"+schedule.optString("from")+"|"+schedule.optString("to")+"|"+values(schedule.optJSONArray("days"))+"|"+values(schedule.optJSONArray("dates"));}
    static JSONArray plan(String uid,JSONArray records,JSONArray existing)throws Exception{
        Map<String,JSONObject> old=new HashMap<>();JSONArray result=new JSONArray();Set<String> added=new HashSet<>();
        for(int i=0;i<existing.length();i++){JSONObject alarm=existing.getJSONObject(i);old.put(alarm.getString("id"),alarm);if(!alarm.optBoolean("diaryLinked"))result.put(alarm);}
        for(int i=0;i<records.length();i++){
            JSONObject source=records.getJSONObject(i);String type=source.optString("type");if(source.optBoolean("deleted")||!("goal".equals(type)||"event".equals(type)))continue;
            JSONArray times=source.optJSONArray("alarmTimes");if(times==null)continue;
            for(int j=0;j<times.length();j++){
                String time=times.getString(j);if(!time.matches("(?:[01][0-9]|2[0-3]):[0-5][0-9]"))throw new IllegalArgumentException("Invalid alarm time for "+source.optString("title"));
                String id=id(uid,source.getString("id"),time);if(!added.add(id))continue;JSONObject previous=old.get(id);
                boolean same=previous!=null&&signature(source).equals(previous.optString("sourceSignature"));
                JSONObject alarm=same?new JSONObject(previous.toString()):new JSONObject();
                alarm.put("id",id).put("title",source.getString("title")).put("time",time).put("schedule",new JSONObject(source.getJSONObject("schedule").toString())).put("createdDate",source.optString("createdDate"))
                    .put("diaryLinked",true).put("sourceId",source.getString("id")).put("sourceUid",uid).put("sourceKind","goal".equals(type)?"goal":source.optString("kind","reminder")).put("sourceSignature",signature(source)).put("oneTime",false);
                if(!same)alarm.put("enabled",true).put("snoozedUntil",0);
                if(ClockAlarms.nextMillis(alarm,ZonedDateTime.now())==0)alarm.put("enabled",false);
                ClockAlarms.validate(alarm);result.put(alarm);
            }
        }
        return result;
    }
    static boolean current(Context c,JSONObject alarm)throws Exception{
        if(!alarm.optBoolean("diaryLinked"))return true;
        if(!NativeDiaryStore.uid(c).equals(alarm.optString("sourceUid")))return false;
        JSONArray records=NativeDiaryStore.records(c);
        for(int i=0;i<records.length();i++){JSONObject source=records.getJSONObject(i);if(!alarm.optString("sourceId").equals(source.optString("id"))||source.optBoolean("deleted"))continue;
            if(!signature(source).equals(alarm.optString("sourceSignature")))return false;
            JSONArray times=source.optJSONArray("alarmTimes");if(times!=null)for(int j=0;j<times.length();j++)if(alarm.optString("time").equals(times.optString(j)))return true;
        }
        return false;
    }
}
