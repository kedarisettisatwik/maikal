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
    @org.junit.Before public void grantAlarmAccess()throws Exception{Context c=ApplicationProvider.getApplicationContext();for(String command:new String[]{"appops set "+c.getPackageName()+" SCHEDULE_EXACT_ALARM allow","pm grant "+c.getPackageName()+" android.permission.POST_NOTIFICATIONS","appops set "+c.getPackageName()+" USE_FULL_SCREEN_INTENT allow"})try(android.os.ParcelFileDescriptor.AutoCloseInputStream in=new android.os.ParcelFileDescriptor.AutoCloseInputStream(androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getUiAutomation().executeShellCommand(command))){in.readAllBytes();}}
    private void dragHandle(androidx.test.core.app.ActivityScenario<RingingAlarmActivity> screen,boolean right){
        screen.onActivity(activity->{android.view.View slider=activity.findViewById(android.R.id.content).findViewWithTag("alarmSwipe");float x=slider.getWidth()/2f,y=slider.getHeight()/2f,end=right?slider.getWidth()-8:8;long now=android.os.SystemClock.uptimeMillis();
            for(int i=0;i<3;i++){android.view.MotionEvent event=android.view.MotionEvent.obtain(now,now+100*i,i==0?android.view.MotionEvent.ACTION_DOWN:i==1?android.view.MotionEvent.ACTION_MOVE:android.view.MotionEvent.ACTION_UP,i==0?x:end,y,0);slider.dispatchTouchEvent(event);event.recycle();}
        });
    }
    private void capture(String name)throws Exception {android.graphics.Bitmap bitmap=androidx.test.platform.app.InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();if(bitmap!=null){try(java.io.FileOutputStream out=new java.io.FileOutputStream(new java.io.File(ApplicationProvider.getApplicationContext().getCacheDir(),name))){bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}bitmap.recycle();}}
    @Test public void advanceNoticeDismissSkipsCurrentAlarmAndKeepsRepeat() throws Exception {
        Context c=ApplicationProvider.getApplicationContext();String id="upcoming-test";NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        try{JSONObject r=alarm(id);r.put("time",LocalTime.now().plusMinutes(15).withSecond(0).withNano(0).toString());ClockAlarms.save(c,r);long due=ClockAlarms.nextMillis(r,ZonedDateTime.now());assertEquals(600000,due-UpcomingAlarmReceiver.noticeTime(due));
            Intent show=new Intent().setAction(UpcomingAlarmReceiver.SHOW).putExtra("id",id).putExtra("occurrence",due);new UpcomingAlarmReceiver().onReceive(c,show);
            android.app.Notification notice=null;for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==UpcomingAlarmReceiver.NOTICE)notice=n.getNotification();assertNotNull(notice);assertEquals("Dismiss",notice.actions[0].title.toString());notice.actions[0].actionIntent.send();
            for(int i=0;i<30&&ClockAlarms.find(c,id).optLong("dismissedUpcoming")!=due;i++)Thread.sleep(100);
            JSONObject after=ClockAlarms.find(c,id);assertTrue(after.getBoolean("enabled"));assertEquals(due,after.getLong("dismissedUpcoming"));assertEquals(due,after.getLong("skippedOccurrence"));assertTrue(ClockAlarms.nextMillis(after,ZonedDateTime.now())>due);
            new UpcomingAlarmReceiver().onReceive(c,show);for(StatusBarNotification n:manager.getActiveNotifications())assertNotEquals("The dismissed occurrence must stay hidden",UpcomingAlarmReceiver.NOTICE,n.getId());
            long future=ClockAlarms.nextMillis(after,ZonedDateTime.now().plusDays(1));assertNotEquals(future,after.optLong("dismissedUpcoming"));
        }finally{ClockAlarms.delete(c,id);}
    }
    @Test public void nativeEditorCreatesAnAlarm() throws Exception {
        Context c=ApplicationProvider.getApplicationContext();
        try(androidx.test.core.app.ActivityScenario<AlarmsActivity> screen=androidx.test.core.app.ActivityScenario.launch(AlarmsActivity.class)){
            capture("alarms-list.png");
            androidx.test.espresso.Espresso.onView(androidx.test.espresso.matcher.ViewMatchers.withContentDescription("Add alarm")).perform(androidx.test.espresso.action.ViewActions.click());
            androidx.test.espresso.Espresso.onView(androidx.test.espresso.matcher.ViewMatchers.withContentDescription("Alarm name")).perform(androidx.test.espresso.action.ViewActions.replaceText("UI test alarm"),androidx.test.espresso.action.ViewActions.closeSoftKeyboard());
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
                        long before=System.currentTimeMillis();
            Intent screenIntent=new Intent(c,RingingAlarmActivity.class).putExtra("id",id).putExtra("title","Morning alarm").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try(androidx.test.core.app.ActivityScenario<RingingAlarmActivity> screen=androidx.test.core.app.ActivityScenario.launch(screenIntent)){capture("alarm-ringing.png");dragHandle(screen,false);}
            long until=0;for(int tries=0;tries<30&&until==0;tries++){Thread.sleep(100);until=ClockAlarms.find(c,id).optLong("snoozedUntil");}
            assertTrue(until>=before+ClockAlarms.SNOOZE_MS);assertTrue(until<System.currentTimeMillis()+ClockAlarms.SNOOZE_MS+1000);
            boolean ringing=true;for(int tries=0;tries<30&&ringing;tries++){Thread.sleep(100);ringing=false;for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==ClockAlarmService.NOTICE)ringing=true;}assertFalse("Snooze must silence the current ring",ringing);
            Thread.sleep(300); // allow the stopped service lifecycle to finish before simulating five minutes passing
            new ClockAlarmReceiver().onReceive(c,new Intent().setAction(ClockAlarms.SNOOZE_FIRE).putExtra("id",id));
            ring=null;for(int tries=0;tries<30&&ring==null;tries++){Thread.sleep(100);for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==ClockAlarmService.NOTICE)ring=n.getNotification();}assertNotNull("Snoozed alarm must ring again",ring);try(androidx.test.core.app.ActivityScenario<RingingAlarmActivity> screen=androidx.test.core.app.ActivityScenario.launch(new Intent(c,RingingAlarmActivity.class).putExtra("id",id).putExtra("title","Morning alarm").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK))){dragHandle(screen,true);}
            Thread.sleep(300);assertEquals(0,ClockAlarms.find(c,id).optLong("snoozedUntil"));
            for(StatusBarNotification n:manager.getActiveNotifications())assertNotEquals(ClockAlarmService.NOTICE,n.getId());
        }finally{ClockAlarms.delete(c,id);}
    }
    @Test public void dismissDisablesOneTimeButSwipingOnlyHidesNotice()throws Exception{
        Context c=ApplicationProvider.getApplicationContext();String id="dismiss-once";try{JSONObject r=alarm(id).put("oneTime",true).put("time",LocalTime.now().plusMinutes(20).withSecond(0).withNano(0).toString());ClockAlarms.save(c,r);long due=ClockAlarms.nextMillis(r,ZonedDateTime.now());new UpcomingAlarmReceiver().onReceive(c,new Intent().setAction(UpcomingAlarmReceiver.HIDE).putExtra("id",id).putExtra("occurrence",due));assertEquals(due,ClockAlarms.nextMillis(ClockAlarms.find(c,id),ZonedDateTime.now()));new UpcomingAlarmReceiver().onReceive(c,new Intent().setAction(UpcomingAlarmReceiver.DISMISS).putExtra("id",id).putExtra("occurrence",due));assertFalse(ClockAlarms.find(c,id).getBoolean("enabled"));assertEquals(due,ClockAlarms.find(c,id).getLong("skippedOccurrence"));}finally{ClockAlarms.delete(c,id);}
    }
    @Test public void staleDismissCannotSkipANewerAlarm()throws Exception{
        Context c=ApplicationProvider.getApplicationContext();String id="dismiss-stale";try{JSONObject r=alarm(id).put("time",LocalTime.now().plusMinutes(20).withSecond(0).withNano(0).toString());ClockAlarms.save(c,r);long old=ClockAlarms.nextMillis(r,ZonedDateTime.now());r.put("time",LocalTime.now().plusMinutes(30).withSecond(0).withNano(0).toString());ClockAlarms.save(c,r);long next=ClockAlarms.nextMillis(r,ZonedDateTime.now());new UpcomingAlarmReceiver().onReceive(c,new Intent().setAction(UpcomingAlarmReceiver.DISMISS).putExtra("id",id).putExtra("occurrence",old));assertEquals(next,ClockAlarms.nextMillis(ClockAlarms.find(c,id),ZonedDateTime.now()));assertEquals(0,ClockAlarms.find(c,id).optLong("skippedOccurrence"));}finally{ClockAlarms.delete(c,id);}
    }
    @Test public void dismissAcrossMidnightSkipsTomorrowEvenBeforeMidnight()throws Exception{ZonedDateTime now=LocalDate.of(2026,11,2).atTime(23,55).atZone(ZoneId.systemDefault());JSONObject r=alarm("midnight").put("time","00:05");long skipped=now.toLocalDate().plusDays(1).atTime(0,5).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli();r.put("skippedOccurrence",skipped);assertEquals(now.toLocalDate().plusDays(2).atTime(0,5).atZone(ZoneId.systemDefault()).toInstant().toEpochMilli(),ClockAlarms.nextMillis(r,now));}
}
