package com.maikal.daily;

import android.content.Context;
import android.app.NotificationManager;
import org.json.*;
import java.time.LocalDate;

final class ScoreReminders {
    static JSONArray entries() throws Exception {
        JSONArray entries = new JSONArray();
        for (String time : new String[]{"00:30", "01:00", "06:00", "08:00", "10:00", "11:00"}) entries.put(new JSONObject()
            .put("id", "score_" + time).put("kind", "score").put("title", "Yesterday’s report is ready")
            .put("body", "Review yesterday’s goals and create your score card.")
            .put("schedule", new JSONObject().put("type", "everyday")).put("times", new JSONArray().put(time)));
        return entries;
    }
    static String message(String time,LocalDate date){
        String[] times={"00:30","01:00","06:00","08:00","10:00","11:00"};int slot=java.util.Arrays.asList(times).indexOf(time);if(slot<0)slot=0;
        String[] messages={"Yesterday’s report is ready. Review your goals and make your photo score card.","See which goals met their targets yesterday, then save your score card.","Your previous day’s progress is ready to review in MANTRA.","Create a photo score card from yesterday’s results.","Take a look at yesterday’s completed goals and final score.","Your daily report keeps yesterday’s goals and target results together.","Open yesterday’s report to see your score and overall total.","Yesterday’s goal results are ready. Pick a photo and arrange your card.","Review yesterday’s wins and the goals you want to revisit.","Your score card can include the particular goals you choose.","Make a phone-size card from yesterday’s progress in MANTRA.","Yesterday’s report is waiting in More. Tap to open it."};return messages[(int)Math.floorMod(date.toEpochDay()*5+slot,(long)messages.length)];
    }
    static boolean deliveryTime(java.time.LocalTime now,String slot){java.time.LocalTime at=java.time.LocalTime.parse(slot);return !now.isBefore(at)&&now.isBefore(at.plusMinutes(30));}
    static boolean shouldNotify(Context c, LocalDate today) throws Exception {
        LocalDate date=today.minusDays(1);JSONArray records=NativeDiaryStore.records(c);
        for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);if("score".equals(r.optString("type"))&&!r.optBoolean("deleted")&&date.toString().equals(r.optString("date")))return r.optInt("total")>0;}
        for(int i=0;i<records.length();i++){
            JSONObject g=records.getJSONObject(i);if(!"goal".equals(g.optString("type")))continue;
            JSONArray history=g.optJSONArray("scoringHistory");
            if(history!=null&&history.length()>0){JSONObject latest=null;for(int j=0;j<history.length();j++){JSONObject h=history.getJSONObject(j);String from=h.optString("from");if(from.compareTo(date.toString())<=0&&(latest==null||from.compareTo(latest.optString("from"))>0))latest=h;}if(latest==null)continue;g=new JSONObject(g.toString());java.util.Iterator<String> keys=latest.keys();while(keys.hasNext()){String key=keys.next();if(!"from".equals(key))g.put(key,latest.get(key));}}
            if(!g.optBoolean("deleted")&&date.equals(DiaryAlarmReceiver.nextDate(g,date)))return true;
        }return false;
    }
    static void clearIfNoReport(Context c) throws Exception {
        if(shouldNotify(c,LocalDate.now()))return;
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if("maikal_scores".equals(n.getNotification().getChannelId()))manager.cancel(n.getTag(),n.getId());
    }
}
