package com.maikal.daily;
import android.app.Activity;
import android.content.Context;
import android.view.MotionEvent;
import android.view.InputDevice;
import android.view.accessibility.AccessibilityNodeInfo;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.time.LocalDate;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PhotoScoreEditorTest {
 final Context c=ApplicationProvider.getApplicationContext();
 private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch done=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,v->{value.set(v);done.countDown();}));assertTrue(done.await(25,java.util.concurrent.TimeUnit.SECONDS));return value.get();}
 private void waitFor(ActivityScenario<MainActivity> s,String code)throws Exception{for(int i=0;i<200;i++){if("true".equals(js(s,code)))return;Thread.sleep(100);}fail(code+" UI="+js(s,"document.querySelector('.score-page')?.innerText"));}
 private void change(ActivityScenario<MainActivity> s,String label,String value)throws Exception{js(s,"window.changeScoreControl("+JSONObject.quote(label)+","+JSONObject.quote(value)+");true");Thread.sleep(100);}
 private void click(ActivityScenario<MainActivity> s,String label)throws Exception{js(s,"[...document.querySelectorAll('.score-page button')].find(b=>b.textContent==="+JSONObject.quote(label)+").click();true");Thread.sleep(100);}
 private void touch(long start,int action,float x,float y){MotionEvent event=MotionEvent.obtain(start,android.os.SystemClock.uptimeMillis(),action,x,y,0);event.setSource(InputDevice.SOURCE_TOUCHSCREEN);assertTrue(InstrumentationRegistry.getInstrumentation().getUiAutomation().injectInputEvent(event,true));event.recycle();}
 private void drag(ActivityScenario<MainActivity> s)throws Exception{
  js(s,"document.querySelector('.score-canvas-stage').scrollIntoView({block:'center',behavior:'instant'});true");Thread.sleep(350);String json=js(s,"(()=>{const r=document.querySelector('.score-selection').getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2,devicePixelRatio]})()");JSONArray p=new JSONArray(json);int[] origin=new int[2];s.onActivity(a->a.getBridge().getWebView().getLocationOnScreen(origin));float x=origin[0]+(float)(p.getDouble(0)*p.getDouble(2)),y=origin[1]+(float)(p.getDouble(1)*p.getDouble(2));long start=android.os.SystemClock.uptimeMillis();touch(start,MotionEvent.ACTION_DOWN,x,y);Thread.sleep(100);for(int n=1;n<=12;n++){touch(start,MotionEvent.ACTION_MOVE,x+n*5,y+n*5);Thread.sleep(20);}touch(start,MotionEvent.ACTION_UP,x+60,y+60);Thread.sleep(200);
 }
 private boolean clickNative(AccessibilityNodeInfo node,String text){if(node==null)return false;CharSequence t=node.getText();if(t!=null&&text.equalsIgnoreCase(t.toString())&&node.isEnabled()){AccessibilityNodeInfo button=node;for(int i=0;i<3&&!button.isClickable()&&button.getParent()!=null;i++)button=button.getParent();if(button.isClickable())return button.performAction(AccessibilityNodeInfo.ACTION_CLICK);}for(int i=0;i<node.getChildCount();i++)if(clickNative(node.getChild(i),text))return true;return false;}
 private JSONObject progress(String id,String date,Object value)throws Exception{return new JSONObject().put("id","progress_"+id+"_"+date).put("type","progress").put("goalId",id).put("date",date).put("value",value).put("updatedAt",1);}
 private void aria(ActivityScenario<MainActivity> s,String label)throws Exception{js(s,"document.querySelector('.score-page [aria-label='+CSS.escape("+JSONObject.quote(label)+")+']').click();true");Thread.sleep(150);}
 @Test public void offlineFontsEffectsGesturesAndNativeExports()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String original=null;
  try{
   waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");original=js(screen,"localStorage.getItem('maikal-v2-local')");String yesterday=LocalDate.now().minusDays(1).toString();JSONObject goal=new JSONObject().put("id","pushups").put("type","goal").put("title","Pushups").put("createdDate",yesterday).put("schedule",new JSONObject().put("type","everyday")).put("goalType","tracker").put("target",20).put("targetRule","atLeast").put("updatedAt",1);JSONObject p=progress("pushups",yesterday,20);String seed=new JSONObject().put("records",new JSONObject().put("pushups",goal).put(p.getString("id"),p)).put("dirty",new JSONObject()).toString();
   js(screen,"localStorage.setItem('maikal-v2-local',"+JSONObject.quote(seed)+");location.reload();true");waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");waitFor(screen,"Boolean(JSON.parse(localStorage.getItem('maikal-v2-local')).records['score_"+yesterday+"'])");js(screen,"document.querySelector('[role=tab][aria-label=More]').click();true");Thread.sleep(800);js(screen,"[...document.querySelectorAll('.mobile-more button')].find(b=>b.textContent.includes('Yesterday')).click();true");waitFor(screen,"Boolean(document.querySelector('.score-photo-choice'))");
   // A deterministic test fixture exercises the real browser image decoding path offline.
   js(screen,"(()=>{const c=document.createElement('canvas');c.width=800;c.height=1200;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,800,1200);g.addColorStop(0,'#d2a46a');g.addColorStop(1,'#21483d');x.fillStyle=g;x.fillRect(0,0,800,1200);c.toBlob(blob=>{const dt=new DataTransfer();dt.items.add(new File([blob],'fixture.png',{type:'image/png'}));const input=document.querySelector('.score-page input[type=file]');input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));});})();true");
   waitFor(screen,"Boolean(document.querySelector('[data-score-canvas]'))&&Boolean([...document.querySelectorAll('.score-page button')].find(b=>b.textContent==='Remove photo'))");
   assertEquals("true",js(screen,"document.querySelector('dialog.score-editor-shell').getBoundingClientRect().height>innerHeight-2"));
   js(screen,"window.changeScoreControl=(label,value)=>{const el=document.querySelector('.score-page [aria-label='+CSS.escape(label)+']');if(!el)throw Error(label);Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));};true");
   aria(screen,"Scores tool");aria(screen,"Style Yesterday’s score");waitFor(screen,"Boolean(document.querySelector('.score-selection'))");assertEquals("\"score\"",js(screen,"document.querySelector('[data-score-canvas]').dataset.selected"));aria(screen,"Use Caveat");waitFor(screen,"document.fonts.check('600 40px \"MANTRA Caveat\"')&&!document.querySelector('[aria-label=\"Download score card\"]').disabled");
   android.content.ContentValues screenshot=new android.content.ContentValues();screenshot.put(android.provider.MediaStore.Images.Media.DISPLAY_NAME,"MANTRA-editor-test-"+c.getPackageName()+".png");screenshot.put(android.provider.MediaStore.Images.Media.MIME_TYPE,"image/png");screenshot.put(android.provider.MediaStore.Images.Media.RELATIVE_PATH,"Pictures");android.net.Uri shot=c.getContentResolver().insert(android.provider.MediaStore.Images.Media.EXTERNAL_CONTENT_URI,screenshot);try(java.io.OutputStream out=c.getContentResolver().openOutputStream(shot)){InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot().compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}
   double before=Double.parseDouble(js(screen,"parseFloat(document.querySelector('.score-selection').style.top)"));drag(screen);double after=Double.parseDouble(js(screen,"parseFloat(document.querySelector('.score-selection').style.top)"));assertTrue("Text did not move",after>before);
   aria(screen,"Undo");aria(screen,"Redo");aria(screen,"Goals tool");aria(screen,"Show Pushups");aria(screen,"Mask tool");for(String mask:new String[]{"Rounded","Oval","Circle","Full frame"})click(screen,mask);
   aria(screen,"Gradient tool");click(screen,"Emerald");change(screen,"Gradient strength","64");aria(screen,"Adjust tool");change(screen,"Brightness","104");change(screen,"Contrast","110");aria(screen,"Filters tool");click(screen,"Vintage");aria(screen,"Photo tool");aria(screen,"Rotate photo right");aria(screen,"Flip photo horizontally");aria(screen,"Preview image");assertEquals("true",js(screen,"!document.querySelector('.score-editor-dock')"));aria(screen,"Show editing tools");
   // Save both real encoder outputs through the Android system picker.
   for(String format:new String[]{"PNG","JPEG"}){
    aria(screen,"Download score card");click(screen,format);js(screen,"window.scoreExportResult=null;window.addEventListener('unhandledrejection',e=>window.scoreExportResult=String(e.reason),{once:true});true");click(screen,"Save image");boolean saved=false;for(int i=0;i<100&&!saved;i++){saved=clickNative(InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow(),"Save");if(!saved)Thread.sleep(200);}assertTrue("Native save document screen missing for "+format,saved);Thread.sleep(500);clickNative(InstrumentationRegistry.getInstrumentation().getUiAutomation().getRootInActiveWindow(),"Replace");waitFor(screen,"!document.querySelector('.editor-error')&&Boolean([...document.querySelectorAll('.score-page button')].find(b=>b.textContent.includes('Save image')&&!b.disabled))");
   }
   assertEquals("true",js(screen,"document.querySelector('[data-score-canvas]').toDataURL('image/jpeg').startsWith('data:image/jpeg;base64,')"));
  }finally{if(original!=null)js(screen,"localStorage."+("null".equals(original)?"removeItem('maikal-v2-local')":"setItem('maikal-v2-local',"+original+")")+";true");screen.onActivity(Activity::finishAndRemoveTask);}
 }
}
