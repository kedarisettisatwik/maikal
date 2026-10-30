package com.maikal.daily;
import android.app.*;
import android.content.*;
import android.os.ParcelFileDescriptor;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class TrackTest {
    private Context c;private Instrumentation instrumentation;
    @Before public void setup(){c=ApplicationProvider.getApplicationContext();instrumentation=InstrumentationRegistry.getInstrumentation();}
    private void access(boolean on)throws Exception{try(ParcelFileDescriptor descriptor=instrumentation.getUiAutomation().executeShellCommand("appops set "+c.getPackageName()+" GET_USAGE_STATS "+(on?"allow":"deny"));java.io.FileInputStream input=new java.io.FileInputStream(descriptor.getFileDescriptor())){while(input.read()!=-1){}}Thread.sleep(150);}
    @After public void cleanup()throws Exception{access(false);}
    private TextView find(View v,String text){if(v instanceof TextView&&((TextView)v).getText().toString().equals(text))return (TextView)v;if(v instanceof ViewGroup){ViewGroup group=(ViewGroup)v;for(int i=0;i<group.getChildCount();i++){TextView found=find(group.getChildAt(i),text);if(found!=null)return found;}}return null;}
    private boolean waitFor(ActivityScenario<TrackActivity> scenario,String text)throws Exception{for(int i=0;i<50;i++){java.util.concurrent.atomic.AtomicBoolean found=new java.util.concurrent.atomic.AtomicBoolean();scenario.onActivity(a->found.set(find(a.getWindow().getDecorView(),text)!=null));if(found.get())return true;Thread.sleep(100);}return false;}
    private void screenshot(String name)throws Exception{android.graphics.Bitmap image=instrumentation.getUiAutomation().takeScreenshot();try(java.io.FileOutputStream file=new java.io.FileOutputStream(new java.io.File(c.getExternalFilesDir(null),name))){image.compress(android.graphics.Bitmap.CompressFormat.PNG,100,file);}image.recycle();}
    private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch ready=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,value->{result.set(value);ready.countDown();}));ready.await(3,java.util.concurrent.TimeUnit.SECONDS);return result.get();}
    @Test public void menuOpensTrackAndNativeDailyTotalReachesHomepageCache()throws Exception{
        access(true);ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);
        try{boolean summary=false;for(int i=0;i<70&&!summary;i++){Thread.sleep(200);summary="true".equals(js(screen,"Boolean(document.querySelector('.screen-time-value')) && Object.values(JSON.parse(localStorage.getItem('maikal-v2-local')||'{}').records||{}).some(r=>r.type==='screentime')"));}assertTrue("Native bridge must populate the homepage and durable diary",summary);
            Instrumentation.ActivityMonitor monitor=instrumentation.addMonitor(TrackActivity.class.getName(),null,false);
            try{js(screen,"document.querySelector('[aria-label=\"Open menu\"]').click()");js(screen,"[...document.querySelectorAll('nav button')].find(b=>b.textContent==='Track').click()");Activity activity=instrumentation.waitForMonitorWithTimeout(monitor,5000);assertNotNull("APK menu opens native Track",activity);Thread.sleep(700);screenshot("track-screen.png");instrumentation.runOnMainSync(activity::finish);}finally{instrumentation.removeMonitor(monitor);}
            instrumentation.runOnMainSync(()->{View view=TrackWidgetProvider.views(c).apply(c,new FrameLayout(c));view.measure(View.MeasureSpec.makeMeasureSpec(720,View.MeasureSpec.EXACTLY),View.MeasureSpec.makeMeasureSpec(600,View.MeasureSpec.EXACTLY));view.layout(0,0,720,600);android.graphics.Bitmap bitmap=android.graphics.Bitmap.createBitmap(720,600,android.graphics.Bitmap.Config.ARGB_8888);view.draw(new android.graphics.Canvas(bitmap));try(java.io.FileOutputStream out=new java.io.FileOutputStream(new java.io.File(c.getExternalFilesDir(null),"track-widget.png"))){bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG,100,out);}catch(Exception e){throw new RuntimeException(e);}bitmap.recycle();});
        }finally{screen.onActivity(Activity::finishAndRemoveTask);}
    }
    @Test public void permissionIsExplainedAndRevocationHidesTotals()throws Exception{
        access(false);assertFalse(ScreenTime.allowed(c));assertFalse(ScreenTime.dailyTotals(c).getBoolean("allowed"));
        try(ActivityScenario<TrackActivity> screen=ActivityScenario.launch(TrackActivity.class)){assertTrue(waitFor(screen,"Open usage access settings"));access(true);screen.onActivity(TrackActivity::load);assertTrue(waitFor(screen,"Total screen time"));screen.onActivity(a->find(a.getWindow().getDecorView(),"7 days").performClick());assertTrue(waitFor(screen,"Screen time over 7 days"));access(false);screen.onActivity(TrackActivity::load);assertTrue(waitFor(screen,"Open usage access settings"));}
    }
    @Test public void dailyBridgeContainsOnlyTotalsAndStableDeviceIdentity()throws Exception{
        access(true);org.json.JSONObject summary=ScreenTime.dailyTotals(c);assertTrue(summary.getBoolean("allowed"));assertEquals(ScreenTime.deviceId(c),summary.getString("deviceId"));assertFalse(summary.has("apps"));org.json.JSONArray days=summary.getJSONArray("days");assertTrue(days.length()>0);for(int i=0;i<days.length();i++){org.json.JSONObject day=days.getJSONObject(i);assertEquals(3,day.length());assertTrue(day.getLong("totalMs")>=0);assertFalse(day.has("packageName"));}
    }
    @Test public void widgetOpensTrackAndDisplaysPermissionState()throws Exception{
        access(false);Instrumentation.ActivityMonitor monitor=instrumentation.addMonitor(TrackActivity.class.getName(),null,false);
        try{instrumentation.runOnMainSync(()->{View root=TrackWidgetProvider.views(c).apply(c,new FrameLayout(c));assertNotNull(find(root,"Set up screen time"));root.findViewById(R.id.widget_track_card).performClick();});Activity activity=instrumentation.waitForMonitorWithTimeout(monitor,5000);assertNotNull("Widget should open Track",activity);instrumentation.runOnMainSync(()->{assertNotNull(find(activity.getWindow().getDecorView(),"Open usage access settings"));activity.finish();});}finally{instrumentation.removeMonitor(monitor);}
    }
}
