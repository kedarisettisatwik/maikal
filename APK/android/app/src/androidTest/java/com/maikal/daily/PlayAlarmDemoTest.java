package com.maikal.daily;
import android.app.*;
import android.content.*;
import android.os.*;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.ActivityScenario;
import androidx.test.platform.app.InstrumentationRegistry;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.*;
import org.junit.*;
import org.junit.runner.RunWith;
import java.time.*;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class) public class PlayAlarmDemoTest extends NextReleaseTest {
 <T extends View>T find(View v,Class<T> type,String text){if(type.isInstance(v)&&(text==null||text.equals(String.valueOf(v.getContentDescription()))||v instanceof TextView&&text.contentEquals(((TextView)v).getText())))return type.cast(v);if(v instanceof ViewGroup)for(int i=0;i<((ViewGroup)v).getChildCount();i++){T got=find(((ViewGroup)v).getChildAt(i),type,text);if(got!=null)return got;}return null;}
 @Test public void createScheduledAlarmShowNotificationAndStop()throws Exception{
  shell("appops set "+c.getPackageName()+" USE_FULL_SCREEN_INTENT allow");c.getSharedPreferences("maikal_clock_v1",0).edit().clear().commit();String[] id={null};
  android.app.Instrumentation instrumentation=InstrumentationRegistry.getInstrumentation();android.app.Instrumentation.ActivityMonitor monitor=instrumentation.addMonitor(RingingAlarmActivity.class.getName(),null,false);
  try(ActivityScenario<AlarmsActivity> screen=ActivityScenario.launch(AlarmsActivity.class)){
   Thread.sleep(1800);screen.onActivity(a->find(a.getWindow().getDecorView(),Button.class,"Add alarm").performClick());Thread.sleep(1200);
   ZonedDateTime now=ZonedDateTime.now();ZonedDateTime at=now.plusMinutes(now.getSecond()>44?2:1).withSecond(0).withNano(0);
   screen.onActivity(a->{View root=a.getWindow().getDecorView();find(root,EditText.class,"Alarm name").setText("Stretch break");TimePicker picker=find(root,TimePicker.class,null);picker.setHour(at.getHour());picker.setMinute(at.getMinute());find(root,Spinner.class,null).setSelection(2);});Thread.sleep(800);
   screen.onActivity(a->{View root=a.getWindow().getDecorView();find(root,CheckBox.class,"Delete after completion").setChecked(true);find(root,ScrollView.class,null).fullScroll(View.FOCUS_DOWN);});Thread.sleep(1800);
   screen.onActivity(a->find(a.getWindow().getDecorView(),Button.class,"Save alarm").performClick());Thread.sleep(1600);
   JSONArray alarms=ClockAlarms.all(c);for(int i=0;i<alarms.length();i++)if("Stretch break".equals(alarms.getJSONObject(i).optString("title")))id[0]=alarms.getJSONObject(i).getString("id");assertNotNull(id[0]);
   NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);android.app.Notification notice=null;
   for(int i=0;i<200;i++){for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==ClockAlarmService.NOTICE)notice=n.getNotification();if(notice!=null)break;Thread.sleep(500);}assertNotNull("Scheduled ringing alarm should fire",notice);
   shell("cmd statusbar expand-notifications");Thread.sleep(2500);shell("cmd statusbar collapse");notice.contentIntent.send();
   Activity ringing=instrumentation.waitForMonitorWithTimeout(monitor,8000);assertNotNull(ringing);Thread.sleep(4500);
   int[] position=new int[3];instrumentation.runOnMainSync(()->{View slider=find(ringing.getWindow().getDecorView(),AlarmSwipeView.class,null);int[] xy=new int[2];slider.getLocationOnScreen(xy);position[0]=xy[0]+slider.getWidth()/2;position[1]=xy[1]+slider.getHeight()/2;position[2]=xy[0]+slider.getWidth()-8;});
   shell("input swipe "+position[0]+" "+position[1]+" "+position[2]+" "+position[1]+" 500");Thread.sleep(1800);assertNull(ClockAlarms.find(c,id[0]));screen.onActivity(a->assertNull(find(a.getWindow().getDecorView(),TextView.class,"Stretch break")));
  }finally{instrumentation.removeMonitor(monitor);if(id[0]!=null){c.startService(new Intent(c,ClockAlarmService.class).setAction("STOP").putExtra("id",id[0]));ClockAlarms.delete(c,id[0]);}}
 }
}
