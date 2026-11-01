package com.maikal.daily;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.graphics.*;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;

public class CustomWidgetProvider extends AppWidgetProvider {
 public static class Size11 extends CustomWidgetProvider{} public static class Size12 extends CustomWidgetProvider{}
 public static class Size13 extends CustomWidgetProvider{} public static class Size14 extends CustomWidgetProvider{}
 public static class Size21 extends CustomWidgetProvider{} public static class Size31 extends CustomWidgetProvider{}
 public static class Size41 extends CustomWidgetProvider{} public static class Size22 extends CustomWidgetProvider{}
 public static class Size33 extends CustomWidgetProvider{}
 static final Class<?>[] TYPES={Size11.class,Size12.class,Size13.class,Size14.class,Size21.class,Size31.class,Size41.class,Size22.class,Size33.class};
 static ComponentName component(Context c,String size){for(int i=0;i<CustomWidgetStore.SIZES.length;i++)if(CustomWidgetStore.SIZES[i].equals(size))return new ComponentName(c,TYPES[i]);throw new IllegalArgumentException("Invalid size");}
 static boolean owns(Context c,int id){AppWidgetProviderInfo info=AppWidgetManager.getInstance(c).getAppWidgetInfo(id);if(info==null)return false;for(Class<?> type:TYPES)if(new ComponentName(c,type).equals(info.provider))return true;return false;}
 static String size(Context c,int id){AppWidgetProviderInfo info=AppWidgetManager.getInstance(c).getAppWidgetInfo(id);for(int i=0;i<TYPES.length;i++)if(info!=null&&new ComponentName(c,TYPES[i]).equals(info.provider))return CustomWidgetStore.SIZES[i];return "2x2";}
 static Intent launch(Context c,int id,String action){return new Intent(c,MainActivity.class).setAction("com.maikal.daily.CUSTOM_SHORTCUT").setData(Uri.parse("mantra-widget://quick/"+id+"/"+action)).putExtra("quickAction",action).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);}
 static boolean dark(Context c,JSONObject plan){String theme=plan.optString("appearance","app");return "dark".equals(theme)||(!"light".equals(theme)&&MantraTheme.dark(c));}
 static Bitmap icon(Context c,String action,int color){int resource="note".equals(action)?R.drawable.custom_note:"transaction".equals(action)?R.drawable.custom_transaction:"goal".equals(action)?R.drawable.custom_goal:R.drawable.custom_plan;Drawable d=c.getDrawable(resource).mutate();d.setTint(color);Bitmap b=Bitmap.createBitmap(64,64,Bitmap.Config.ARGB_8888);d.setBounds(0,0,64,64);d.draw(new Canvas(b));return b;}
 static RemoteViews views(Context c,int id,JSONObject plan,Bundle options)throws Exception{
  RemoteViews root=new RemoteViews(c.getPackageName(),R.layout.widget_custom);
  Intent edit=new Intent(c,CustomWidgetConfigureActivity.class).setData(Uri.parse("mantra-widget://edit/"+id)).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
  PendingIntent configure=PendingIntent.getActivity(c,id,edit,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  root.setOnClickPendingIntent(R.id.custom_edit,configure);
  if(plan==null){root.setTextViewText(R.id.custom_name,"Set up widget");root.setOnClickPendingIntent(R.id.custom_root,configure);root.setViewVisibility(R.id.custom_header,View.VISIBLE);return root;}
  if("money".equals(plan.optString("type")))return CustomMoneyWidget.views(c,id,plan,options);
  boolean dark=false,transparent=false;int ink=dark?0xffe9e7df:0xff253439,accent=dark?0xffb3dfc0:0xff246841;
  root.setInt(R.id.custom_root,"setBackgroundResource",R.drawable.widget_shortcuts_white);
  root.setTextViewText(R.id.custom_name,plan.getString("name"));root.setTextColor(R.id.custom_name,ink);root.setTextColor(R.id.custom_edit,accent);
  String size=plan.getString("size");int preferredColumns=Integer.parseInt(size.substring(0,1)),preferredRows=Integer.parseInt(size.substring(2));
  JSONArray actions=plan.getJSONArray("actions");int columns=Math.min(actions.length(),"3x3".equals(size)?2:preferredColumns),rows=(actions.length()+columns-1)/columns;
  int height=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,preferredRows*70),width=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH,preferredColumns*70);
  if(android.os.Build.VERSION.SDK_INT>=31)root.setViewLayoutWidth(R.id.custom_root,Math.max(40,Math.min(width-8,columns*52+16)),android.util.TypedValue.COMPLEX_UNIT_DIP);
  boolean header=height>=140&&width>=100;root.setViewVisibility(R.id.custom_header,View.GONE);root.removeAllViews(R.id.custom_rows);
  boolean compact=(height-(header?28:0)-12)/rows<60||width/columns<55;
  for(int row=0;row<rows;row++){RemoteViews line=new RemoteViews(c.getPackageName(),R.layout.widget_custom_row);
   for(int col=0;col<columns;col++){int index=row*columns+col;if(index>=actions.length())break;String action=actions.getString(index);RemoteViews tile=new RemoteViews(c.getPackageName(),R.layout.widget_custom_action);
    tile.setInt(R.id.custom_action,"setBackgroundResource",android.R.color.transparent);tile.setImageViewBitmap(R.id.custom_icon,icon(c,action,accent));tile.setTextColor(R.id.custom_label,ink);tile.setTextViewText(R.id.custom_label,"plan".equals(action)?"Reminder\nMeeting":CustomWidgetStore.label(action));tile.setTextViewTextSize(R.id.custom_label,android.util.TypedValue.COMPLEX_UNIT_SP,columns>=3?9:10);tile.setViewVisibility(R.id.custom_label,View.GONE);tile.setContentDescription(R.id.custom_action,CustomWidgetStore.label(action));
    tile.setOnClickPendingIntent(R.id.custom_action,PendingIntent.getActivity(c,0,launch(c,id,action),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));line.addView(R.id.custom_columns,tile);
   }root.addView(R.id.custom_rows,line);
  }return root;
 }
 static void update(Context c,int id){try{AppWidgetManager m=AppWidgetManager.getInstance(c);m.updateAppWidget(id,views(c,id,CustomWidgetStore.widget(c,id),m.getAppWidgetOptions(id)));CustomWidgetDateReceiver.schedule(c);}catch(Exception e){android.util.Log.e("MANTRA","Custom widget update failed",e);}}
 static void refresh(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);boolean any=false;for(Class<?> type:TYPES)for(int id:m.getAppWidgetIds(new ComponentName(c,type))){any=true;update(c,id);}if(!any)CustomWidgetDateReceiver.cancel(c);}
 @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)update(c,id);}
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){update(c,id);}
 @Override public void onDeleted(Context c,int[] ids){for(int id:ids)CustomWidgetStore.delete(c,id);refresh(c);}
 @Override public void onReceive(Context c,Intent intent){super.onReceive(c,intent);if(Intent.ACTION_MY_PACKAGE_REPLACED.equals(intent.getAction())||Intent.ACTION_DATE_CHANGED.equals(intent.getAction())||Intent.ACTION_TIMEZONE_CHANGED.equals(intent.getAction())){for(int id:AppWidgetManager.getInstance(c).getAppWidgetIds(new ComponentName(c,getClass())))update(c,id);}}
}
