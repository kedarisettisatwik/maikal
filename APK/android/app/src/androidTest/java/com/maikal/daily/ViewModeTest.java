package com.maikal.daily;
import android.app.Activity;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class ViewModeTest {
    private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch ready=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,value->{result.set(value);ready.countDown();}));ready.await(3,java.util.concurrent.TimeUnit.SECONDS);return result.get();}
    private void waitFor(ActivityScenario<MainActivity> screen,String condition)throws Exception{for(int i=0;i<80;i++){if("true".equals(js(screen,condition)))return;Thread.sleep(100);}fail("Condition did not become true: "+condition);}
    private void menu(ActivityScenario<MainActivity> screen)throws Exception{js(screen,"document.querySelector('[aria-label=\"Open menu\"]').click()");}
    private void toggle(ActivityScenario<MainActivity> screen)throws Exception{menu(screen);js(screen,"[...document.querySelectorAll('nav button')].find(b=>b.textContent.startsWith('Change view')).click()");}
    @Test public void responsiveDefaultDesktopPersistenceAndNativeFormRestoration()throws Exception{
        ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String previous=null;
        try{
            waitFor(screen,"Boolean(document.querySelector('main.sheet'))");previous=js(screen,"localStorage.getItem('maikal-view-mode')");
            js(screen,"localStorage.removeItem('maikal-view-mode');window.__viewReload=1;location.reload();true");waitFor(screen,"typeof window.__viewReload==='undefined' && Boolean(document.querySelector('main.sheet')) && document.documentElement.dataset.maikalView==='normal' && window.innerWidth<600");
            toggle(screen);waitFor(screen,"document.documentElement.dataset.maikalView==='desktop' && window.innerWidth>=1200 && localStorage.getItem('maikal-view-mode')==='desktop'");
            menu(screen);js(screen,"window.__viewReload=1;[...document.querySelectorAll('nav button')].find(b=>b.textContent==='Refresh').click()");waitFor(screen,"typeof window.__viewReload==='undefined' && Boolean(document.querySelector('main.sheet')) && document.documentElement.dataset.maikalView==='desktop' && window.innerWidth>=1200");
            menu(screen);js(screen,"[...document.querySelectorAll('nav button')].find(b=>b.textContent==='Add goal').click()");waitFor(screen,"Boolean(document.querySelector('dialog[open].native-form-page')) && document.documentElement.hasAttribute('data-maikal-dialog') && window.innerWidth<600");
            js(screen,"document.querySelector('[aria-label=\"Back to diary\"]').click()");waitFor(screen,"!document.querySelector('dialog[open]') && !document.documentElement.hasAttribute('data-maikal-dialog') && window.innerWidth>=1200");
            toggle(screen);waitFor(screen,"document.documentElement.dataset.maikalView==='normal' && window.innerWidth<600 && localStorage.getItem('maikal-view-mode')==='normal'");
        }finally{if(previous!=null){if("null".equals(previous))js(screen,"localStorage.removeItem('maikal-view-mode')");else js(screen,"localStorage.setItem('maikal-view-mode',"+previous+")");}screen.onActivity(Activity::finishAndRemoveTask);}
    }
}
