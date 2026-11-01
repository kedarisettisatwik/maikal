package com.maikal.daily;
import android.app.*;
import android.content.*;
import android.os.*;
import android.service.notification.StatusBarNotification;
import androidx.core.app.RemoteInput;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class ProductivityToolsTest {
 final Context c=ApplicationProvider.getApplicationContext();
 @Test public void checkInsRotateWithoutOpeningTheApp()throws Exception{
  java.time.LocalDate date=java.time.LocalDate.of(2026,11,1);JSONArray entries=GreetingReminders.entries();java.util.Set<String> today=new java.util.HashSet<>();
  for(int i=0;i<entries.length();i++){String id=entries.getJSONObject(i).getString("id");today.add(GreetingReminders.message(id,date)[1]);assertNotEquals(GreetingReminders.message(id,date)[1],GreetingReminders.message(id,date.plusDays(1))[1]);}
  assertEquals(entries.length(),today.size());java.util.Set<String> days=new java.util.HashSet<>();for(int i=0;i<32;i++)days.add(GreetingReminders.message("greeting_10:00",date.plusDays(i))[1]);assertEquals(32,days.size());
 }
 @Test public void trackerReplySavesNativeValueAndDurableOutbox()throws Exception{
  SharedPreferences p=NativeDiaryStore.prefs(c);String uid=NativeDiaryStore.uid(c),records=p.getString("records","[]"),actions=p.getString("actions","[]"),alarms=p.getString("alarms","[]"),totals=p.getString("trackerTotals","{}"),processed=p.getString("trackerReplies","{}");NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);String day=java.time.LocalDate.now().toString();
  try{
   JSONObject goal=new JSONObject().put("id","test_tracker_reply").put("type","goal").put("goalType","tracker").put("title","Tracker reply test").put("schedule",new JSONObject().put("type","everyday"));
   NativeDiaryStore.snapshot(c,"local",new JSONArray().put(goal));p.edit().putString("actions","[]").commit();
   JSONObject entry=new JSONObject(goal.toString()).put("kind","goal").put("time","12:00");p.edit().putString("alarms",new JSONArray().put(entry).toString()).commit();
   new DiaryAlarmReceiver().onReceive(c,new Intent(c,DiaryAlarmReceiver.class).setAction("com.maikal.daily.ALARM").putExtra("alarmId",1));
   android.app.Notification notification=null;for(int attempt=0;attempt<50&&notification==null;attempt++){for(StatusBarNotification n:manager.getActiveNotifications())if("test_tracker_reply".equals(n.getNotification().extras.getString("maikalGoal")))notification=n.getNotification();if(notification==null)Thread.sleep(100);}assertNotNull(notification);assertNotNull(notification.actions);assertEquals("Add progress",notification.actions[0].title.toString());assertTrue(notification.extras.getCharSequence("android.text").toString().contains("Current:"));assertEquals("Additional count",notification.actions[0].getRemoteInputs()[0].getLabel().toString());
   RemoteInput input=new RemoteInput.Builder("tracker_value").build();Intent invalid=new Intent();Bundle bad=new Bundle();bad.putCharSequence("tracker_value","not a number");RemoteInput.addResultsToIntent(new RemoteInput[]{input},invalid,bad);notification.actions[0].actionIntent.send(c,0,invalid);Thread.sleep(200);assertEquals(0,NativeDiaryStore.actions(c).length());Intent reply=new Intent();Bundle value=new Bundle();value.putCharSequence("tracker_value","12.5");RemoteInput.addResultsToIntent(new RemoteInput[]{input},reply,value);notification.actions[0].actionIntent.send(c,0,reply);
   for(int i=0;i<80&&NativeDiaryStore.actions(c).length()==0;i++)Thread.sleep(100);
   assertEquals(12.5,NativeDiaryStore.trackerValue(c,"test_tracker_reply",day),0);assertEquals(1,NativeDiaryStore.pending(c,"local").length());
   assertFalse(NativeDiaryStore.track(c,"wrong-account","test_tracker_reply",day,1));assertFalse(NativeDiaryStore.track(c,"local","test_tracker_reply",day,-1));assertTrue(NativeDiaryStore.addProgress(c,"local","test_tracker_reply",day,0,java.util.UUID.randomUUID().toString()));assertEquals(12.5,NativeDiaryStore.trackerValue(c,"test_tracker_reply",day),0);
  }finally{p.edit().putString("uid",uid).putString("records",records).putString("actions",actions).putString("alarms",alarms).putString("trackerTotals",totals).putString("trackerReplies",processed).commit();manager.cancel("test_tracker_reply_12:00",0);DiaryAlarmReceiver.reschedule(c);}
 }
 @Test public void timerRunsPausedResumesAndRingsWhileAppIsClosed()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);
  try{TimeTools.control(c,"timerReset",0);TimeTools.control(c,"timerStart",5000);Thread.sleep(150);JSONObject running=TimeTools.state(c);assertTrue(running.getBoolean("timerRunning"));assertTrue(running.getLong("remainingMs")<5000);
   JSONObject paused=TimeTools.control(c,"timerPause",0);long remaining=paused.getLong("remainingMs");Thread.sleep(100);assertEquals(remaining,TimeTools.state(c).getLong("remainingMs"));TimeTools.control(c,"timerResume",0);assertTrue(TimeTools.state(c).getBoolean("timerRunning"));
   TimeTools.control(c,"timerReset",0);TimeTools.control(c,"timerStart",2000);screen.moveToState(androidx.lifecycle.Lifecycle.State.CREATED);
   NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);boolean ringing=false;for(int i=0;i<150;i++){for(StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==ClockAlarmService.NOTICE&&"Timer finished".contentEquals(n.getNotification().extras.getCharSequence("android.title","")))ringing=true;if(ringing)break;Thread.sleep(100);}assertTrue("Timer should ring after the app leaves the foreground",ringing);assertTrue(TimeTools.state(c).getBoolean("finished"));
  }finally{TimeTools.control(c,"timerReset",0);screen.onActivity(Activity::finishAndRemoveTask);}
 }
 @Test public void stopwatchPersistsPauseAndLaps()throws Exception{
  try{TimeTools.control(c,"swReset",0);TimeTools.control(c,"swStart",0);Thread.sleep(150);JSONObject lap=TimeTools.control(c,"swLap",0);assertTrue(lap.getJSONArray("laps").getLong(0)>0);JSONObject paused=TimeTools.control(c,"swPause",0);long value=paused.getLong("stopwatchMs");Thread.sleep(100);assertEquals(value,TimeTools.state(c).getLong("stopwatchMs"));TimeTools.control(c,"swStart",0);Thread.sleep(100);assertTrue(TimeTools.state(c).getLong("stopwatchMs")>value);}finally{TimeTools.control(c,"swReset",0);}
 }
 private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch done=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,v->{value.set(v);done.countDown();}));assertTrue(done.await(5,java.util.concurrent.TimeUnit.SECONDS));return value.get();}
 private void waitFor(ActivityScenario<MainActivity> screen,String code)throws Exception{for(int i=0;i<150;i++){if("true".equals(js(screen,code)))return;Thread.sleep(100);}fail(code);}
 @Test public void formattedNotesAndTimeSubtabsWorkInTheMobileApp()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String previous=null;
  try{waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");previous=js(screen,"localStorage.getItem('maikal-v2-local')");
   js(screen,"(()=>{const cache=JSON.parse(localStorage.getItem('maikal-v2-local')||'{\"records\":{},\"dirty\":{}}');cache.records.__format_qa={id:'__format_qa',type:'note',noteType:'text',title:'Formatting check',body:'First line\\n\\n  second line\\n\\tIndented',tags:[],createdAt:1,updatedAt:1};localStorage.setItem('maikal-v2-local',JSON.stringify(cache));window.__qaReload=true;location.hash='home';location.reload();return true;})()");
   waitFor(screen,"!window.__qaReload&&Boolean(document.querySelector('.mobile-app'))");js(screen,"document.querySelector('[role=tab][aria-label=Note]').click()");js(screen,"[...document.querySelectorAll('.mobile-note button')].find(b=>b.textContent==='Formatting check').click()");waitFor(screen,"Boolean(document.querySelector('.notes-editor textarea'))");
   assertEquals("true",js(screen,"(()=>{const p=document.querySelector('.notes-results'),b=p.querySelector('button');return p.contains(b)&&getComputedStyle(p).borderStyle==='solid'&&getComputedStyle(b).borderStyle==='solid';})()"));
   assertEquals("true",js(screen,"(()=>{const text=document.querySelector('.notes-editor textarea');return text.value==='First line\\n\\n  second line\\n\\tIndented';})()"));
   assertEquals("true",js(screen,"(()=>{const h=document.querySelector('dialog[open] .dialoghead');return h.querySelector('button').getBoundingClientRect().left<h.querySelector('.kicker').getBoundingClientRect().left&&Boolean(document.querySelector('.notes-editor .note-delete'));})()"));
   js(screen,"document.querySelector('dialog[open] button[aria-label=\"Back to diary\"]').click()");js(screen,"document.querySelector('[role=tab][aria-label=Time]').click()");assertEquals("true",js(screen,"document.querySelectorAll('.time-subtabs [role=tab]').length===3"));
   js(screen,"document.querySelector('.time-subtabs [aria-label=Stopwatch]').click()");waitFor(screen,"document.querySelector('.tool-clock')?.textContent!=='—'&&Boolean(document.querySelector('.tool-clock'))");js(screen,"[...document.querySelectorAll('.tool-actions button')].find(b=>b.textContent==='Start stopwatch').click()");waitFor(screen,"Boolean([...document.querySelectorAll('.tool-actions button')].find(b=>b.textContent==='Lap'))");js(screen,"[...document.querySelectorAll('.tool-actions button')].find(b=>b.textContent==='Reset stopwatch').click()");
   js(screen,"document.querySelector('.time-subtabs [aria-label=Timer]').click()");waitFor(screen,"Boolean(document.querySelector('[aria-label=\"Timer minutes\"]'))");
   js(screen,"document.querySelector('[aria-label=\"Timer minutes\"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true}))");js(screen,"document.querySelector('[aria-label=\"Timer minutes\"]').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowDown',bubbles:true}))");waitFor(screen,"document.querySelector('[aria-label=\"Timer minutes\"]').getAttribute('aria-valuenow')==='1'");assertEquals("true",js(screen,"document.querySelectorAll('.duration-wheel').length===3&&getComputedStyle(document.querySelector('.duration-wheel')).height==='120px'"));

  }finally{if(previous!=null)js(screen,"(()=>{const value="+previous+";if(value===null)localStorage.removeItem('maikal-v2-local');else localStorage.setItem('maikal-v2-local',value);return true;})()");TimeTools.control(c,"swReset",0);screen.onActivity(Activity::finishAndRemoveTask);}
 }

}
