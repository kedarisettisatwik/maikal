package com.maikal.daily;
import android.app.*;
import android.content.*;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class TotalScreenTimeWidgetTest {
    @Test public void compactWidgetContainsOnlyTotalAndOpensTrack() throws Exception {
        Context c=ApplicationProvider.getApplicationContext();Instrumentation i=InstrumentationRegistry.getInstrumentation();
        Instrumentation.ActivityMonitor monitor=i.addMonitor(TrackActivity.class.getName(),null,false);
        try {
            i.runOnMainSync(()->{
                View root=TotalScreenTimeWidgetProvider.views(c).apply(c,new FrameLayout(c));
                assertNotNull(root.findViewById(R.id.widget_total_value));
                assertNull(root.findViewById(R.id.widget_track_apps));
                assertEquals(2,((ViewGroup)root).getChildCount());
                root.findViewById(R.id.widget_total_card).performClick();
            });
            Activity opened=i.waitForMonitorWithTimeout(monitor,5000);assertNotNull(opened);
            i.runOnMainSync(opened::finish);
        } finally {i.removeMonitor(monitor);}
    }
}
