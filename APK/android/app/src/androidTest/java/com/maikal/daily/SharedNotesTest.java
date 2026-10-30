package com.maikal.daily;
import android.content.*;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.*;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class SharedNotesTest {
    @Test public void coldShareOpensTheNoteCapturePage()throws Exception{
        Intent intent=new Intent(context,MainActivity.class).setAction(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,"https://www.instagram.com/reel/shared-test/").addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        try(androidx.test.core.app.ActivityScenario<MainActivity> screen=androidx.test.core.app.ActivityScenario.launch(intent)){
            boolean opened=false;for(int i=0;i<40&&!opened;i++){
                java.util.concurrent.CountDownLatch latch=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> result=new java.util.concurrent.atomic.AtomicReference<>("");
                screen.onActivity(activity->activity.getBridge().getWebView().evaluateJavascript("Boolean(document.querySelector('[data-notes-page]') && document.querySelector('.notes-editor'))",value->{result.set(value);latch.countDown();}));
                latch.await(2,java.util.concurrent.TimeUnit.SECONDS);opened="true".equals(result.get());if(!opened)Thread.sleep(250);
            }
            assertTrue("A shared link must open the capture form even from a closed app",opened);
            assertNotNull("Draft stays durable until saved or discarded",SharedNotes.pending(context));
        }
    }
    private Context context;
    @Before public void setup(){context=ApplicationProvider.getApplicationContext();context.getSharedPreferences("maikal_shared_notes_v1",0).edit().clear().commit();}
    @After public void cleanup(){context.getSharedPreferences("maikal_shared_notes_v1",0).edit().clear().commit();}
    @Test public void shareInboxPersistsAndDoesNotDuplicateAfterAcknowledgment()throws Exception{
        Intent share=new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,"Watch https://www.instagram.com/reel/test/").putExtra(Intent.EXTRA_SUBJECT,"A reel");
        SharedNotes.capture(context,share);String id=SharedNotes.pending(context).getString("id");assertEquals("A reel",SharedNotes.pending(context).getString("title"));SharedNotes.capture(context,share);SharedNotes.acknowledge(context,id);assertNull(SharedNotes.pending(context));SharedNotes.capture(context,share);assertNull(SharedNotes.pending(context));
    }
    @Test public void receivesMultipleSharesInOrderAndRejectsUnsupportedContent()throws Exception{
        SharedNotes.capture(context,new Intent(Intent.ACTION_SEND).setType("image/png").putExtra(Intent.EXTRA_TEXT,"not supported"));assertNull(SharedNotes.pending(context));
        SharedNotes.capture(context,new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,"first"));SharedNotes.capture(context,new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT,"second"));assertEquals("first",SharedNotes.pending(context).getString("text"));SharedNotes.acknowledge(context,SharedNotes.pending(context).getString("id"));assertEquals("second",SharedNotes.pending(context).getString("text"));
    }
    @Test public void apkIsRegisteredAsATextShareTarget(){Intent share=new Intent(Intent.ACTION_SEND).setType("text/plain").setPackage(context.getPackageName());assertFalse(context.getPackageManager().queryIntentActivities(share,android.content.pm.PackageManager.MATCH_DEFAULT_ONLY).isEmpty());assertEquals("Maikal",context.getApplicationInfo().loadLabel(context.getPackageManager()).toString());}
}
