package com.maikal.daily;
import android.content.Context;
import org.json.JSONObject;
final class ScreenGoalSettings {
 static JSONObject read(Context c)throws Exception{String uid=NativeDiaryStore.uid(c);android.content.SharedPreferences p=c.getSharedPreferences("mantra_screen_goal",0);return new JSONObject().put("goalId","screen_goal_"+ScreenTime.deviceId(c)).put("enabled",p.getBoolean(uid+"_enabled",false)).put("targetMinutes",p.getInt(uid+"_target",120));}
 static void save(Context c,boolean enabled,int target)throws Exception{if(target<0||target>1440)throw new IllegalArgumentException("Choose a screen-time limit from 0 to 1440 minutes");String uid=NativeDiaryStore.uid(c);if(!c.getSharedPreferences("mantra_screen_goal",0).edit().putBoolean(uid+"_enabled",enabled).putInt(uid+"_target",target).commit())throw new Exception("Could not save screen-time goal");}
}
