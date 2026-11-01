package com.maikal.daily;
import android.content.*;
import android.graphics.Color;
import android.graphics.drawable.GradientDrawable;
import android.view.*;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class ApprovedChangesTest {
 final Context c=ApplicationProvider.getApplicationContext();
 @Test public void extraProgressIsAtomicAndDeduplicatedAfterAcknowledging()throws Exception{
  SharedPreferences p=NativeDiaryStore.prefs(c);String records=p.getString("records","[]"),uid=NativeDiaryStore.uid(c),actions=p.getString("actions","[]"),totals=p.getString("trackerTotals","{}"),processed=p.getString("trackerReplies","{}");String day=java.time.LocalDate.now().toString();
  try{p.edit().putString("actions","[]").putString("trackerTotals","{}").putString("trackerReplies","{}").commit();JSONObject goal=new JSONObject().put("id","approved_delta").put("type","goal").put("goalType","tracker").put("schedule",new JSONObject().put("type","everyday"));JSONObject progress=new JSONObject().put("id","progress_approved_delta_"+day).put("type","progress").put("goalId","approved_delta").put("date",day).put("value",20).put("updatedAt",1);JSONArray snapshot=new JSONArray().put(goal).put(progress);NativeDiaryStore.snapshot(c,"local",snapshot);
   assertTrue(NativeDiaryStore.addProgress(c,"local","approved_delta",day,5,"first-reply"));assertEquals(25,NativeDiaryStore.trackerValue(c,"approved_delta",day),0);
   NativeDiaryStore.acknowledge(c,new JSONArray().put("first-reply"));NativeDiaryStore.snapshot(c,"local",snapshot);
   assertTrue(NativeDiaryStore.addProgress(c,"local","approved_delta",day,5,"first-reply"));assertEquals(25,NativeDiaryStore.trackerValue(c,"approved_delta",day),0);assertEquals(0,NativeDiaryStore.actions(c).length());
   assertTrue(NativeDiaryStore.addProgress(c,"local","approved_delta",day,7.5,"second-reply"));assertEquals(32.5,NativeDiaryStore.trackerValue(c,"approved_delta",day),0);assertFalse(NativeDiaryStore.addProgress(c,"local","approved_delta",day,-1,"negative"));assertEquals(32.5,NativeDiaryStore.trackerValue(c,"approved_delta",day),0);
   progress.put("value",40).put("updatedAt",System.currentTimeMillis()+10000);NativeDiaryStore.snapshot(c,"local",snapshot);assertEquals(40,NativeDiaryStore.trackerValue(c,"approved_delta",day),0);
  }finally{p.edit().putString("uid",uid).putString("records",records).putString("actions",actions).putString("trackerTotals",totals).putString("trackerReplies",processed).commit();}
 }
 @Test public void allCardWidgetsUseWhiteInLightTheme(){String previous=MantraTheme.choice(c);try{MantraTheme.save(c,"light");InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{for(int layout:new int[]{R.layout.widget_today,R.layout.widget_note,R.layout.widget_money_summary,R.layout.widget_track,R.layout.widget_total_screen_time}){View view=LayoutInflater.from(c).inflate(layout,null);assertEquals(Color.WHITE,((GradientDrawable)view.getBackground()).getColor().getDefaultColor());}});}finally{MantraTheme.save(c,previous);}}
}
