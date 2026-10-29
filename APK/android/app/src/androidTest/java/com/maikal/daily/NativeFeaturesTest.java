package com.maikal.daily;

import android.app.Notification;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.appwidget.AppWidgetHost;
import android.appwidget.AppWidgetHostView;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.service.notification.StatusBarNotification;
import android.widget.FrameLayout;
import android.widget.TextView;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.time.LocalDate;
import java.util.ArrayList;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class NativeFeaturesTest {
    private Context context;
    private JSONObject goal(String id, String type) throws Exception {
        return new JSONObject().put("id", id).put("type", "goal").put("title", "Read a chapter").put("goalType", type)
            .put("schedule", new JSONObject().put("type", "everyday")).put("times", new JSONArray().put("09:00"));
    }
    @Before public void setup() throws Exception {
        context = ApplicationProvider.getApplicationContext();
        DiaryAlarmReceiver.replace(context, new JSONArray());
        NativeDiaryStore.prefs(context).edit().clear().commit();
        NativeDiaryStore.snapshot(context, "local", new JSONArray());
    }
    @After public void cleanup() throws Exception {
        DiaryAlarmReceiver.replace(context, new JSONArray());
        ((NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE)).cancelAll();
        NativeDiaryStore.prefs(context).edit().clear().commit();
    }
    @Test public void greetingsHaveExactlyTheRequestedClockTimes() throws Exception {
        JSONArray entries = GreetingReminders.entries();
        assertEquals(8, entries.length());
        String[] times = {"06:30", "10:00", "11:00", "12:00", "16:00", "18:00", "21:00", "01:00"};
        for (int i = 0; i < times.length; i++) assertEquals(times[i], entries.getJSONObject(i).getJSONArray("times").getString(0));
    }
    @Test public void completionsAreDurableIdempotentAndAccountScoped() throws Exception {
        NativeDiaryStore.snapshot(context, "local", new JSONArray().put(goal("g", "checklist")).put(goal("t", "tracker")));
        String date = LocalDate.now().toString();
        assertFalse(NativeDiaryStore.complete(context, "different-user", "g", date));
        assertFalse(NativeDiaryStore.complete(context, "local", "t", date));
        assertTrue(NativeDiaryStore.complete(context, "local", "g", date));
        assertTrue(NativeDiaryStore.complete(context, "local", "g", date));
        assertTrue(NativeDiaryStore.completed(context, "g", date));
        assertEquals(1, NativeDiaryStore.pending(context, "local").length());
        String id = NativeDiaryStore.pending(context, "local").getJSONObject(0).getString("id");
        NativeDiaryStore.acknowledge(context, new JSONArray().put(id));
        assertEquals(0, NativeDiaryStore.pending(context, "local").length());
    }
    @Test public void todayWidgetFiltersSchedulesAndRendersCompletion() throws Exception {
        JSONObject future = goal("future", "checklist").put("createdDate", LocalDate.now().plusDays(1).toString());
        JSONObject meeting = new JSONObject().put("id", "meeting").put("type", "event").put("kind", "meeting").put("title", "Team meeting")
            .put("allDay", false).put("startTime", "10:00").put("schedule", new JSONObject().put("type", "everyday"));
        NativeDiaryStore.snapshot(context, "local", new JSONArray().put(goal("g", "checklist")).put(future).put(meeting));
        NativeDiaryStore.complete(context, "local", "g", LocalDate.now().toString());
        ArrayList<JSONObject> rows = TodayWidgetProvider.today(context);
        assertEquals(2, rows.size());
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
            try {
                android.view.View view = TodayWidgetProvider.row(context, rows.get(0)).apply(context, new FrameLayout(context));
                assertTrue(((TextView)view.findViewById(R.id.widget_row_title)).getText().toString().startsWith("✓"));
                assertTrue(((TextView)view.findViewById(R.id.widget_row_detail)).getText().toString().contains("Completed"));
            } catch (Exception e) { throw new RuntimeException(e); }
        });
    }
    @Test public void androidRegistersBothHomeScreenWidgets() {
        boolean today = false, transaction = false;
        for (AppWidgetProviderInfo info : AppWidgetManager.getInstance(context).getInstalledProviders()) {
            if (info.provider.getClassName().equals(TodayWidgetProvider.class.getName())) today = true;
            if (info.provider.getClassName().equals(TransactionWidgetProvider.class.getName())) transaction = true;
        }
        assertTrue(today); assertTrue(transaction);
    }
    @Test public void bothWidgetsInflateInAnAndroidWidgetHost() throws Exception {
        android.app.UiAutomation automation = InstrumentationRegistry.getInstrumentation().getUiAutomation();
        automation.adoptShellPermissionIdentity("android.permission.BIND_APPWIDGET");
        AppWidgetHost host = new AppWidgetHost(context, 7041);
        try {
            AppWidgetManager manager = AppWidgetManager.getInstance(context);
            for (Class<?> provider : new Class<?>[]{TodayWidgetProvider.class, TransactionWidgetProvider.class}) {
                int id = host.allocateAppWidgetId();
                assertTrue(manager.bindAppWidgetIdIfAllowed(id, new ComponentName(context, provider)));
                if (provider == TodayWidgetProvider.class) new TodayWidgetProvider().onUpdate(context, manager, new int[]{id});
                else new TransactionWidgetProvider().onUpdate(context, manager, new int[]{id});
                AppWidgetProviderInfo info = manager.getAppWidgetInfo(id);
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> {
                    host.startListening();
                    AppWidgetHostView view = host.createView(context, id, info);
                    assertNotNull(view.findViewById(provider == TodayWidgetProvider.class ? R.id.widget_list : R.id.widget_expense));
                    if (provider == TransactionWidgetProvider.class) assertNotNull(view.findViewById(R.id.widget_income));
                });
            }
        } finally { host.stopListening(); host.deleteHost(); automation.dropShellPermissionIdentity(); }
    }
    @Test public void notificationLogoAndCompleteActionWorkWithoutOpeningTheApp() throws Exception {
        JSONObject goal = goal("g", "checklist");
        NativeDiaryStore.snapshot(context, "local", new JSONArray().put(goal));
        DiaryAlarmReceiver.replace(context, new JSONArray().put(new JSONObject(goal.toString()).put("kind", "goal")));
        new DiaryAlarmReceiver().onReceive(context, new Intent(context, DiaryAlarmReceiver.class).setAction("com.maikal.daily.ALARM").putExtra("alarmId", 1));
        Notification notification = null;
        NotificationManager manager = (NotificationManager)context.getSystemService(Context.NOTIFICATION_SERVICE);
        for (int attempt = 0; attempt < 40 && notification == null; attempt++) {
            for (StatusBarNotification active : manager.getActiveNotifications()) if (active.getTag().equals("g_09:00")) notification = active.getNotification();
            if (notification == null) Thread.sleep(50);
        }
        assertNotNull(notification); assertNotNull(notification.getLargeIcon());
        assertNotNull(notification.actions); assertEquals("Mark as complete", notification.actions[0].title.toString());
        notification.actions[0].actionIntent.send();
        for (int attempt = 0; attempt < 40 && !NativeDiaryStore.completed(context, "g", LocalDate.now().toString()); attempt++) Thread.sleep(50);
        assertTrue(NativeDiaryStore.completed(context, "g", LocalDate.now().toString()));
        assertEquals(1, NativeDiaryStore.pending(context, "local").length());
    }
}
