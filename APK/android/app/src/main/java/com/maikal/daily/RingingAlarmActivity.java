package com.maikal.daily;
import android.app.Activity;
import android.content.*;
import android.os.*;
import android.view.*;
import android.widget.*;

public class RingingAlarmActivity extends Activity {
    private final BroadcastReceiver closed=new BroadcastReceiver(){@Override public void onReceive(Context c,Intent i){if(getIntent().getStringExtra("id").equals(i.getStringExtra("id")))finish();}};
    @Override public void onCreate(Bundle state){super.onCreate(state);setShowWhenLocked(true);setTurnScreenOn(true);getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);layout.setGravity(Gravity.CENTER);layout.setPadding(32,48,32,48);layout.setBackgroundColor(0xfffaf8ef);
        TextView title=new TextView(this);title.setText(getIntent().getStringExtra("title"));title.setTextSize(32);title.setTextColor(0xff253439);title.setGravity(Gravity.CENTER);layout.addView(title);
        TextView label=new TextView(this);label.setText("Maikal alarm");label.setTextSize(18);label.setPadding(0,20,0,36);layout.addView(label);
        for(String command:new String[]{"SNOOZE","STOP"}){Button button=new Button(this);button.setText("SNOOZE".equals(command)?"Snooze · 5 minutes":"Stop alarm");layout.addView(button,new LinearLayout.LayoutParams(-1,76));button.setOnClickListener(v->{startService(new Intent(this,ClockAlarmService.class).setAction(command).putExtra("id",getIntent().getStringExtra("id")));finish();});}
        setContentView(layout);IntentFilter filter=new IntentFilter(getPackageName()+".CLOCK_CLOSED");if(Build.VERSION.SDK_INT>=33)registerReceiver(closed,filter,Context.RECEIVER_NOT_EXPORTED);else registerReceiver(closed,filter);
    }
    @Override protected void onDestroy(){unregisterReceiver(closed);super.onDestroy();}
}
