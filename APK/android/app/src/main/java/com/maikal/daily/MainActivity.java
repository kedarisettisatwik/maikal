package com.maikal.daily;

import android.os.Bundle;
import android.content.Intent;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); SharedNotes.capture(this,intent); }
    @Override public void onCreate(Bundle state) {
        registerPlugin(DiaryAlarmsPlugin.class);
        super.onCreate(state);
        SharedNotes.capture(this,getIntent());
        getBridge().getWebView().getSettings().setSupportZoom(true);
        getBridge().getWebView().getSettings().setBuiltInZoomControls(true);
        getBridge().getWebView().getSettings().setDisplayZoomControls(false);
        getBridge().getWebView().getSettings().setUseWideViewPort(true);
        getBridge().getWebView().getSettings().setLoadWithOverviewMode(true);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() {
                getBridge().getWebView().evaluateJavascript("Boolean(document.querySelector('dialog[open].native-form-page'))", open -> {
                    if ("true".equals(open)) getBridge().getWebView().evaluateJavascript("document.querySelector('dialog[open].native-form-page')?.dispatchEvent(new Event('cancel',{cancelable:true}))", null);
                    else getBridge().getWebView().evaluateJavascript("Boolean(document.querySelector('[data-notes-page]'))", notes -> {
                        if ("true".equals(notes)) getBridge().getWebView().evaluateJavascript("window.location.hash=''", null);
                        else { setEnabled(false); getOnBackPressedDispatcher().onBackPressed(); setEnabled(true); }
                    });
                });
            }
        });
    }
}
