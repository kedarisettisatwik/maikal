package com.maikal.daily;
import android.app.*;
import android.content.*;
import android.widget.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.time.*;
import static org.junit.Assert.*;
/** Real APK UI captures with demo records only; original WebView cache is restored. */
@RunWith(AndroidJUnit4.class) public class PlayStoreAssetsTest extends NextReleaseTest {
 JSONObject record(String id,String type,String title)throws Exception{return new JSONObject().put("id",id).put("type",type).put("title",title).put("updatedAt",System.currentTimeMillis());}
 void shot(ActivityScenario<MainActivity> screen,String name)throws Exception{js(screen,"document.activeElement?.blur()");if(c.getPackageName().endsWith(".local"))capture("store-2110-"+name);}
 @Test public void dailyNotePersistsAndCalendarMatchesWithListingScreenshots()throws Exception{
  try(ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class)){
   waitJs(screen,"!!document.querySelector('.mobile-app')");String cache=js(screen,"localStorage.getItem('maikal-v2-local')"),theme=js(screen,"localStorage.getItem('mantra-theme')");
   try{
    String day=LocalDate.now().toString();JSONObject records=new JSONObject();JSONObject schedule=new JSONObject().put("type","everyday");
    records.put("read",record("read","goal","Read a chapter").put("goalType","checklist").put("schedule",schedule).put("iconMode","emoji").put("icon","📖"));
    records.put("study",record("study","goal","Focus on learning").put("goalType","tracker").put("trackerUnit","time").put("target",60).put("focusEnabled",true).put("schedule",schedule).put("iconMode","emoji").put("icon","🌱"));
    records.put("progress_study_"+day,record("progress_study_"+day,"progress","").put("goalId","study").put("date",day).put("value",25.5));
    records.put("task",record("task","task","Write the next chapter").put("startDate",day).put("deadline",day).put("trackTime",true).put("target",90).put("focusEnabled",true).put("timeAdjustment",25.5).put("description","One clear idea, a little progress at a time."));
    records.put("event",record("event","event","Evening walk").put("schedule",schedule).put("allDay",false).put("startTime","18:00").put("endTime","18:30"));
    records.put("cat",record("cat","category","").put("name","Everyday").put("kind","expense").put("iconMode","emoji").put("icon","☕"));
    records.put("income",record("income","transaction","Income").put("kind","income").put("date",day).put("amount",250000).put("categoryId","cat"));
    records.put("coffee",record("coffee","transaction","Coffee and a good book").put("kind","expense").put("date",day).put("amount",25000).put("categoryId","cat"));
    records.put("note",record("note","note","Ideas worth keeping").put("noteType","text").put("body","Walk slowly. Notice more.\nMake a little time for the things you love.").put("tags",new JSONArray().put("ideas").put("personal")).put("source","Written here").put("createdAt",System.currentTimeMillis()));
    records.put("note2",record("note2","note","A little reading list").put("noteType","text").put("body","Books and ideas for a quiet weekend.").put("tags",new JSONArray().put("personal")).put("source","Written here").put("createdAt",System.currentTimeMillis()-10000));
    records.put("daynote_"+day,record("daynote_"+day,"dayNote","").put("date",day).put("text","A quiet start. One focused hour.\nKeep room for what matters."));
    String data=new JSONObject().put("records",records).put("dirty",new JSONObject()).toString();
    js(screen,"localStorage.setItem('maikal-v2-local',"+JSONObject.quote(data)+");localStorage.setItem('mantra-theme','light')");
    screen.onActivity(a->a.getBridge().getWebView().reload());Thread.sleep(900);waitJs(screen,"document.querySelector('#day-note-text')?.value.includes('A quiet start')===true");
    js(screen,"let t=document.querySelector('#day-note-text');t.focus();Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,'A calm start. One focused hour.\\nKeep room for what matters.');t.dispatchEvent(new Event('input',{bubbles:true}))");
    waitJs(screen,"[...document.querySelectorAll('button')].some(b=>b.textContent==='Save daily note'&&!b.disabled)");js(screen,"[...document.querySelectorAll('button')].find(b=>b.textContent==='Save daily note').click()");
    assertEquals("true",js(screen,"JSON.parse(localStorage.getItem('maikal-v2-local')).records["+JSONObject.quote("daynote_"+day)+"].text.includes('Keep room')"));
    shot(screen,"01-home");
    js(screen,"document.querySelector('[role=tab][aria-label=Money]').click()");Thread.sleep(500);shot(screen,"02-money");
    js(screen,"document.querySelector('[role=tab][aria-label=Note]').click()");Thread.sleep(500);shot(screen,"03-notes");
    js(screen,"document.querySelector('[role=tab][aria-label=More]').click();[...document.querySelectorAll('button')].find(b=>b.textContent==='Calendar↗').click()");waitJs(screen,"!!document.querySelector('.calendar-day-note')");assertEquals("true",js(screen,"document.querySelector('.calendar-day-note').textContent.includes('Keep room')"));shot(screen,"04-calendar");
    screen.onActivity(a->a.getOnBackPressedDispatcher().onBackPressed());waitJs(screen,"!document.querySelector('dialog[open]')");
    js(screen,"document.querySelector('[role=tab][aria-label=Home]').click();[...document.querySelectorAll('.task-title')].find(b=>b.textContent==='Write the next chapter').click()");waitJs(screen,"!!document.querySelector('.task-details')");shot(screen,"05-task");screen.onActivity(a->a.getOnBackPressedDispatcher().onBackPressed());waitJs(screen,"!document.querySelector('dialog[open]')");
    screen.onActivity(a->a.getBridge().getWebView().reload());Thread.sleep(700);waitJs(screen,"document.querySelector('#day-note-text')?.value.includes('Keep room')===true");
   }finally{js(screen,"let cache="+cache+";if(cache===null)localStorage.removeItem('maikal-v2-local');else localStorage.setItem('maikal-v2-local',cache);let theme="+theme+";if(theme===null)localStorage.removeItem('mantra-theme');else localStorage.setItem('mantra-theme',theme)");}
  }
 }
}
