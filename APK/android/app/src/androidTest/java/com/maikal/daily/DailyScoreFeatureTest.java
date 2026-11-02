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
 @Test public void retiredReportLinkOpensMoreWithScoresOnly()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);try{waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");screen.onActivity(a->a.startActivity(new android.content.Intent(a,MainActivity.class).setData(android.net.Uri.parse("mantra://report")).putExtra("quickAction","report").addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK|android.content.Intent.FLAG_ACTIVITY_CLEAR_TOP|android.content.Intent.FLAG_ACTIVITY_SINGLE_TOP)));waitFor(screen,"document.querySelector('.mobile-app').dataset.activeTab==='more'");assertEquals("true",js(screen,"Boolean(document.querySelector('.mobile-more .score-totals'))&&!document.querySelector('[data-score-editor]')&&![...document.querySelectorAll('.mobile-more button')].some(b=>b.textContent.includes('Yesterday'))"));}finally{screen.onActivity(Activity::finishAndRemoveTask);}
 }

}
