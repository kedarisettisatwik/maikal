package com.maikal.daily;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.os.Bundle;
import android.widget.*;
import org.json.*;

public class NoteWidgetConfigureActivity extends Activity {
    private int widgetId;
    @Override public void onCreate(Bundle state){super.onCreate(state);setResult(RESULT_CANCELED);widgetId=getIntent().getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,AppWidgetManager.INVALID_APPWIDGET_ID);if(widgetId==AppWidgetManager.INVALID_APPWIDGET_ID){finish();return;}render();}
    @Override protected void onResume(){super.onResume();if(widgetId!=AppWidgetManager.INVALID_APPWIDGET_ID)render();}
    private void render(){
        LinearLayout list=new LinearLayout(this);list.setOrientation(LinearLayout.VERTICAL);int padding=Math.round(22*getResources().getDisplayMetrics().density);list.setPadding(padding,padding*2,padding,padding);list.setBackgroundColor(0xfffaf8ef);
        TextView title=new TextView(this);title.setText("Choose a note");title.setTextSize(28);title.setTextColor(0xff253439);list.addView(title);
        TextView help=new TextView(this);help.setText("This note will appear on your home screen. Tap the widget to open it in Maikal.");help.setPadding(0,padding,0,padding);help.setTextColor(0xff72756e);list.addView(help);
        int count=0;try{JSONArray records=NativeDiaryStore.records(this);for(int i=0;i<records.length();i++){JSONObject note=records.getJSONObject(i);if(!"note".equals(note.optString("type"))||note.optBoolean("deleted"))continue;count++;Button button=new Button(this);button.setAllCaps(false);button.setText(note.optString("title","Untitled note"));button.setTextColor(0xff253439);list.addView(button);button.setOnClickListener(v->{try{NoteWidgetProvider.select(this,widgetId,note.getString("id"));NoteWidgetProvider.update(this,widgetId);setResult(RESULT_OK,new Intent().putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,widgetId));finish();}catch(Exception e){Toast.makeText(this,e.getMessage(),Toast.LENGTH_LONG).show();}});}}catch(Exception e){Toast.makeText(this,"Open Maikal to refresh your notes",Toast.LENGTH_LONG).show();}
        if(count==0){TextView empty=new TextView(this);empty.setText("No notes yet. Open Maikal and create or sync a note, then return here.");list.addView(empty);}
        Button open=new Button(this);open.setText("Open Maikal Notes");open.setOnClickListener(v->startActivity(new Intent(this,MainActivity.class).putExtra("openNotes",true)));list.addView(open);
        Button cancel=new Button(this);cancel.setText("Cancel");cancel.setOnClickListener(v->finish());list.addView(cancel);ScrollView scroll=new ScrollView(this);scroll.addView(list);setContentView(scroll);
    }
}
