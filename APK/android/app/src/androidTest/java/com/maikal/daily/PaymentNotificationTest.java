package com.maikal.daily;
import android.app.*;
import android.content.*;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.json.*;
import java.util.*;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class PaymentNotificationTest {
    String js(MainActivity screen,String code)throws Exception{
        java.util.concurrent.CountDownLatch done=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");
        InstrumentationRegistry.getInstrumentation().runOnMainSync(()->screen.getBridge().getWebView().evaluateJavascript(code,v->{result.set(v);done.countDown();}));assertTrue(done.await(6,java.util.concurrent.TimeUnit.SECONDS));return result.get();
    }
    void waitFor(MainActivity screen,String condition)throws Exception{for(int i=0;i<100;i++){if("true".equals(js(screen,condition)))return;Thread.sleep(100);}fail(condition);}
    @Test public void optInAllowlistDedupAndReviewDraft()throws Exception{
        Context c=ApplicationProvider.getApplicationContext();Instrumentation i=InstrumentationRegistry.getInstrumentation();
        Map<String,?> previous=new HashMap<>(PaymentNotifications.prefs(c).getAll());
        try{
            PaymentNotifications.prefs(c).edit().clear().commit();
            assertFalse(PaymentNotifications.selected(c,"test.bank"));
            PaymentNotifications.prefs(c).edit().putBoolean("enabled",true).putStringSet("apps",new HashSet<>(Arrays.asList("test.bank"))).commit();
            assertFalse(PaymentNotifications.selected(c,"test.other"));assertFalse(PaymentNotifications.selected(c,c.getPackageName()));
            String date=java.time.LocalDate.now().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yy"));
            String message="Acct XXXXX19110 Dr. INR 200.00 on "+date+"; UPI: 132158775153; Bal INR 7,956.29.Not you?SMS BLOCKUPI to 9901771222";
            assertFalse(PaymentNotifications.offer(c,"test.other","notification",message,System.currentTimeMillis()));
            assertTrue(PaymentNotifications.offer(c,"test.bank","notification",message,System.currentTimeMillis()));
            assertFalse(PaymentNotifications.offer(c,"test.bank","notification",message,System.currentTimeMillis()));
            JSONObject all=new JSONObject(PaymentNotifications.prefs(c).getString("drafts","{}"));assertEquals(1,all.length());String id=all.keys().next();
            String stored=all.toString();assertFalse(stored.contains("19110"));assertFalse(stored.contains("7,956"));assertFalse(stored.contains("132158775153"));
            NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);android.service.notification.StatusBarNotification suggestion=null;
            for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if(id.equals(n.getTag()))suggestion=n;
            assertNotNull(suggestion);assertEquals(9401,suggestion.getId());
            assertTrue(suggestion.getNotification().extras.getCharSequence(Notification.EXTRA_TITLE).toString().contains("200"));
            Instrumentation.ActivityMonitor monitor=i.addMonitor(MainActivity.class.getName(),null,false);
            suggestion.getNotification().contentIntent.send();
            MainActivity screen=(MainActivity)i.waitForMonitorWithTimeout(monitor,8000);assertNotNull("Notification opens Maikal",screen);
            try {
                waitFor(screen,"Boolean(document.querySelector('dialog[open] input[name=amount]'))");
                assertEquals("true",js(screen,"document.querySelector('input[name=amount]').value==='200.00' && document.querySelector('input[name=date]').value==='"+java.time.LocalDate.now()+"'"));
                assertEquals("true",js(screen,"document.querySelector('dialog select').value==='expense' && [...document.querySelectorAll('dialog select')].find(e=>e.required).value===''"));
                assertEquals("true",js(screen,"!Object.values(JSON.parse(localStorage.getItem('maikal-v2-local')||'{}').records||{}).some(r=>r.type==='transaction' && r.amount===20000)"));
                waitFor(screen,"document.querySelector('.payment-review').textContent.includes('Nothing is saved')");
                i.waitForIdleSync();Thread.sleep(400);android.graphics.Bitmap image=i.getUiAutomation().takeScreenshot();try(java.io.FileOutputStream file=new java.io.FileOutputStream(new java.io.File(c.getCacheDir(),"payment-review.png"))){image.compress(android.graphics.Bitmap.CompressFormat.PNG,100,file);}image.recycle();
            } finally {i.runOnMainSync(screen::finishAndRemoveTask);i.removeMonitor(monitor);}
            assertNull(PaymentNotifications.draft(c,id));
            PaymentNotifications.disable(c);assertFalse(PaymentNotifications.selected(c,"test.bank"));
            assertEquals("{}",PaymentNotifications.prefs(c).getString("drafts","{}"));
        }finally{
            PaymentNotifications.disable(c);android.content.SharedPreferences.Editor e=PaymentNotifications.prefs(c).edit().clear();
            for(Map.Entry<String,?> entry:previous.entrySet()){Object v=entry.getValue();if(v instanceof String)e.putString(entry.getKey(),(String)v);else if(v instanceof Boolean)e.putBoolean(entry.getKey(),(Boolean)v);else if(v instanceof Set)e.putStringSet(entry.getKey(),(Set<String>)v);}e.commit();
        }
    }
}
