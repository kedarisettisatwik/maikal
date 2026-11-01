package com.maikal.daily;
import android.app.Activity;
import android.content.Context;
import android.widget.*;
import android.view.View;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class MantraThemeTest {
 private final Context context=ApplicationProvider.getApplicationContext();
 @Test public void widgetsFollowExplicitLightDarkAndSystemPreference()throws Exception{
  String previous=MantraTheme.choice(context);
  try{for(String theme:new String[]{"light","dark"}){MantraTheme.save(context,theme);boolean dark="dark".equals(theme);assertEquals(dark,MantraTheme.dark(context));
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{
    View note=NoteWidgetProvider.views(context,999999).apply(context,new FrameLayout(context));assertEquals(dark?0xffe9e7df:0xff253439,((TextView)note.findViewById(R.id.widget_note_title)).getCurrentTextColor());
    View track=TrackWidgetProvider.views(context).apply(context,new FrameLayout(context));assertEquals(dark?0xff9ccde8:0xff285d79,((TextView)track.findViewById(R.id.widget_track_total)).getCurrentTextColor());
    View money=MoneySummaryWidgetProvider.views(context).apply(context,new FrameLayout(context));assertEquals(dark?0xff9ccde8:0xff285d79,((TextView)money.findViewById(R.id.widget_month_saving)).getCurrentTextColor());
   }catch(Exception e){throw new RuntimeException(e);}});
  }MantraTheme.save(context,"system");assertEquals((context.getResources().getConfiguration().uiMode&48)==32,MantraTheme.dark(context));
  assertEquals("MANTRA",context.getApplicationInfo().loadLabel(context.getPackageManager()).toString());
  }finally{MantraTheme.save(context,previous);}
 }
 @Test public void nativeAlarmScreenUsesDarkBackground()throws Exception{
  String previous=MantraTheme.choice(context);MantraTheme.save(context,"dark");
  try(ActivityScenario<AlarmsActivity> screen=ActivityScenario.launch(AlarmsActivity.class)){screen.onActivity(a->{android.view.ViewGroup content=a.findViewById(android.R.id.content);android.graphics.drawable.ColorDrawable background=(android.graphics.drawable.ColorDrawable)content.getChildAt(0).getBackground();assertEquals(0xff182126,background.getColor());});}finally{MantraTheme.save(context,previous);}
 }
 private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch latch=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,v->{result.set(v);latch.countDown();}));latch.await(3,java.util.concurrent.TimeUnit.SECONDS);return result.get();}
 private void waitFor(ActivityScenario<MainActivity> screen,String code)throws Exception{for(int i=0;i<150;i++){if("true".equals(js(screen,code)))return;Thread.sleep(100);}fail(code);}
 @Test public void moreShowsVersionThemeAndAppGuide()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String previous=null;
  try{waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");previous=js(screen,"localStorage.getItem('mantra-theme')");js(screen,"document.querySelector('[role=tab][aria-label=More]').click()");
   waitFor(screen,"document.querySelector('.mobile-more').textContent.includes('Version 2.4.0')");assertEquals("true",js(screen,"document.querySelector('.brand').textContent.includes('MANTRA')"));
   js(screen,"(()=>{const s=document.querySelector('.mobile-more select[aria-label=Theme]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'dark');s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");waitFor(screen,"document.documentElement.dataset.theme==='dark'");
   for(int i=0;i<40&&!"dark".equals(MantraTheme.choice(context));i++)Thread.sleep(100);assertEquals("dark",MantraTheme.choice(context));
   waitFor(screen,"getComputedStyle(document.querySelector('.phone')).backgroundColor==='rgb(24, 33, 38)'");Thread.sleep(2000);
   android.graphics.Bitmap shot=InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();if(shot!=null){try(java.io.FileOutputStream out=new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"mantra-dark-more.png"))){shot.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}shot.recycle();}
   js(screen,"[...document.querySelectorAll('.mobile-more button')].find(b=>b.textContent.includes('Know more about app')).click()");waitFor(screen,"Boolean(document.querySelector('dialog[open] .app-info'))");
   assertEquals("true",js(screen,"document.querySelector('dialog[open]').textContent.includes('Home-screen widgets')"));assertEquals("true",js(screen,"!document.body.textContent.match(/sign\\s*up/i)"));
  }finally{if(previous!=null)js(screen,"(()=>{const v="+previous+";if(v===null)localStorage.removeItem('mantra-theme');else localStorage.setItem('mantra-theme',v);location.reload();return true;})()");MantraTheme.save(context,"system");screen.onActivity(Activity::finishAndRemoveTask);}
 }
}
