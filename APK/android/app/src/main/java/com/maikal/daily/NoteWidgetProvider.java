package com.maikal.daily;

import android.app.PendingIntent;
import android.appwidget.*;
import android.content.*;
import android.net.Uri;
import android.widget.RemoteViews;
import org.json.*;

public class NoteWidgetProvider extends AppWidgetProvider {
    static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("maikal_note_widgets",Context.MODE_PRIVATE);}
    static void select(Context c,int widgetId,String noteId)throws Exception{if(!prefs(c).edit().putString("note_"+widgetId,noteId).putString("uid_"+widgetId,NativeDiaryStore.uid(c)).commit())throw new IllegalStateException("Could not save widget selection");}
    static JSONObject selected(Context c,int widgetId)throws Exception{
        if(!NativeDiaryStore.uid(c).equals(prefs(c).getString("uid_"+widgetId,"")))return null;
        String id=prefs(c).getString("note_"+widgetId,"");JSONArray records=NativeDiaryStore.records(c);
        for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);if(id.equals(r.optString("id"))&&"note".equals(r.optString("type"))&&!r.optBoolean("deleted"))return r;}
        return null;
    }
    static String preview(JSONObject note){
        if("checklist".equals(note.optString("noteType"))){StringBuilder text=new StringBuilder();JSONArray items=note.optJSONArray("items");if(items!=null)for(int i=0;i<Math.min(6,items.length());i++){JSONObject item=items.optJSONObject(i);if(item!=null)text.append(item.optBoolean("done")?"✓ ":"□ ").append(item.optString("text")).append('\n');}return text.toString().trim();}
        String body=note.optString("body");return body.isEmpty()?note.optString("url"):body;
    }
    static RemoteViews views(Context c,int id)throws Exception{
        RemoteViews view=new RemoteViews(c.getPackageName(),R.layout.widget_note);JSONObject note=selected(c,id);
        view.setTextViewText(R.id.widget_note_title,note==null?"Note unavailable":note.optString("title","Note"));
        view.setTextViewText(R.id.widget_note_body,note==null?"Open Maikal to sync this diary, or choose another note.":preview(note));
        view.setTextViewText(R.id.widget_note_source,note==null?"Maikal Notes":note.optString("source","Written here")+" · Tap to open");
        String noteId=prefs(c).getString("note_"+id,"");
        Intent open=new Intent(c,MainActivity.class).setData(Uri.parse("maikal-note://widget/"+id)).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP)
            .putExtra("noteId",noteId).putExtra("noteUid",prefs(c).getString("uid_"+id,""));
        view.setOnClickPendingIntent(R.id.widget_note_card,PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        Intent configure=new Intent(c,NoteWidgetConfigureActivity.class).setData(Uri.parse("maikal-note://configure/"+id)).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id);
        view.setOnClickPendingIntent(R.id.widget_note_change,PendingIntent.getActivity(c,id,configure,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));return view;
    }
    static void update(Context c,int id){try{AppWidgetManager.getInstance(c).updateAppWidget(id,views(c,id));}catch(Exception e){android.util.Log.e("Maikal","Note widget update failed",e);}}
    static void refresh(Context c){for(int id:AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,NoteWidgetProvider.class)))update(c,id);}
    @Override public void onUpdate(Context c,AppWidgetManager manager,int[] ids){for(int id:ids)update(c,id);}
    @Override public void onDeleted(Context c,int[] ids){android.content.SharedPreferences.Editor edit=prefs(c).edit();for(int id:ids)edit.remove("note_"+id).remove("uid_"+id);edit.apply();}
}
