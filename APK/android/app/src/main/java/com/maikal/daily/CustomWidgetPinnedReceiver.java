package com.maikal.daily;
import android.appwidget.AppWidgetManager;
import android.content.*;
import org.json.JSONObject;
public class CustomWidgetPinnedReceiver extends BroadcastReceiver {
 @Override public void onReceive(Context c,Intent intent){int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);if(!CustomWidgetProvider.owns(c,id))return;try{JSONObject plan=CustomWidgetStore.layouts(c).optJSONObject(intent.getStringExtra("layoutId"));if(plan!=null&&CustomWidgetStore.widget(c,id)==null)CustomWidgetStore.configure(c,id,plan);CustomWidgetProvider.update(c,id);}catch(Exception e){android.util.Log.e("MANTRA","Custom widget placement failed",e);}}
}
