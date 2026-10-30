package com.maikal.daily;
import android.app.Activity;
import android.content.*;
import android.os.*;
import android.view.*;
import android.widget.*;

public class RingingAlarmActivity extends Activity {
    private final BroadcastReceiver closed=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){if(getIntent().getStringExtra("id").equals(i.getStringExtra("id")))finish();}};
    @Override public void onCreate(Bundle state){super.onCreate(state);setShowWhenLocked(true);setTurnScreenOn(true);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        getWindow().setStatusBarColor(0xff1c2025);getWindow().setNavigationBarColor(0xff1c2025);getWindow().getDecorView().setSystemUiVisibility(0);
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setGravity(Gravity.CENTER_HORIZONTAL);layout.setPadding(dp(20),dp(24),dp(20),dp(40));layout.setBackgroundColor(0xff1c2025);
        layout.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(dp(20)+insets.getSystemWindowInsetLeft(),dp(24)+insets.getSystemWindowInsetTop(),dp(20)+insets.getSystemWindowInsetRight(),dp(40)+insets.getSystemWindowInsetBottom());return insets;});
        layout.addView(new View(this),new LinearLayout.LayoutParams(1,0,2));
        TextClock clock=new TextClock(this);clock.setFormat12Hour("hh:mm");clock.setFormat24Hour("HH:mm");clock.setTextSize(Math.min(100,getResources().getDisplayMetrics().widthPixels/getResources().getDisplayMetrics().scaledDensity/3.7f));clock.setTypeface(android.graphics.Typeface.create("sans-serif-light",0));clock.setTextColor(0xffe3e3ec);clock.setGravity(Gravity.CENTER);layout.addView(clock,new LinearLayout.LayoutParams(-1,-2));
        TextView title=new TextView(this);title.setText(getIntent().getStringExtra("title"));title.setTextSize(27);title.setTextColor(0xffe3e3ec);title.setGravity(Gravity.CENTER);title.setPadding(0,dp(34),0,0);layout.addView(title,new LinearLayout.LayoutParams(-1,-2));
        layout.addView(new View(this),new LinearLayout.LayoutParams(1,0,2));
        AlarmSwipeView slider=new AlarmSwipeView(this,command->{startService(new Intent(this,ClockAlarmService.class).setAction(command).putExtra("id",getIntent().getStringExtra("id")));finish();});layout.addView(slider,new LinearLayout.LayoutParams(-1,dp(80)));
        TextView hint=new TextView(this);hint.setText("← Snooze 5 min                 Stop →");hint.setTextColor(0xff929dab);hint.setTextSize(12);hint.setGravity(Gravity.CENTER);hint.setPadding(0,dp(16),0,0);layout.addView(hint);
        setContentView(layout);IntentFilter filter=new IntentFilter(getPackageName()+".CLOCK_CLOSED");if(Build.VERSION.SDK_INT>=33)registerReceiver(closed,filter,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(closed,filter);
    }
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    @Override protected void onDestroy(){unregisterReceiver(closed);super.onDestroy();}
}
