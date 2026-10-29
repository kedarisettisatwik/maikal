package com.maikal.daily;

import android.os.Bundle;
import android.content.Intent;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); }
    @Override public void onCreate(Bundle state) {
        registerPlugin(DiaryAlarmsPlugin.class);
        super.onCreate(state);
        getBridge().getWebView().getSettings().setSupportZoom(true);
        getBridge().getWebView().getSettings().setBuiltInZoomControls(true);
        getBridge().getWebView().getSettings().setDisplayZoomControls(false);
        getBridge().getWebView().getSettings().setUseWideViewPort(true);
        getBridge().getWebView().getSettings().setLoadWithOverviewMode(true);
    }
}
