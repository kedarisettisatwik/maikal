package com.maikal.daily;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.service.notification.StatusBarNotification;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.time.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class ClockAlarmTest {
    @Test public void nativeEditorCreatesAnAlarm() throws Exception {
        Context c=ApplicationProvider.getApplicationContext();
        try(androidx.test.core.app.ActivityScenario<AlarmsActivity> screen=androidx.test.core.app.ActivityScenario.launch(AlarmsActivity.class)){
            androidx.test.espresso.Espresso.onView(androidx.test.espresso.matcher.ViewMatchers.withText("+ Add alarm")).perform(androidx.test.espresso.action.ViewActions.click());
            androidx.test.espresso.Espresso.onView(org.hamcrest.Matchers.allOf(androidx.test.espresso.matcher.ViewMatchers.isAssignableFrom(android.widget.EditText.class),androidx.test.espresso.matcher.ViewMatchers.isDisplayed())).perform(androidx.test.espresso.action.ViewActions.replaceText("UI test alarm"),androidx.test.espresso.action.ViewActions.closeSoftKeyboard());
            androidx.test.espresso.Espresso.onView(androidx.test.espresso.matcher.ViewMatchers.withText("Save alarm")).perform(androidx.test.espresso.action.ViewActions.scrollTo(),androidx.test.espresso.action.ViewActions.click());
            String saved=null;JSONArray all=ClockAlarms.all(c);for(int i=0;i<all.length();i++)if("UI test alarm".equals(all.getJSONObject(i).optString("title")))saved=all.getJSONObject(i).getString("id");
            assertNotNull("Native editor must persist the alarm",saved);ClockAlarms.delete(c,saved);
        }
    }
    private JSONObject alarm(String id)throws Exception{return new JSONObject().put("id",id).put("title","Test alarm").put("time","09:00").put("enabled",true).put("schedule",new JSONObject().put("type","everyday"));}
    @Test public void fridayAndOneTimeSchedulesChooseFutureOccurrence() throws Exception {
        JSONObject r=alarm("schedule");r.put("schedule",new JSONObject("{\"type\":\"days\",\"days\":[5]}"));
        ZonedDateTime friday=LocalDate.parse("2026-10-30").atTime(10,0).atZone(ZoneId.systemDefault());
        assertEquals(LocalDate.parse("2026-11-06").atTime(9,0).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),ClockAlarms.nextMillis(r,friday));
        r.put("schedule",new JSONObject("{\"type\":\"dates\",\"dates\":[\"2026-10-30\"]}"));assertEquals(0,ClockAlarms.nextMillis(r,friday));
    }
    @Test public void ringingSupportsFiveMinuteSnoozeAndStop() throws Exception {
        Context c=ApplicationProvider.getApplicationContext();String id="instrumented-clock";
        try{
            JSONObject r=alarm(id);ClockAlarms.save(c,r);
            new ClockAlarmReceiver().onReceive(c,new Intent().setAction(ClockAlarms.FIRE).putExtra("id",id));
            NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
            android.app.Notification ring=null;for(int tries=0;tries<30&&ring==null;tries++){Thread.sleep(100);for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==ClockAlarmService.NOTICE)ring=n.getNotification();}
            assertNotNull("Real alarm foreground service must start",ring);assertEquals(2,ring.actions.length);
            long before=System.currentTimeMillis();ring.actions[0].actionIntent.send();
            long until=0;for(int tries=0;tries<30&&until==0;tries++){Thread.sleep(100);until=ClockAlarms.find(c,id).optLong("snoozedUntil");}
            assertTrue(until>=before+ClockAlarms.SNOOZE_MS);assertTrue(until<System.currentTimeMillis()+ClockAlarms.SNOOZE_MS+1000);
            boolean ringing=true;for(int tries=0;tries<30&&ringing;tries++){Thread.sleep(100);ringing=false;for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==ClockAlarmService.NOTICE)ringing=true;}assertFalse("Snooze must silence the current ring",ringing);
            Thread.sleep(300); // allow the stopped service lifecycle to finish before simulating five minutes passing
            new ClockAlarmReceiver().onReceive(c,new Intent().setAction(ClockAlarms.SNOOZE_FIRE).putExtra("id",id));
            ring=null;for(int tries=0;tries<30&&ring==null;tries++){Thread.sleep(100);for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==ClockAlarmService.NOTICE)ring=n.getNotification();}assertNotNull("Snoozed alarm must ring again",ring);ring.actions[1].actionIntent.send();
            Thread.sleep(300);assertEquals(0,ClockAlarms.find(c,id).optLong("snoozedUntil"));
            for(StatusBarNotification n:manager.getActiveNotifications())assertNotEquals(ClockAlarmService.NOTICE,n.getId());
        }finally{ClockAlarms.delete(c,id);}
    }
}
