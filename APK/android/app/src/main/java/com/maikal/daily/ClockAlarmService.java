package com.maikal.daily;

import android.app.*;
import android.content.*;
import android.content.pm.ServiceInfo;
import android.media.*;
import android.os.*;
import android.net.Uri;
import androidx.core.app.NotificationCompat;

/** Rings through the alarm audio stream; the foreground notification is an OS requirement. */
public class ClockAlarmService extends Service {
    static final String CHANNEL="maikal_clock_ringing";
    static final int NOTICE=70201;
    private MediaPlayer player;private Vibrator vibrator;private PowerManager.WakeLock wake;
    private String activeId;private final java.util.LinkedHashMap<String,String> queue=new java.util.LinkedHashMap<>();
    private final Handler handler=new Handler(Looper.getMainLooper());
    @Override public android.os.IBinder onBind(Intent intent){return null;}
    static PendingIntent action(Context c,String action,String id){return PendingIntent.getService(c,0,new Intent(c,ClockAlarmService.class).setAction(action).setData(Uri.parse("maikal-clock://action/"+id+"/"+action)).putExtra("id",id),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
    @Override public int onStartCommand(Intent intent,int flags,int startId){
        if(intent==null){stopSelf();return START_NOT_STICKY;}
        String id=intent.getStringExtra("id"),command=intent.getAction();
        if("STOP".equals(command)||"SNOOZE".equals(command)){
            if(id!=null&&id.equals(activeId)){
                if("SNOOZE".equals(command))try{ClockAlarms.snooze(this,id);}catch(Exception e){android.widget.Toast.makeText(this,"Could not snooze alarm",android.widget.Toast.LENGTH_LONG).show();return START_NOT_STICKY;}
                sendBroadcast(new Intent(getPackageName()+".CLOCK_CLOSED").setPackage(getPackageName()).putExtra("id",id));
                release();activeId=null;
                if(!queue.isEmpty()){java.util.Map.Entry<String,String> next=queue.entrySet().iterator().next();queue.remove(next.getKey());ring(next.getKey(),next.getValue());}
                else{stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}
            }else if(id!=null)queue.remove(id);
            if(activeId==null){stopForeground(STOP_FOREGROUND_REMOVE);stopSelf();}
            return START_NOT_STICKY;
        }
        if(!"RING".equals(command)||ClockAlarms.find(this,id)==null){stopSelf();return START_NOT_STICKY;}
        if(activeId!=null){if(!activeId.equals(id))queue.put(id,intent.getStringExtra("title"));return START_NOT_STICKY;}
        ring(id,intent.getStringExtra("title"));return START_NOT_STICKY;
    }
    private void ring(String id,String title){
        activeId=id;
        NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);
        NotificationChannel channel=new NotificationChannel(CHANNEL,"Ringing alarms",NotificationManager.IMPORTANCE_HIGH);
        channel.setSound(null,null);channel.enableVibration(false);channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);manager.createNotificationChannel(channel);
        Intent screen=new Intent(this,RingingAlarmActivity.class).setData(Uri.parse("maikal-clock://ring/"+id)).putExtra("id",id).putExtra("title",title).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent show=PendingIntent.getActivity(this,0,screen,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification notification=new NotificationCompat.Builder(this,CHANNEL).setSmallIcon(R.drawable.ic_stat_maikal).setContentTitle(title).setContentText("Alarm ringing · Snooze for 5 minutes or Stop")
            .setCategory(NotificationCompat.CATEGORY_ALARM).setVisibility(NotificationCompat.VISIBILITY_PUBLIC).setPriority(NotificationCompat.PRIORITY_MAX).setOngoing(true).setContentIntent(show).setFullScreenIntent(show,true)
            .addAction(0,"Snooze · 5 min",action(this,"SNOOZE",id)).addAction(0,"Stop",action(this,"STOP",id)).build();
        if(Build.VERSION.SDK_INT>=29)startForeground(NOTICE,notification,ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);else startForeground(NOTICE,notification);
        try{
            wake=((PowerManager)getSystemService(POWER_SERVICE)).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK,"Maikal:ClockAlarm");wake.acquire(10*60*1000L);
            Uri sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);if(sound==null)sound=RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            player=new MediaPlayer();player.setAudioAttributes(new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());player.setDataSource(this,sound);player.setLooping(true);player.prepare();player.start();
        }catch(Exception e){android.util.Log.e("Maikal","Alarm audio unavailable",e);}
        vibrator=(Vibrator)getSystemService(VIBRATOR_SERVICE);if(vibrator!=null&&vibrator.hasVibrator())vibrator.vibrate(VibrationEffect.createWaveform(new long[]{0,700,400,700,800},0));
        // A forgotten alarm stops after ten minutes; scheduled recurrences remain intact.
        handler.postDelayed(()->{if(id.equals(activeId))onStartCommand(new Intent().setAction("STOP").putExtra("id",id),0,0);},10*60*1000L);
    }
    private void release(){handler.removeCallbacksAndMessages(null);if(player!=null){try{player.stop();}catch(Exception ignored){}player.release();player=null;}if(vibrator!=null)vibrator.cancel();if(wake!=null&&wake.isHeld())wake.release();wake=null;}
    @Override public void onDestroy(){release();super.onDestroy();}
}
