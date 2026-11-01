package com.maikal.daily;
import android.app.*;
import android.content.*;
/** A batched midnight refresh, so a saved 'Today' card can roll over without opening the app. */
public class CustomWidgetDateReceiver extends BroadcastReceiver {
 static PendingIntent pending(Context c){return PendingIntent.getBroadcast(c,68401,new Intent(c,CustomWidgetDateReceiver.class).setAction("com.maikal.daily.CUSTOM_WIDGET_DATE"),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static void schedule(Context c){long midnight=java.time.LocalDate.now().plusDays(1).atStartOfDay(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli();((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).setWindow(AlarmManager.RTC,midnight,15*60*1000L,pending(c));}
 static void cancel(Context c){((AlarmManager)c.getSystemService(Context.ALARM_SERVICE)).cancel(pending(c));}
 @Override public void onReceive(Context c,Intent intent){CustomWidgetProvider.refresh(c);}
}
