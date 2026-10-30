package com.maikal.daily;

import android.app.*;
import android.content.*;
import android.os.*;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.time.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class LinkedAlarmsTest {
    private Context c;private JSONArray previousRecords;private String previousUid,previousAlarms;
    private Instrumentation instrumentation;
    private void shell(String command)throws Exception{try(ParcelFileDescriptor fd=instrumentation.getUiAutomation().executeShellCommand(command);java.io.FileInputStream in=new java.io.FileInputStream(fd.getFileDescriptor())){while(in.read()!=-1){}}}
    @Before public void setup()throws Exception{c=ApplicationProvider.getApplicationContext();instrumentation=InstrumentationRegistry.getInstrumentation();previousRecords=NativeDiaryStore.records(c);previousUid=NativeDiaryStore.uid(c);previousAlarms=c.getSharedPreferences("maikal_clock_v1",0).getString("alarms","[]");shell("appops set "+c.getPackageName()+" SCHEDULE_EXACT_ALARM allow");shell("pm grant "+c.getPackageName()+" android.permission.POST_NOTIFICATIONS");shell("appops set "+c.getPackageName()+" USE_FULL_SCREEN_INTENT allow");}
    @After public void cleanup()throws Exception{JSONArray all=ClockAlarms.all(c);for(int i=0;i<all.length();i++){String id=all.getJSONObject(i).getString("id");ClockAlarms.cancel(c,id);c.startService(new Intent(c,ClockAlarmService.class).setAction("STOP").putExtra("id",id));}c.getSharedPreferences("maikal_clock_v1",0).edit().putString("alarms",previousAlarms).commit();NativeDiaryStore.snapshot(c,previousUid,previousRecords);ClockAlarms.restore(c);}
    private JSONObject source(String id,String type,String...times)throws Exception{return new JSONObject().put("id",id).put("type",type).put("kind","meeting").put("title","Linked "+id).put("createdDate",LocalDate.now().toString()).put("schedule",new JSONObject().put("type","everyday")).put("alarmTimes",new JSONArray(times));}
    private void sync(String uid,JSONArray records)throws Exception{NativeDiaryStore.snapshot(c,uid,records);ClockAlarms.syncDiary(c,uid,records);}
    private void standalone()throws Exception{ClockAlarms.save(c,new JSONObject().put("id","linked-test-manual").put("title","Standalone test").put("time","09:00").put("enabled",true).put("schedule",new JSONObject().put("type","everyday")));}
    @Test public void createsGoalReminderAndMeetingAlarmsWithoutDuplicatesAndKeepsStandalone()throws Exception{
        standalone();JSONObject g=source("g","goal","07:00","07:00","08:00"),r=source("r","event","10:00").put("kind","reminder"),m=source("m","event","12:00");JSONArray records=new JSONArray().put(g).put(r).put(m);sync("local",records);
        int size=ClockAlarms.all(c).length();assertNotNull(ClockAlarms.find(c,DiaryClockAlarms.id("local","g","07:00")));assertNotNull(ClockAlarms.find(c,DiaryClockAlarms.id("local","g","08:00")));assertEquals("reminder",ClockAlarms.find(c,DiaryClockAlarms.id("local","r","10:00")).getString("sourceKind"));assertEquals("meeting",ClockAlarms.find(c,DiaryClockAlarms.id("local","m","12:00")).getString("sourceKind"));sync("local",records);assertEquals(size,ClockAlarms.all(c).length());assertNotNull(ClockAlarms.find(c,"linked-test-manual"));assertNotNull(((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).getNextAlarmClock());
    }
    @Test public void editingRemovingAndDeletingSourceCancelsItsAlarms()throws Exception{
        standalone();JSONObject goal=source("edit","goal","07:00");sync("local",new JSONArray().put(goal));String first=DiaryClockAlarms.id("local","edit","07:00");goal.put("title","Renamed goal").put("alarmTimes",new JSONArray().put("08:00"));sync("local",new JSONArray().put(goal));assertNull(ClockAlarms.find(c,first));String next=DiaryClockAlarms.id("local","edit","08:00");assertEquals("Renamed goal",ClockAlarms.find(c,next).getString("title"));goal.put("deleted",true);sync("local",new JSONArray().put(goal));assertNull(ClockAlarms.find(c,next));assertNotNull(ClockAlarms.find(c,"linked-test-manual"));
        goal.remove("deleted");sync("local",new JSONArray().put(goal));goal.put("alarmTimes",new JSONArray());sync("local",new JSONArray().put(goal));assertNull(ClockAlarms.find(c,next));
    }
    @Test public void accountSwitchRemovesOldLinkedAlarmsAndPreservesManualAlarms()throws Exception{
        standalone();JSONArray records=new JSONArray().put(source("account","goal","09:00"));sync("first-account",records);String old=DiaryClockAlarms.id("first-account","account","09:00");assertNotNull(ClockAlarms.find(c,old));sync("second-account",records);assertNull(ClockAlarms.find(c,old));assertNotNull(ClockAlarms.find(c,DiaryClockAlarms.id("second-account","account","09:00")));assertNotNull(ClockAlarms.find(c,"linked-test-manual"));
    }
    @Test public void staleAccountCannotReceiveLinkedAlarmOrAdvanceNotice()throws Exception{
        String time=java.time.LocalTime.now().plusMinutes(15).withSecond(0).withNano(0).format(java.time.format.DateTimeFormatter.ofPattern("HH:mm"));JSONArray records=new JSONArray().put(source("stale-account","goal",time));sync("first",records);String id=DiaryClockAlarms.id("first","stale-account",time);JSONObject alarm=ClockAlarms.find(c,id);long at=ClockAlarms.nextMillis(alarm,ZonedDateTime.now());NativeDiaryStore.snapshot(c,"second",new JSONArray());assertFalse(DiaryClockAlarms.current(c,alarm));
        new UpcomingAlarmReceiver().onReceive(c,new Intent().setAction(UpcomingAlarmReceiver.SHOW).putExtra("id",id).putExtra("occurrence",at));new ClockAlarmReceiver().onReceive(c,new Intent().setAction(ClockAlarms.FIRE).putExtra("id",id));Thread.sleep(200);
        for(android.service.notification.StatusBarNotification notice:((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).getActiveNotifications()){assertFalse(id.equals(notice.getNotification().extras.getString("upcomingAlarmId")));if(notice.getId()==ClockAlarmService.NOTICE)assertNotEquals("Linked stale-account",notice.getNotification().extras.getString(Notification.EXTRA_TITLE));}
    }
    @Test public void nativeDisableSnoozeAndDismissAreNotResetByOrdinarySync()throws Exception{
        JSONArray records=new JSONArray().put(source("state","goal","09:00"));sync("local",records);String id=DiaryClockAlarms.id("local","state","09:00");JSONObject alarm=ClockAlarms.find(c,id);alarm.put("enabled",false);ClockAlarms.save(c,alarm);sync("local",records);assertFalse(ClockAlarms.find(c,id).getBoolean("enabled"));alarm.put("enabled",true).put("snoozedUntil",System.currentTimeMillis()+300000).put("dismissedUpcoming",123456L);ClockAlarms.storeState(c,alarm);sync("local",records);JSONObject after=ClockAlarms.find(c,id);assertEquals(alarm.getLong("snoozedUntil"),after.getLong("snoozedUntil"));assertEquals(123456,after.getLong("dismissedUpcoming"));
    }
    @Test public void supportsDateRangesAndRetainsExpiredAlarmsAsOff()throws Exception{
        JSONObject goal=source("range","goal","09:00").put("schedule",new JSONObject().put("type","range").put("from",LocalDate.now().plusDays(1).toString()).put("to",LocalDate.now().plusDays(3).toString()));sync("local",new JSONArray().put(goal));JSONObject alarm=ClockAlarms.find(c,DiaryClockAlarms.id("local","range","09:00"));assertEquals(LocalDate.now().plusDays(1),Instant.ofEpochMilli(ClockAlarms.nextMillis(alarm,ZonedDateTime.now())).atZone(ZoneId.systemDefault()).toLocalDate());goal.put("schedule",new JSONObject().put("type","dates").put("dates",new JSONArray().put(LocalDate.now().minusDays(1).toString())));sync("local",new JSONArray().put(goal));assertFalse(ClockAlarms.find(c,alarm.getString("id")).getBoolean("enabled"));
    }
    private Notification ringing(){for(android.service.notification.StatusBarNotification notice:((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).getActiveNotifications())if(notice.getId()==ClockAlarmService.NOTICE)return notice.getNotification();return null;}
    @Test public void linkedAlarmUsesRealRingingServiceAndFiveMinuteSnooze()throws Exception{
        sync("local",new JSONArray().put(source("ring","goal","09:00")));String id=DiaryClockAlarms.id("local","ring","09:00");new ClockAlarmReceiver().onReceive(c,new Intent().setAction(ClockAlarms.FIRE).putExtra("id",id));Notification notice=null;for(int i=0;i<40&&notice==null;i++){Thread.sleep(100);notice=ringing();}assertNotNull(notice);assertNotNull(notice.fullScreenIntent);assertEquals("Snooze · 5 min",notice.actions[0].title);long before=System.currentTimeMillis();notice.actions[0].actionIntent.send();long until=0;for(int i=0;i<40&&until==0;i++){Thread.sleep(100);until=ClockAlarms.find(c,id).optLong("snoozedUntil");}assertTrue(until>=before+ClockAlarms.SNOOZE_MS);assertTrue(until<=System.currentTimeMillis()+ClockAlarms.SNOOZE_MS);for(int i=0;i<40&&ringing()!=null;i++)Thread.sleep(100);assertNull(ringing());assertTrue(ClockAlarms.find(c,id).getBoolean("enabled"));
    }
    private String js(ActivityScenario<MainActivity> screen,String script)throws Exception{java.util.concurrent.CountDownLatch latch=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(script,result->{value.set(result);latch.countDown();}));latch.await(3,java.util.concurrent.TimeUnit.SECONDS);return value.get();}
    private TextView find(View v,String text){if(v instanceof TextView&&text.equals(((TextView)v).getText().toString()))return (TextView)v;if(v instanceof ViewGroup){ViewGroup g=(ViewGroup)v;for(int i=0;i<g.getChildCount();i++){TextView result=find(g.getChildAt(i),text);if(result!=null)return result;}}return null;}
    @Test public void apkGoalFormAutomaticallyCreatesAlarmAndLinkedEditOpensOriginalEntry()throws Exception{
        ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String id=null;
        try{
            for(int i=0;i<60&&!"true".equals(js(screen,"Boolean(document.querySelector('main.sheet'))"));i++)Thread.sleep(200);
            js(screen,"document.querySelector('[aria-label=\"Open menu\"]').click()");js(screen,"[...document.querySelectorAll('nav button')].find(b=>b.textContent==='Add goal').click()");
            for(int i=0;i<30&&!"true".equals(js(screen,"Boolean(document.querySelector('dialog input[name=title]'))"));i++)Thread.sleep(100);
            js(screen,"document.querySelector('dialog input[name=title]').value='Linked UI goal'; [...document.querySelectorAll('dialog button')].find(b=>b.textContent==='+ Add alarm time').click()");Thread.sleep(200);js(screen,"document.querySelector('dialog button[type=submit]').click()");
            for(int i=0;i<70&&id==null;i++){Thread.sleep(200);JSONArray all=ClockAlarms.all(c);for(int j=0;j<all.length();j++)if("Linked UI goal".equals(all.getJSONObject(j).optString("title")))id=all.getJSONObject(j).getString("id");}
            assertNotNull("Saving the alarm-only goal must create a native alarm",id);JSONObject saved=ClockAlarms.find(c,id);assertEquals("local",saved.getString("sourceUid"));
            Instrumentation.ActivityMonitor monitor=instrumentation.addMonitor(AlarmsActivity.class.getName(),null,false);
            try{js(screen,"document.querySelector('[aria-label=\"Open menu\"]').click()");js(screen,"[...document.querySelectorAll('nav button')].find(b=>b.textContent==='Alarms').click()");Activity activity=instrumentation.waitForMonitorWithTimeout(monitor,5000);assertNotNull(activity);instrumentation.runOnMainSync(()->{TextView edit=find(activity.getWindow().getDecorView(),"Edit linked goal");assertNotNull("Linked alarm appears in the full-screen alarm list",edit);edit.performClick();});}finally{instrumentation.removeMonitor(monitor);}
            boolean opened=false;for(int i=0;i<50&&!opened;i++){Thread.sleep(100);opened="true".equals(js(screen,"document.querySelector('dialog input[name=title]')?.value==='Linked UI goal'"));}assertTrue("Linked edit opens the original goal form",opened);
            String sourceId=saved.getString("sourceId");js(screen,"(()=>{const key='maikal-v2-local';const cache=JSON.parse(localStorage.getItem(key));delete cache.records['"+sourceId+"'];delete cache.dirty['"+sourceId+"'];localStorage.setItem(key,JSON.stringify(cache));return true;})()");
        }finally{screen.onActivity(Activity::finishAndRemoveTask);}
    }
}
