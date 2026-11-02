package com.maikal.daily;

import android.os.Bundle;
import android.content.Intent;
import android.content.IntentFilter;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    private boolean focusVisible;
    private final android.os.Handler focusHandler=new android.os.Handler(android.os.Looper.getMainLooper());
    private final android.content.BroadcastReceiver focusUnlock=new android.content.BroadcastReceiver(){@Override public void onReceive(android.content.Context c,Intent i){focusHandler.postDelayed(()->{if(!focusVisible)NativeFocus.pause(c);},500);}};
    @Override protected void onUserLeaveHint(){NativeFocus.pause(this);super.onUserLeaveHint();}
    @Override public void onResume(){super.onResume();focusVisible=true;}
    @Override public void onPause(){super.onPause();focusVisible=false;focusHandler.postDelayed(()->{android.os.PowerManager power=(android.os.PowerManager)getSystemService(POWER_SERVICE);android.app.KeyguardManager keyguard=(android.app.KeyguardManager)getSystemService(KEYGUARD_SERVICE);if(!focusVisible&&power.isInteractive()&&!keyguard.isKeyguardLocked())NativeFocus.pause(this);},500);}
    @Override public void onDestroy(){focusHandler.removeCallbacksAndMessages(null);try{unregisterReceiver(focusUnlock);}catch(Exception ignored){}super.onDestroy();}
    @Override protected void onNewIntent(Intent intent) { super.onNewIntent(intent); setIntent(intent); SharedNotes.capture(this,intent); }
    @Override public void onCreate(Bundle state) {
        registerPlugin(DiaryAlarmsPlugin.class);
        super.onCreate(state);
        LegacyPaymentCleanup.run(this);
        IntentFilter focusFilter=new IntentFilter(Intent.ACTION_USER_PRESENT);if(android.os.Build.VERSION.SDK_INT>=33)registerReceiver(focusUnlock,focusFilter,android.content.Context.RECEIVER_NOT_EXPORTED);else registerReceiver(focusUnlock,focusFilter);
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
                    else getBridge().getWebView().evaluateJavascript("document.querySelector('.mobile-app')?.dataset.activeTab || ''", tab -> {
                        if (!"\"\"".equals(tab) && !"null".equals(tab)) {
                            if (!"\"home\"".equals(tab)) getBridge().getWebView().evaluateJavascript("window.dispatchEvent(new Event('maikal-mobile-home'))", null);
                            else { setEnabled(false); getOnBackPressedDispatcher().onBackPressed(); setEnabled(true); }
                        } else getBridge().getWebView().evaluateJavascript("Boolean(document.querySelector('[data-notes-page]'))", notes -> {
                            if ("true".equals(notes)) getBridge().getWebView().evaluateJavascript("window.location.hash=''", null);
                            else { setEnabled(false); getOnBackPressedDispatcher().onBackPressed(); setEnabled(true); }
                        });
                    });
                });
            }
        });
    }
}
