package com.maikal.daily;
import android.app.*;
import android.appwidget.*;
import android.content.*;
import android.graphics.*;
import android.graphics.drawable.Drawable;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;
public class ShortcutWidgets extends AppWidgetProvider {
 public static class AddNote extends ShortcutWidgets{} public static class AddTransaction extends ShortcutWidgets{} public static class BothHorizontal extends ShortcutWidgets{} public static class BothVertical extends ShortcutWidgets{}
 static final Class<?>[] TYPES={AddNote.class,AddTransaction.class,BothHorizontal.class,BothVertical.class};
 static PendingIntent action(Context c,int widget,String kind){return PendingIntent.getActivity(c,widget,new Intent(c,MainActivity.class).setData(Uri.parse("mantra://shortcut/"+widget+"/"+kind)).putExtra("quickAction",kind).addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP),PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
 static Bitmap icon(Context c,int resource){Drawable d=c.getDrawable(resource).mutate();d.setTint(MantraTheme.dark(c)?0xff94c5a5:0xff25704d);Bitmap b=Bitmap.createBitmap(96,96,Bitmap.Config.ARGB_8888);d.setBounds(0,0,96,96);d.draw(new Canvas(b));return b;}
 static void update(Context c,int id){AppWidgetManager manager=AppWidgetManager.getInstance(c);AppWidgetProviderInfo info=manager.getAppWidgetInfo(id);if(info==null)return;String type=info.provider.getClassName();boolean single=type.endsWith("AddNote")||type.endsWith("AddTransaction"),vertical=type.endsWith("BothVertical");RemoteViews v=new RemoteViews(c.getPackageName(),single?R.layout.widget_shortcut_single:vertical?R.layout.widget_shortcut_vertical:R.layout.widget_shortcut_horizontal);v.setInt(R.id.shortcut_root,"setBackgroundResource",MantraTheme.dark(c)?R.drawable.widget_shortcut_dark:R.drawable.widget_shortcut_light);if(single){String action=type.endsWith("AddNote")?"note":"transaction";v.setImageViewBitmap(R.id.shortcut_first,icon(c,"note".equals(action)?R.drawable.custom_note:R.drawable.custom_transaction));v.setContentDescription(R.id.shortcut_first,"note".equals(action)?"Add note":"Add transaction");v.setOnClickPendingIntent(R.id.shortcut_first,action(c,id,action));}else{v.setImageViewBitmap(R.id.shortcut_first,icon(c,R.drawable.custom_note));v.setImageViewBitmap(R.id.shortcut_second,icon(c,R.drawable.custom_transaction));v.setOnClickPendingIntent(R.id.shortcut_first,action(c,id,"note"));v.setOnClickPendingIntent(R.id.shortcut_second,action(c,id,"transaction"));}manager.updateAppWidget(id,v);}
 static void refresh(Context c){AppWidgetManager m=AppWidgetManager.getInstance(c);for(Class<?> t:TYPES)for(int id:m.getAppWidgetIds(new ComponentName(c,t)))update(c,id);}
 @Override public void onUpdate(Context c,AppWidgetManager m,int[] ids){for(int id:ids)update(c,id);}
 @Override public void onAppWidgetOptionsChanged(Context c,AppWidgetManager m,int id,Bundle options){update(c,id);}
 @Override public void onReceive(Context c,Intent i){super.onReceive(c,i);if(Intent.ACTION_MY_PACKAGE_REPLACED.equals(i.getAction()))refresh(c);}
}
