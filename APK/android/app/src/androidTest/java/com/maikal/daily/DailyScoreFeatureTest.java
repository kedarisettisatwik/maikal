package com.maikal.daily;

import android.app.Activity;
import android.content.Context;
import androidx.test.core.app.ActivityScenario;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.*;
import org.junit.runner.RunWith;
import org.json.*;
import java.time.LocalDate;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class DailyScoreFeatureTest {
 final Context c=ApplicationProvider.getApplicationContext();
 @Test public void morningSlotsUseYesterdayAndSkipEmptyDays()throws Exception {
  String old=NativeDiaryStore.prefs(c).getString("records","[]"),uid=NativeDiaryStore.uid(c);
  try {
   JSONArray slots=ScoreReminders.entries();String[] times={"00:30","01:00","06:00","08:00","10:00","11:00"};assertEquals(6,slots.length());java.util.Set<String> wording=new java.util.HashSet<>();for(String time:times)wording.add(ScoreReminders.message(time,LocalDate.of(2026,11,1)));assertEquals(6,wording.size());assertNotEquals(ScoreReminders.message("00:30",LocalDate.of(2026,11,1)),ScoreReminders.message("00:30",LocalDate.of(2026,11,2)));for(int i=0;i<times.length;i++)assertEquals(times[i],slots.getJSONObject(i).getJSONArray("times").getString(0));
   assertTrue(ScoreReminders.deliveryTime(java.time.LocalTime.of(0,30),"00:30"));assertTrue(ScoreReminders.deliveryTime(java.time.LocalTime.of(11,10),"11:00"));assertFalse(ScoreReminders.deliveryTime(java.time.LocalTime.of(0,29),"00:30"));assertFalse(ScoreReminders.deliveryTime(java.time.LocalTime.of(1,0),"00:30"));assertFalse(ScoreReminders.deliveryTime(java.time.LocalTime.of(21,0),"11:00"));
   LocalDate today=LocalDate.now();String yesterday=today.minusDays(1).toString();JSONObject g=goal("g").put("createdDate",today.toString());NativeDiaryStore.snapshot(c,"local",new JSONArray().put(g));assertFalse(ScoreReminders.shouldNotify(c,today));
   g.put("createdDate",yesterday);JSONArray records=new JSONArray().put(g).put(new JSONObject().put("id","progress_g_"+yesterday).put("type","progress").put("value",true));NativeDiaryStore.snapshot(c,"local",records);assertTrue("Completed days should still receive their report",ScoreReminders.shouldNotify(c,today));
   g.put("deleted",true).put("scoringHistory",new JSONArray().put(new JSONObject().put("from",yesterday).put("deleted",false)).put(new JSONObject().put("from",today.toString()).put("deleted",true)));NativeDiaryStore.snapshot(c,"local",new JSONArray().put(g));assertTrue(ScoreReminders.shouldNotify(c,today));
   NativeDiaryStore.snapshot(c,"local",new JSONArray().put(new JSONObject().put("type","score").put("date",yesterday).put("total",3)));assertTrue(ScoreReminders.shouldNotify(c,today));NativeDiaryStore.snapshot(c,"local",new JSONArray());assertFalse(ScoreReminders.shouldNotify(c,today));
   JSONObject newYear=goal("year").put("createdDate","2026-12-31").put("schedule",new JSONObject().put("type","dates").put("dates",new JSONArray().put("2026-12-31")));NativeDiaryStore.snapshot(c,"local",new JSONArray().put(newYear));assertTrue(ScoreReminders.shouldNotify(c,LocalDate.of(2027,1,1)));
  } finally { NativeDiaryStore.prefs(c).edit().putString("records",old).putString("uid",uid).commit(); }
 }
 private JSONObject goal(String id)throws Exception{return new JSONObject().put("id",id).put("type","goal").put("title",id).put("goalType","checklist").put("schedule",new JSONObject().put("type","everyday"));}
 private JSONObject progress(String id,String date,int value)throws Exception{return new JSONObject().put("id","progress_"+id+"_"+date).put("type","progress").put("goalId",id).put("date",date).put("value",value).put("updatedAt",1);}
 private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch done=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,v->{value.set(v);done.countDown();}));assertTrue(done.await(20,java.util.concurrent.TimeUnit.SECONDS));return value.get();}
 private void waitFor(ActivityScenario<MainActivity> screen,String code)throws Exception{for(int i=0;i<200;i++){if("true".equals(js(screen,code)))return;Thread.sleep(100);}fail(code);}
 @Test public void reportNotificationOpensYesterday()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);
  try{waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");screen.onActivity(a->a.startActivity(new android.content.Intent(a,MainActivity.class).setData(android.net.Uri.parse("mantra://report")).putExtra("quickAction","report").addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK|android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP|android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP)));waitFor(screen,"Boolean(document.querySelector('.score-photo-choice'))");assertEquals("true",js(screen,"document.querySelector('.score-page h1').textContent.includes('Yesterday')"));}
  finally{screen.onActivity(Activity::finishAndRemoveTask);}
 }
 @Test public void yesterdayPhotoEditorAndEventsUseOneForm()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String original=null;
  try{
   waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");original=js(screen,"localStorage.getItem('maikal-v2-local')");
   LocalDate day=LocalDate.now();String yesterday=day.minusDays(1).toString();JSONObject g=goal("score-test-goal").put("title","Pushups").put("createdDate",yesterday).put("goalType","tracker").put("target",40).put("targetRule","atLeast");JSONObject p=progress(g.getString("id"),yesterday,40);JSONObject records=new JSONObject().put(g.getString("id"),g).put(p.getString("id"),p);String seed=new JSONObject().put("records",records).put("dirty",new JSONObject()).toString();
   js(screen,"localStorage.setItem('maikal-v2-local',"+JSONObject.quote(seed)+");location.reload();true");waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");waitFor(screen,"Boolean(JSON.parse(localStorage.getItem('maikal-v2-local')).records['score_"+yesterday+"'])");
   js(screen,"document.querySelector('[role=tab][aria-label=More]').click();true");waitFor(screen,"document.querySelector('.mobile-more .score-totals')?.textContent.includes('12')");
   js(screen,"[...document.querySelectorAll('.mobile-more button')].find(b=>b.textContent.includes('Yesterday')).click();true");waitFor(screen,"Boolean(document.querySelector('.score-photo-choice'))");assertEquals("true",js(screen,"document.querySelector('.report-goals').textContent.includes('Met')&&document.querySelector('.report-goals').textContent.includes('40')"));
   js(screen,"[...document.querySelectorAll('.score-page button')].find(b=>b.textContent==='Skip').click();true");waitFor(screen,"document.querySelector('[data-score-canvas]')?.width===1080&&document.querySelector('[data-score-canvas]')?.height===1920");assertEquals("true",js(screen,"document.querySelector('[data-score-canvas]').toDataURL('image/png').startsWith('data:image/png;base64,')"));
   String picture=new JSONArray("["+js(screen,"document.querySelector('[data-score-canvas]').toDataURL('image/png')")+"]").getString(0);android.content.ContentValues media=new android.content.ContentValues();media.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME,"MANTRA-report-test-"+c.getPackageName()+".png");media.put(android.provider.MediaStore.Images.Media.MIME_TYPE,"image/png");media.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH,"Pictures");android.net.Uri uri=c.getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,media);assertNotNull(uri);try(java.io.OutputStream out=c.getContentResolver().openOutputStream(uri)){out.write(android.util.Base64.decode(picture.substring(22),android.util.Base64.DEFAULT));}
   js(screen,"document.querySelector('dialog[open] button[aria-label=\"Back to diary\"]').click();[...document.querySelectorAll('.mobile-more button')].find(b=>b.textContent.includes('Add event')).click();true");waitFor(screen,"Boolean(document.querySelector('dialog[open] .all-day-field'))");assertEquals("\"Create an event\"",js(screen,"document.querySelector('dialog[open] h2').textContent"));
  }finally{if(original!=null)js(screen,"localStorage."+("null".equals(original)?"removeItem('maikal-v2-local')":"setItem('maikal-v2-local',"+original+")")+";true");screen.onActivity(Activity::finishAndRemoveTask);}
 }
}
