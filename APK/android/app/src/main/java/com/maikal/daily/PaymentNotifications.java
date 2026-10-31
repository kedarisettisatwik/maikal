package com.maikal.daily;

import android.app.*;
import android.content.*;
import android.graphics.BitmapFactory;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import org.json.*;
import java.time.*;
import java.util.*;

final class PaymentNotifications {
    static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences("payment_detection",Context.MODE_PRIVATE);}
    static boolean selected(Context c,String pkg){return prefs(c).getBoolean("enabled",false)&&prefs(c).getStringSet("apps",Collections.emptySet()).contains(pkg)&&!pkg.equals(c.getPackageName());}
    static String hash(String value)throws Exception{
        byte[] bytes=java.security.MessageDigest.getInstance("SHA-256").digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8));StringBuilder s=new StringBuilder();for(byte b:bytes)s.append(String.format("%02x",b));return s.toString();
    }
    static synchronized boolean offer(Context c,String pkg,String key,String text,long posted)throws Exception{
        if(!selected(c,pkg)||posted<System.currentTimeMillis()-24*60*60*1000L)return false;
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        if(!manager.areNotificationsEnabled())return false;
        PaymentParser.Result payment=PaymentParser.parse(text,Instant.ofEpochMilli(posted).atZone(ZoneId.systemDefault()).toLocalDate());
        if(payment==null)return false;
        String fingerprint=hash((payment.reference.isEmpty()?pkg+"|"+key:payment.reference)+"|"+payment.kind+"|"+payment.amount+"|"+payment.date);
        JSONObject seen=new JSONObject(prefs(c).getString("seen","{}")),drafts=new JSONObject(prefs(c).getString("drafts","{}"));long now=System.currentTimeMillis();
        for(String id:new ArrayList<>(keys(seen)))if(now-seen.optLong(id)>7*86400000L)seen.remove(id);
        for(String id:new ArrayList<>(keys(drafts)))if(now-drafts.optJSONObject(id).optLong("created")>2*86400000L)drafts.remove(id);
        if(seen.has(fingerprint))return false;
        if(seen.length()>500||drafts.length()>100)return false;
        String uid=NativeDiaryStore.uid(c),id=UUID.randomUUID().toString();
        JSONObject draft=new JSONObject().put("kind",payment.kind).put("amount",payment.amount).put("date",payment.date).put("uid",uid).put("created",now);
        drafts.put(id,draft);seen.put(fingerprint,now);
        manager.createNotificationChannel(new NotificationChannel("maikal_payments","Payment suggestions",NotificationManager.IMPORTANCE_DEFAULT));
        Intent intent=new Intent(c,MainActivity.class).setData(Uri.parse("maikal://payment/"+id)).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("paymentDraftId",id);
        PendingIntent open=PendingIntent.getActivity(c,0,intent,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        String amount=java.text.NumberFormat.getCurrencyInstance(new Locale("en","IN")).format(payment.amount/100.0);
        Notification notification=new NotificationCompat.Builder(c,"maikal_payments").setSmallIcon(R.drawable.ic_stat_maikal).setLargeIcon(BitmapFactory.decodeResource(c.getResources(),R.drawable.maikal_logo))
            .setContentTitle("Possible "+payment.kind+" of "+amount).setContentText("Review and add? Choose a category before saving.").setContentIntent(open).setAutoCancel(true)
            .setVisibility(NotificationCompat.VISIBILITY_PRIVATE).setTimeoutAfter(2*86400000L).build();
        prefs(c).edit().putString("seen",seen.toString()).putString("drafts",drafts.toString()).commit();
        manager.notify(id,9401,notification);return true;
    }
    static List<String> keys(JSONObject o){List<String> keys=new ArrayList<>();o.keys().forEachRemaining(keys::add);return keys;}
    static synchronized JSONObject draft(Context c,String id)throws Exception{
        if(!prefs(c).getBoolean("enabled",false))return null;
        JSONObject all=new JSONObject(prefs(c).getString("drafts","{}")),d=all.optJSONObject(id);
        if(d!=null&&System.currentTimeMillis()-d.optLong("created")<2*86400000L)return d;
        if(d!=null)acknowledge(c,id);return null;
    }
    static synchronized void acknowledge(Context c,String id)throws Exception{
        JSONObject all=new JSONObject(prefs(c).getString("drafts","{}"));all.remove(id);prefs(c).edit().putString("drafts",all.toString()).commit();
        ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).cancel(id,9401);
    }
    static synchronized void disable(Context c){
        prefs(c).edit().putBoolean("enabled",false).remove("drafts").apply();
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())if(n.getId()==9401)manager.cancel(n.getTag(),n.getId());
    }
}
