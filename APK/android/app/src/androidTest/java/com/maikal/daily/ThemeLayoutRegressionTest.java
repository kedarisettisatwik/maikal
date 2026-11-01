package com.maikal.daily;
import android.app.Activity;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class ThemeLayoutRegressionTest {
 private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch done=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,v->{value.set(v);done.countDown();}));assertTrue(done.await(5,java.util.concurrent.TimeUnit.SECONDS));return value.get();}
 private void waitFor(ActivityScenario<MainActivity> screen,String code)throws Exception{for(int i=0;i<120;i++){if("true".equals(js(screen,code)))return;Thread.sleep(100);}fail(code);}
 @Test public void cardsTagsAndAllDayCheckboxMatchBothThemes()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String previous=null;
  try{waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");previous=js(screen,"localStorage.getItem('mantra-theme')");
   for(String theme:new String[]{"dark","light"}){
    js(screen,"document.querySelector('[role=tab][aria-label=More]').click()");
    js(screen,"(()=>{const s=document.querySelector('.mobile-more select[aria-label=Theme]');Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(s,'"+theme+"');s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
    waitFor(screen,"document.documentElement.dataset.theme==='"+theme+"'");
    assertEquals("true",js(screen,"[...document.querySelectorAll('.stats>.stat')].length===3&&[...document.querySelectorAll('.stats>.stat')].every(e=>getComputedStyle(e).backgroundColor==='rgba(0, 0, 0, 0)')"));
    if("dark".equals(theme)){
     assertEquals("true",js(screen,"getComputedStyle(document.querySelector('.mobile-screen-time')).backgroundColor==='rgb(32, 49, 43)'"));
     assertEquals("true",js(screen,"(()=>{const tag=document.querySelector('.notes-mobile-tags button[aria-pressed=true]');const style=getComputedStyle(tag);return style.backgroundColor==='rgb(60, 93, 72)'&&style.color==='rgb(239, 250, 242)';})()"));
    }
    for(String kind:new String[]{"meeting","reminder"}){
     js(screen,"[...document.querySelectorAll('.mobile-more button')].find(b=>b.querySelector('strong')?.textContent==='Add "+kind+"').click()");
     waitFor(screen,"Boolean(document.querySelector('dialog[open] .all-day-field input'))");
     assertEquals("true",js(screen,"(()=>{const input=document.querySelector('dialog[open] .all-day-field input');const label=input.parentElement,r=input.getBoundingClientRect();return r.width===18&&r.height===18&&getComputedStyle(label).display==='flex'&&label.getBoundingClientRect().height<=60;})()"));
     js(screen,"document.querySelector('dialog[open] button[aria-label=\"Back to diary\"]').click()");
     waitFor(screen,"!document.querySelector('dialog[open]')");
    }
   }
  }finally{if(previous!=null)js(screen,"(()=>{const value="+previous+";if(value===null)localStorage.removeItem('mantra-theme');else localStorage.setItem('mantra-theme',value);return true;})()");screen.onActivity(Activity::finishAndRemoveTask);}
 }
}
