package com.maikal.daily;
import android.app.Activity;
import android.appwidget.*;
import android.content.*;
import android.os.Bundle;
import android.view.*;
import android.widget.*;
import androidx.test.core.app.*;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.*;
import org.junit.Test;
import org.junit.runner.RunWith;
import static org.junit.Assert.*;
@RunWith(AndroidJUnit4.class)
public class CustomWidgetFeatureTest {
 final Context c=ApplicationProvider.getApplicationContext();
 @Test public void sizesActionsAndIndependentWidgetCopiesAreValidated()throws Exception{
  JSONObject plan=CustomWidgetStore.defaults();assertEquals(9,CustomWidgetStore.SIZES.length);
  for(String size:CustomWidgetStore.SIZES){plan.put("size",size);JSONArray actions=new JSONArray();for(int i=0;i<CustomWidgetStore.capacity(size);i++)actions.put(CustomWidgetStore.ACTIONS[i]);plan.put("actions",actions);assertEquals(size,CustomWidgetStore.validate(plan).getString("size"));assertNotNull(CustomWidgetProvider.component(c,size));}
  try{CustomWidgetStore.validate(new JSONObject(plan.toString()).put("actions",new JSONArray().put("other")));fail("Unexpected action accepted");}catch(IllegalArgumentException expected){}
  try{CustomWidgetStore.validate(new JSONObject(plan.toString()).put("size","1x1"));fail("Too many actions accepted");}catch(IllegalArgumentException expected){}
  int a=1900001,b=1900002;try{plan=CustomWidgetStore.defaults();CustomWidgetStore.configure(c,a,plan);CustomWidgetStore.configure(c,b,plan);plan.put("appearance","dark");CustomWidgetStore.configure(c,a,plan);assertEquals("app",CustomWidgetStore.widget(c,b).getString("appearance"));assertEquals("dark",CustomWidgetStore.widget(c,a).getString("appearance"));}finally{CustomWidgetStore.delete(c,a);CustomWidgetStore.delete(c,b);}
 }
 @Test public void allNineSizesRenderActionsAndPinMetadata()throws Exception{
  for(String size:CustomWidgetStore.SIZES){JSONObject plan=CustomWidgetStore.defaults().put("size",size);JSONArray actions=new JSONArray();for(int i=0;i<CustomWidgetStore.capacity(size);i++)actions.put(CustomWidgetStore.ACTIONS[i]);plan.put("actions",actions);Bundle options=new Bundle();options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,Integer.parseInt(size.substring(0,1))*70);options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,Integer.parseInt(size.substring(2))*70);final JSONObject config=plan;
   InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{View root=CustomWidgetProvider.views(c,1900001,config,options).apply(c,new FrameLayout(c));LinearLayout rows=root.findViewById(R.id.custom_rows);int buttons=0;for(int i=0;i<rows.getChildCount();i++)buttons+=((LinearLayout)rows.getChildAt(i)).getChildCount();assertEquals(config.getJSONArray("actions").length(),buttons);assertEquals(View.GONE,root.findViewById(R.id.custom_header).getVisibility());for(int r=0;r<rows.getChildCount();r++){LinearLayout line=(LinearLayout)rows.getChildAt(r);for(int j=0;j<line.getChildCount();j++){View tile=line.getChildAt(j);assertEquals(View.GONE,tile.findViewById(R.id.custom_label).getVisibility());assertEquals(android.graphics.Color.TRANSPARENT,((android.graphics.drawable.ColorDrawable)tile.getBackground()).getColor());}}assertEquals(android.graphics.Color.WHITE,((android.graphics.drawable.ColorDrawable)root.findViewById(R.id.custom_root).getBackground()).getColor());}catch(Exception e){throw new RuntimeException(e);}});
   AppWidgetProviderInfo found=null;for(AppWidgetProviderInfo info:AppWidgetManager.getInstance(c).getInstalledProviders())if(info.provider.equals(CustomWidgetProvider.component(c,size)))found=info;assertNotNull("Missing size provider "+size,found);assertEquals("com.maikal.daily.CustomWidgetConfigureActivity",found.configure.getClassName());
  }
 }
 @Test public void oneColumnPanelStaysNarrowInAWideLauncherSlot()throws Exception{
  JSONObject plan=CustomWidgetStore.defaults().put("size","1x4");Bundle options=new Bundle();options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,300);options.putInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,280);
  InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{View root=CustomWidgetProvider.views(c,1900001,plan,options).apply(c,new FrameLayout(c));View panel=root.findViewById(R.id.custom_root);assertEquals(Math.round(68*c.getResources().getDisplayMetrics().density),panel.getLayoutParams().width);assertTrue(panel.getPaddingLeft()>0);assertEquals(android.graphics.Color.TRANSPARENT,((android.graphics.drawable.ColorDrawable)root.getBackground()).getColor());}catch(Exception e){throw new RuntimeException(e);}});
 }
 @Test public void moneyViewsUseOnlySelectedPeriodAndIgnoreDeletedTransactions()throws Exception{
  android.content.SharedPreferences p=NativeDiaryStore.prefs(c);String old=p.getString("records","[]"),uid=NativeDiaryStore.uid(c);String day=java.time.LocalDate.now().toString();
  try{JSONArray records=new JSONArray();records.put(tx("i",day,"income",100000,false));records.put(tx("e",day,"expense",25000,false));records.put(tx("deleted",day,"expense",1000000,true));records.put(tx("old",java.time.LocalDate.now().minusMonths(1).withDayOfMonth(1).toString(),"expense",9000,false));records.put(tx("other_day",(java.time.LocalDate.now().getDayOfMonth()==1?java.time.LocalDate.now().plusDays(1):java.time.LocalDate.now().minusDays(1)).toString(),"expense",5000,false));NativeDiaryStore.snapshot(c,"local",records);assertArrayEquals(new long[]{100000,25000,75000},CustomMoneyWidget.totals(c,"day"));assertArrayEquals(new long[]{100000,30000,70000},CustomMoneyWidget.totals(c,"month"));
   for(String view:CustomWidgetStore.MONEY_VIEWS){JSONObject plan=CustomWidgetStore.defaults().put("type","money").put("moneyView",view).put("uid","local");assertEquals(view.endsWith("summary")?"3x3":"1x2",CustomWidgetStore.validate(plan).getString("size"));InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{View root=CustomWidgetProvider.views(c,1900001,plan,new Bundle()).apply(c,new FrameLayout(c));assertEquals(view.endsWith("summary")?3:1,((LinearLayout)root.findViewById(R.id.custom_money_values)).getChildCount());}catch(Exception e){throw new RuntimeException(e);}});}
   JSONObject other=CustomWidgetStore.defaults().put("type","money").put("uid","another-diary");InstrumentationRegistry.getInstrumentation().runOnMainSync(()->{try{View root=CustomWidgetProvider.views(c,1900001,other,new Bundle()).apply(c,new FrameLayout(c));assertEquals(0,((LinearLayout)root.findViewById(R.id.custom_money_values)).getChildCount());}catch(Exception e){throw new RuntimeException(e);}});
  }finally{p.edit().putString("uid",uid).putString("records",old).commit();}
 }
 private JSONObject tx(String id,String date,String kind,long amount,boolean deleted)throws Exception{return new JSONObject().put("id",id).put("type","transaction").put("date",date).put("kind",kind).put("amount",amount).put("deleted",deleted);}
 @Test public void builderOpensWithOnlyFourShortcutChoices()throws Exception{
  try(ActivityScenario<CustomWidgetConfigureActivity> screen=ActivityScenario.launch(CustomWidgetConfigureActivity.class)){screen.onActivity(a->{android.view.ViewGroup content=a.findViewById(android.R.id.content);assertEquals(4,countChecks(content));assertNull(find(content,"Widget name"));});}
 }
 @Test public void draggingShortcutHandleChangesSavedOrder()throws Exception{
  String saved=CustomWidgetStore.prefs(c).getString("layouts","{}");
  try(ActivityScenario<CustomWidgetConfigureActivity> screen=ActivityScenario.launch(CustomWidgetConfigureActivity.class)){
   InstrumentationRegistry.getInstrumentation().waitForIdleSync();screen.onActivity(a->{ScrollView scroll=(ScrollView)((android.view.ViewGroup)a.findViewById(android.R.id.content)).getChildAt(0);scroll.setSmoothScrollingEnabled(false);scroll.fullScroll(View.FOCUS_DOWN);});InstrumentationRegistry.getInstrumentation().waitForIdleSync();
   int[] points=new int[4];screen.onActivity(a->{View root=a.findViewById(android.R.id.content),from=find(root,"Drag to reorder Add note"),to=find(root,"Drag to reorder Add event");int[] xy=new int[2];from.getLocationOnScreen(xy);points[0]=xy[0]+from.getWidth()/2;points[1]=xy[1]+from.getHeight()/2;to.getLocationOnScreen(xy);points[2]=xy[0]+to.getWidth()/2;points[3]=xy[1]+to.getHeight()/2;});
   android.app.Instrumentation instrument=InstrumentationRegistry.getInstrumentation();Thread.sleep(500);long start=android.os.SystemClock.uptimeMillis();touch(instrument,start,android.view.MotionEvent.ACTION_DOWN,points[0],points[1]);Thread.sleep(150);for(int step=1;step<=20;step++){touch(instrument,start,android.view.MotionEvent.ACTION_MOVE,points[0]+(points[2]-points[0])*step/20f,points[1]+(points[3]-points[1])*step/20f);Thread.sleep(25);}touch(instrument,start,android.view.MotionEvent.ACTION_UP,points[2],points[3]);instrument.waitForIdleSync();
   screen.onActivity(a->{View root=a.findViewById(android.R.id.content);View handle=find(root,"Drag to reorder Add transaction");LinearLayout order=(LinearLayout)handle.getParent().getParent();assertEquals("Add transaction",((TextView)((LinearLayout)order.getChildAt(0)).getChildAt(0)).getText().toString());assertEquals("Add note",((TextView)((LinearLayout)order.getChildAt(3)).getChildAt(0)).getText().toString());Button save=findButton(root,"Save layout");assertNotNull(save);save.performClick();});
   JSONObject layouts=CustomWidgetStore.layouts(c);boolean found=false;java.util.Iterator<String> keys=layouts.keys();while(keys.hasNext()){JSONArray actions=layouts.getJSONObject(keys.next()).getJSONArray("actions");if(actions.length()==4&&"transaction".equals(actions.optString(0))&&"note".equals(actions.optString(3)))found=true;}assertTrue("Dragged order was not saved",found);
  }finally{CustomWidgetStore.prefs(c).edit().putString("layouts",saved).commit();}
 }
 private void touch(android.app.Instrumentation i,long down,int action,float x,float y){android.view.MotionEvent event=android.view.MotionEvent.obtain(down,android.os.SystemClock.uptimeMillis(),action,x,y,0);event.setSource(android.view.InputDevice.SOURCE_TOUCHSCREEN);assertTrue(i.getUiAutomation().injectInputEvent(event,true));event.recycle();}
 private Button findButton(View v,String label){if(v instanceof Button&&label.contentEquals(((Button)v).getText()))return (Button)v;if(v instanceof android.view.ViewGroup){android.view.ViewGroup g=(android.view.ViewGroup)v;for(int i=0;i<g.getChildCount();i++){Button b=findButton(g.getChildAt(i),label);if(b!=null)return b;}}return null;}
 private int countChecks(View view){int result=view instanceof CheckBox?1:0;if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++)result+=countChecks(group.getChildAt(i));}return result;}
 private View find(View view,String label){if(label.contentEquals(view.getContentDescription()==null?"":view.getContentDescription()))return view;if(view instanceof android.view.ViewGroup){android.view.ViewGroup group=(android.view.ViewGroup)view;for(int i=0;i<group.getChildCount();i++){View found=find(group.getChildAt(i),label);if(found!=null)return found;}}return null;}
 @Test public void builderSwitchesToSingleMoneyFigureInSmallSize()throws Exception{
  try(ActivityScenario<CustomWidgetConfigureActivity> screen=ActivityScenario.launch(CustomWidgetConfigureActivity.class)){screen.onActivity(a->{View root=a.findViewById(android.R.id.content);((Spinner)find(root,"Widget type")).setSelection(1);});InstrumentationRegistry.getInstrumentation().waitForIdleSync();screen.onActivity(a->{View root=a.findViewById(android.R.id.content);assertEquals(8,((Spinner)find(root,"Widget size")).getSelectedItemPosition());((Spinner)find(root,"Money figures")).setSelection(2);});InstrumentationRegistry.getInstrumentation().waitForIdleSync();screen.onActivity(a->{View root=a.findViewById(android.R.id.content);assertEquals(1,((Spinner)find(root,"Widget type")).getSelectedItemPosition());assertEquals(1,((Spinner)find(root,"Widget size")).getSelectedItemPosition());assertFalse(find(root,"Widget size").isEnabled());assertEquals(2,((Spinner)find(root,"Money figures")).getSelectedItemPosition());});}
 }
 private String js(ActivityScenario<MainActivity> screen,String code)throws Exception{java.util.concurrent.CountDownLatch done=new java.util.concurrent.CountDownLatch(1);java.util.concurrent.atomic.AtomicReference<String> value=new java.util.concurrent.atomic.AtomicReference<>("");screen.onActivity(a->a.getBridge().getWebView().evaluateJavascript(code,v->{value.set(v);done.countDown();}));assertTrue(done.await(5,java.util.concurrent.TimeUnit.SECONDS));return value.get();}
 private void waitFor(ActivityScenario<MainActivity> screen,String code)throws Exception{for(int i=0;i<150;i++){if("true".equals(js(screen,code)))return;Thread.sleep(100);}fail(code);}
 @Test public void shortcutsOpenTheirOwnFormsAndMoneyPeriod()throws Exception{
  ActivityScenario<MainActivity> screen=ActivityScenario.launch(MainActivity.class);try{waitFor(screen,"Boolean(document.querySelector('.mobile-app'))");for(String action:new String[]{"note","transaction","goal","plan","money"}){
   Intent command=CustomWidgetProvider.launch(c,1900001,action).putExtra("moneyPeriod","month");screen.onActivity(a->a.startActivity(command));
   if("note".equals(action))waitFor(screen,"Boolean(document.querySelector('dialog[open] .notes-editor'))");
   else if("transaction".equals(action))waitFor(screen,"Boolean(document.querySelector('dialog[open] input[name=amount]'))");
   else if("goal".equals(action))waitFor(screen,"Boolean(document.querySelector('dialog[open] input[name=title]'))");
   else if("plan".equals(action))waitFor(screen,"Boolean(document.querySelector('dialog[open] .all-day-field'))");
   else waitFor(screen,"document.querySelector('[aria-label=\"Money period\"]')?.value==='month'");
   if(!"money".equals(action)){js(screen,"document.querySelector('dialog[open] button[aria-label=\"Back to diary\"]').click()");waitFor(screen,"!document.querySelector('dialog[open]')");}
  }}finally{screen.onActivity(Activity::finishAndRemoveTask);}
 }
}
