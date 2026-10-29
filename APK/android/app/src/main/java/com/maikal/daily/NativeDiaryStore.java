package com.maikal.daily;

import android.content.Context;
import android.content.SharedPreferences;
import org.json.JSONArray;
import org.json.JSONObject;
import java.time.LocalDate;
import java.util.UUID;

// Native snapshot for widgets and a durable outbox for notification actions.
// The React store acknowledges an action only after its local save succeeds.
final class NativeDiaryStore {
    static SharedPreferences prefs(Context c) { return c.getSharedPreferences("maikal_alarms", Context.MODE_PRIVATE); }
    static String uid(Context c) { return prefs(c).getString("uid", "local"); }
    static JSONArray records(Context c) throws Exception { return new JSONArray(prefs(c).getString("records", "[]")); }
    static JSONArray actions(Context c) throws Exception { return new JSONArray(prefs(c).getString("actions", "[]")); }
    static synchronized void snapshot(Context c, String uid, JSONArray records) throws Exception {
        if (!prefs(c).edit().putString("uid", uid).putString("records", records.toString()).commit()) throw new Exception("Device storage unavailable");
    }
    static JSONObject goal(Context c, String id) throws Exception {
        JSONArray records = records(c);
        for (int i = 0; i < records.length(); i++) {
            JSONObject r = records.getJSONObject(i);
            if (id.equals(r.optString("id")) && "goal".equals(r.optString("type")) && !r.optBoolean("deleted")) return r;
        }
        return null;
    }
    static boolean completed(Context c, String goalId, String date) throws Exception {
        JSONObject value = null; long timestamp = -1;
        JSONArray records = records(c), actions = actions(c);
        String progressId = "progress_" + goalId + "_" + date;
        for (int i = 0; i < records.length(); i++) {
            JSONObject r = records.getJSONObject(i);
            if (progressId.equals(r.optString("id")) && !r.optBoolean("deleted")) { value = r; timestamp = r.optLong("updatedAt"); }
        }
        for (int i = 0; i < actions.length(); i++) {
            JSONObject a = actions.getJSONObject(i);
            if (uid(c).equals(a.optString("uid")) && goalId.equals(a.optString("goalId")) && date.equals(a.optString("date")) && a.optLong("timestamp") >= timestamp) return true;
        }
        if (value != null) return value.optBoolean("value");
        JSONObject goal = goal(c, goalId);
        JSONArray dates = goal == null ? null : goal.optJSONArray("completedDates");
        if (dates != null) for (int i = 0; i < dates.length(); i++) if (date.equals(dates.optString(i))) return true;
        return false;
    }
    static synchronized boolean complete(Context c, String account, String goalId, String date) throws Exception {
        if (!uid(c).equals(account)) return false;
        JSONObject goal = goal(c, goalId);
        if (goal == null || !"checklist".equals(goal.optString("goalType", "checklist"))) return false;
        LocalDate day = LocalDate.parse(date);
        if (!day.equals(DiaryAlarmReceiver.nextDate(goal, day))) return false;
        if (completed(c, goalId, date)) return true;
        JSONArray actions = actions(c);
        actions.put(new JSONObject().put("id", UUID.randomUUID().toString()).put("uid", account).put("goalId", goalId).put("date", date).put("timestamp", System.currentTimeMillis()));
        if (!prefs(c).edit().putString("actions", actions.toString()).commit()) throw new Exception("Could not save completion");
        return true;
    }
    static synchronized JSONArray pending(Context c, String uid) throws Exception {
        JSONArray all = actions(c), result = new JSONArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.getJSONObject(i);
            // The authorized account merges the guest diary on connection.
            if (uid.equals(a.optString("uid")) || "0kX2kfDq3KV9MIhtDV7IDpuXnfJ3".equals(uid) && "local".equals(a.optString("uid"))) result.put(a);
        }
        return result;
    }
    static synchronized void acknowledge(Context c, JSONArray ids) throws Exception {
        JSONArray all = actions(c), remaining = new JSONArray();
        for (int i = 0; i < all.length(); i++) {
            JSONObject a = all.getJSONObject(i); boolean remove = false;
            for (int j = 0; j < ids.length(); j++) if (a.getString("id").equals(ids.getString(j))) remove = true;
            if (!remove) remaining.put(a);
        }
        if (!prefs(c).edit().putString("actions", remaining.toString()).commit()) throw new Exception("Could not acknowledge completion");
    }
}
