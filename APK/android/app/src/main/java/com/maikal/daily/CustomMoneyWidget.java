package com.maikal.daily;
import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.*;
import android.os.Bundle;
import android.view.View;
import android.widget.RemoteViews;
import org.json.*;
import java.time.LocalDate;

final class CustomMoneyWidget {
 static long[] totals(Context c,String period)throws Exception{
  long income=0,expense=0;LocalDate today=LocalDate.now();String day=today.toString(),month=day.substring(0,7);JSONArray records=NativeDiaryStore.records(c);
  for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);if(r.optBoolean("deleted")||!"transaction".equals(r.optString("type")))continue;String date=r.optString("date");if("month".equals(period)?!date.startsWith(month):!day.equals(date))continue;long amount=r.optLong("amount");if(amount<0)continue;if("income".equals(r.optString("kind")))income=Math.addExact(income,amount);else if("expense".equals(r.optString("kind")))expense=Math.addExact(expense,amount);}
  return new long[]{income,expense,Math.subtractExact(income,expense)};
 }
 static RemoteViews views(Context c,int id,JSONObject plan,Bundle options)throws Exception{
  String view=plan.getString("moneyView"),period=view.startsWith("month")?"month":"day",size=plan.getString("size");boolean summary=view.endsWith("summary"),horizontal=summary&&size.charAt(0)>size.charAt(2);
  RemoteViews root=new RemoteViews(c.getPackageName(),horizontal?R.layout.widget_custom_money_horizontal:R.layout.widget_custom_money);boolean dark=CustomWidgetProvider.dark(c,plan);int ink=dark?0xffe9e7df:0xff253439,green=dark?0xffb3dfc0:0xff246841;
  root.setInt(R.id.custom_money_root,"setBackgroundResource","transparent".equals(plan.optString("appearance"))?android.R.color.transparent:dark?R.drawable.widget_paper_dark:R.drawable.widget_paper);
  root.setTextViewText(R.id.custom_money_title,"month".equals(period)?"This month":"Today");root.setTextColor(R.id.custom_money_title,ink);
  Intent open=CustomWidgetProvider.launch(c,id,"money").putExtra("moneyPeriod",period);root.setOnClickPendingIntent(R.id.custom_money_root,PendingIntent.getActivity(c,0,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));root.removeAllViews(R.id.custom_money_values);
  if(!NativeDiaryStore.uid(c).equals(plan.optString("uid"))){root.setTextViewText(R.id.custom_money_title,"Tap to update this widget’s diary");Intent edit=new Intent(c,CustomWidgetConfigureActivity.class).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID,id).setData(android.net.Uri.parse("mantra-widget://edit-money/"+id)).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);root.setOnClickPendingIntent(R.id.custom_money_root,PendingIntent.getActivity(c,id,edit,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));return root;}
  long[] totals=totals(c,period);String[] labels={"Income","Expenses","Savings"};int[] selected=summary?new int[]{0,1,2}:new int[]{view.endsWith("income")?0:view.endsWith("expense")?1:2};
  boolean compact=options.getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT,100)<64;if(compact){root.setViewPadding(R.id.custom_money_root,3,3,3,3);if(summary)root.setTextViewTextSize(R.id.custom_money_title,android.util.TypedValue.COMPLEX_UNIT_SP,8);else{root.setTextViewText(R.id.custom_money_title,("month".equals(period)?"Month":"Today")+"\n"+labels[selected[0]]);root.setTextViewTextSize(R.id.custom_money_title,android.util.TypedValue.COMPLEX_UNIT_SP,9);}}
  java.text.NumberFormat money=java.text.NumberFormat.getCurrencyInstance(new java.util.Locale("en","IN"));
  for(int index:selected){RemoteViews value=new RemoteViews(c.getPackageName(),selected.length==1?R.layout.widget_custom_money_single:horizontal?R.layout.widget_custom_money_column:R.layout.widget_custom_money_value);value.setTextViewText(R.id.custom_money_label,labels[index]);if(compact&&!summary)value.setViewVisibility(R.id.custom_money_label,View.GONE);value.setTextColor(R.id.custom_money_label,ink);value.setTextViewText(R.id.custom_money_amount,money.format(totals[index]/100.0));value.setTextColor(R.id.custom_money_amount,index==1||totals[index]<0?(dark?0xffffb18b:0xffa8490f):green);root.addView(R.id.custom_money_values,value);}
  root.setContentDescription(R.id.custom_money_root,("month".equals(period)?"This month’s":"Today’s")+" money. Tap to open transactions.");return root;
 }
}
