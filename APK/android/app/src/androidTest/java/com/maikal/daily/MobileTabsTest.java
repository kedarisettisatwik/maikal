package com.maikal.daily;

import android.app.Activity;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class MobileTabsTest {
    private String js(ActivityScenario<MainActivity> screen, String code) throws Exception {
        java.util.concurrent.CountDownLatch done = new java.util.concurrent.CountDownLatch(1);
        java.util.concurrent.atomic.AtomicReference<String> result = new java.util.concurrent.atomic.AtomicReference<>("");
        screen.onActivity(a -> a.getBridge().getWebView().evaluateJavascript(code, v -> { result.set(v); done.countDown(); }));
        assertTrue(done.await(3, java.util.concurrent.TimeUnit.SECONDS));
        return result.get();
    }
    private void waitFor(ActivityScenario<MainActivity> screen, String condition) throws Exception {
        for (int i=0; i<100; i++) { if ("true".equals(js(screen, condition))) return; Thread.sleep(100); }
        fail(condition);
    }
    @Test public void mobileTabsFormsAndNativeBack() throws Exception {
        ActivityScenario<MainActivity> screen = ActivityScenario.launch(MainActivity.class);
        try {
            waitFor(screen, "Boolean(document.querySelector('.mobile-app'))");
            js(screen, "document.querySelector('[role=tab][aria-label=Home]').click()");
            waitFor(screen, "document.querySelector('.mobile-app').dataset.activeTab==='home'");
            assertEquals("5", js(screen, "document.querySelectorAll('[aria-label=\"Main navigation\"] [role=tab]').length"));
            assertEquals("true", js(screen, "window.innerWidth<600 && [...document.querySelectorAll('h2')].some(e=>e.textContent==='Reminders & Meetings')"));
            js(screen, "[...document.querySelectorAll('button')].find(e=>e.textContent==='+ New goal').click()");
            waitFor(screen, "Boolean(document.querySelector('dialog[open].native-form-page'))");
            assertEquals("true", js(screen, "document.querySelector('dialog').textContent.includes('Notification times') && document.querySelector('dialog').textContent.includes('Alarm times')"));
            screen.onActivity(a -> a.getOnBackPressedDispatcher().onBackPressed());
            waitFor(screen, "!document.querySelector('dialog[open]')");
            js(screen, "document.querySelector('[role=tab][aria-label=Money]').click()");
            waitFor(screen, "document.querySelector('.mobile-app').dataset.activeTab==='money'");
            screen.onActivity(a -> a.getOnBackPressedDispatcher().onBackPressed());
            waitFor(screen, "document.querySelector('.mobile-app').dataset.activeTab==='home'");
            js(screen, "document.querySelector('[role=tab][aria-label=Note]').click()");
            waitFor(screen, "document.querySelector('.mobile-app').dataset.activeTab==='note'");
            js(screen, "document.querySelector('[aria-label=\"New note\"]').click()");
            waitFor(screen, "Boolean(document.querySelector('dialog[open]'))");
        } finally { screen.onActivity(Activity::finishAndRemoveTask); }
    }
}
