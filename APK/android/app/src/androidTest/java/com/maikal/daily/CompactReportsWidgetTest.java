package com.maikal.daily;

import android.app.Activity;
import android.content.Context;
import android.graphics.*;
import android.view.View;
import android.widget.FrameLayout;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class CompactReportsWidgetTest {
    private final Context context=ApplicationProvider.getApplicationContext();
    private Bitmap render(int width,int height){java.util.concurrent.atomic.AtomicReference<Bitmap> result=new java.util.concurrent.atomic.AtomicReference<>();InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{View root=TransactionWidgetProvider.views(context).apply(context,new FrameLayout(context));root.measure(View.MeasureSpec.makeMeasureSpec(width,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(height,View.MeasureSpec.EXACTLY));root.layout(0,0,width,height);Bitmap bitmap=Bitmap.createBitmap(width,height,Bitmap.Config.ARGB_8888);root.draw(new Canvas(bitmap));result.set(bitmap);});return result.get();}
    private Rect visibleBounds(Bitmap bitmap){int left=bitmap.getWidth(),top=bitmap.getHeight(),right=0,bottom=0;for(int y=0;y<bitmap.getHeight();y++)for(int x=0;x<bitmap.getWidth();x++)if(Color.alpha(bitmap.getPixel(x,y))>30){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}return new Rect(left,top,right+1,bottom+1);}
    @Test public void greenCircleHasTransparentMarginsAndCenteredWhitePlus()throws Exception{Bitmap image=render(200,200);try{Rect visible=visibleBounds(image);assertEquals(140,visible.width(),2);assertEquals(140,visible.height(),2);assertEquals(0,Color.alpha(image.getPixel(0,0)));assertEquals(0,Color.alpha(image.getPixel(199,199)));assertEquals(Color.WHITE,image.getPixel(100,100));assertEquals(Color.rgb(0,139,71),image.getPixel(45,100));try(java.io.FileOutputStream out=new java.io.FileOutputStream(new java.io.File(context.getExternalFilesDir(null),"transaction-circle.png"))){image.compress(Bitmap.CompressFormat.PNG,100,out);}}finally{image.recycle();}}
    @Test public void resizedWidgetKeepsCircleRoundAndRemainingAreaTransparent(){Bitmap image=render(320,180);try{Rect visible=visibleBounds(image);assertEquals(126,visible.width(),2);assertEquals(126,visible.height(),2);assertEquals(visible.width(),visible.height(),1);assertEquals(0,Color.alpha(image.getPixel(10,90)));assertEquals(0,Color.alpha(image.getPixel(310,90)));}finally{image.recycle();}}
    private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch latch=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,value->{result.set(value);latch.countDown();}));latch.await(3,java.util.concurrent.TimeUnit.SECONDS);return result.get();}
    private void waitFor(ActivityScenario<MainActivity> screen,String condition)throws Exception{for(int i=0;i<90;i++){if("true".equals(js(screen,condition)))return;Thread.sleep(100);}fail("Condition did not become true: "+condition);}
    @Test public void circleWidgetStillOpensTheTransactionForm()throws Exception{ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);try{waitFor(screen,"Boolean(document.querySelector('main.sheet'))");screen.onActivity(a->{View widget=TransactionWidgetProvider.views(a).apply(a,new FrameLayout(a));widget.findViewById(R.id.widget_add_transaction).performClick();});waitFor(screen,"Boolean(document.querySelector('dialog[open] input[name=amount]'))");}finally{screen.onActivity(Activity::finishAndRemoveTask);}}
    @Test public void calendarAndTrackerAre300pxAndFitSixRowsWithoutScrolling()throws Exception{
        ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);String previous=null;
        try{
            waitFor(screen,"Boolean(document.querySelector('main.sheet'))");previous=js(screen,"localStorage.getItem('maikal-v2-local')");
            js(screen,"(()=>{const key='maikal-v2-local';const cache=JSON.parse(localStorage.getItem(key)||'{\"records\":{},\"dirty\":{}}');cache.records['report-layout-room']={id:'report-layout-room',type:'goal',title:'Report layout room',goalType:'checklist',schedule:{type:'days',days:[5]},updatedAt:1};cache.records['report-layout-push']={id:'report-layout-push',type:'goal',title:'Report layout pushups',goalType:'tracker',schedule:{type:'everyday'},updatedAt:1};localStorage.setItem(key,JSON.stringify(cache));window.__reportReload=1;location.reload();return true;})()");
            waitFor(screen,"typeof window.__reportReload==='undefined' && Boolean(document.querySelector('main.sheet'))");js(screen,"document.querySelector('.reports-toggle').click()");waitFor(screen,"Boolean(document.querySelector('.report-month input'))");
            js(screen,"(()=>{const input=document.querySelector('.report-month input');Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,'2026-11');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()");
            waitFor(screen,"Boolean(document.querySelector('[aria-label=\"2026-11-30: Not applicable\"]'))");
            String check="(()=>{const card=[...document.querySelectorAll('.goal-report')].find(c=>c.querySelector('h3')?.textContent==='TITLE');if(!card)return false;const r=card.getBoundingClientRect();return Math.abs(r.width-300)<1&&Math.abs(r.height-300)<1&&card.scrollWidth<=card.clientWidth&&card.scrollHeight<=card.clientHeight;})()";
            assertEquals("true",js(screen,check.replace("TITLE","Report layout room")));assertEquals("true",js(screen,check.replace("TITLE","Report layout pushups")));
            assertEquals("true",js(screen,"(()=>{const card=[...document.querySelectorAll('.goal-report')].find(c=>c.querySelector('h3')?.textContent==='Report layout pushups');return card.querySelectorAll('.tracker-report-bar').length===30&&!card.querySelector('.tracker-chart-scroll');})()"));
        }finally{if(previous!=null){if("null".equals(previous))js(screen,"localStorage.removeItem('maikal-v2-local')");else js(screen,"localStorage.setItem('maikal-v2-local',"+previous+")");}screen.onActivity(Activity::finishAndRemoveTask);}
    }
}
