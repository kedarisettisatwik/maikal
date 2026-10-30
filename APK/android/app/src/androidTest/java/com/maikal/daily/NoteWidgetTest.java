package com.maikal.daily;

import android.content.*;
import android.widget.*;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class NoteWidgetTest {
    private Context context;private JSONArray previous;private String previousUid;
    private final int widgetId=77123;
    @Before public void setup()throws Exception{context=ApplicationProvider.getApplicationContext();previous=NativeDiaryStore.records(context);previousUid=NativeDiaryStore.uid(context);}
    @After public void cleanup()throws Exception{NoteWidgetProvider.prefs(context).edit().remove("note_"+widgetId).remove("uid_"+widgetId).commit();NativeDiaryStore.snapshot(context,previousUid,previous);}
    private JSONObject note()throws Exception{return new JSONObject().put("id","widget-test-note").put("type","note").put("noteType","text").put("title","Widget chosen note").put("body","Visible home screen preview").put("source","Written here").put("tags",new JSONArray()).put("updatedAt",System.currentTimeMillis());}
    @Test public void selectedNoteRefreshesAndIsHiddenForAnotherAccount()throws Exception{
        JSONObject note=note();NativeDiaryStore.snapshot(context,"local",new JSONArray().put(note));NoteWidgetProvider.select(context,widgetId,note.getString("id"));assertEquals("Widget chosen note",NoteWidgetProvider.selected(context,widgetId).getString("title"));
        note.put("body","Updated note");NativeDiaryStore.snapshot(context,"local",new JSONArray().put(note));assertEquals("Updated note",NoteWidgetProvider.preview(NoteWidgetProvider.selected(context,widgetId)));
        NativeDiaryStore.snapshot(context,"other-account",new JSONArray().put(note));assertNull(NoteWidgetProvider.selected(context,widgetId));NativeDiaryStore.snapshot(context,"local",new JSONArray().put(note.put("deleted",true)));assertNull(NoteWidgetProvider.selected(context,widgetId));
    }
    private String js(androidx.test.core.app.ActivityScenario<MainActivity> screen,String script)throws Exception{
        java.util.concurrent.CountDownLatch ready=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript(script,value->{result.set(value);ready.countDown();}));ready.await(3,java.util.concurrent.TimeUnit.SECONDS);return result.get();
    }
    @Test public void tappingWidgetOpensItsChosenNoteDirectly()throws Exception{
        JSONObject note=note();String key="maikal-v2-local";
        androidx.test.core.app.ActivityScenario<MainActivity> screen=androidx.test.core.app.ActivityScenario.launch(MainActivity.class);
        try{
            for(int i=0;i<40&&!"true".equals(js(screen,"Boolean(document.querySelector('main'))"));i++)Thread.sleep(250);
            js(screen,"(()=>{const key='"+key+"';const cache=JSON.parse(localStorage.getItem(key)||'{\"records\":{},\"dirty\":{}}');cache.records['widget-test-note']="+note.toString()+";localStorage.setItem(key,JSON.stringify(cache));location.reload();return true;})()");
            for(int i=0;i<40;i++){Thread.sleep(250);if("true".equals(js(screen,"Boolean(document.querySelector('main'))")))break;}
            NativeDiaryStore.snapshot(context,"local",new JSONArray().put(note));NoteWidgetProvider.select(context,widgetId,note.getString("id"));
            screen.onActivity(activity->{try{android.view.View root=NoteWidgetProvider.views(activity,widgetId).apply(activity,new FrameLayout(activity));root.findViewById(R.id.widget_note_card).performClick();}catch(Exception e){throw new RuntimeException(e);}});
            boolean opened=false;for(int i=0;i<40&&!opened;i++){Thread.sleep(250);opened="true".equals(js(screen,"document.querySelector('.notes-detail h2')?.textContent==='Widget chosen note'"));}
            assertTrue("Widget tap must open the selected note, not just the notes list",opened);
            js(screen,"(()=>{const key='"+key+"';const cache=JSON.parse(localStorage.getItem(key));delete cache.records['widget-test-note'];delete cache.dirty['widget-test-note'];localStorage.setItem(key,JSON.stringify(cache));return true;})()");
        }finally{screen.onActivity(activity->activity.finishAndRemoveTask());}
    }
    @Test public void checklistsShowCompletionInThePreview()throws Exception{JSONObject note=note().put("noteType","checklist").put("items",new JSONArray().put(new JSONObject().put("text","Clean room").put("done",false)).put(new JSONObject().put("text","Read").put("done",true)));assertEquals("□ Clean room\n✓ Read",NoteWidgetProvider.preview(note));}
}
