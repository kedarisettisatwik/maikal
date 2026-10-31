package com.maikal.daily;
import android.app.Notification;
import android.service.notification.*;

public class PaymentNotificationListener extends NotificationListenerService {
    @Override public void onNotificationPosted(StatusBarNotification posted){
        if(posted==null||!PaymentNotifications.selected(this,posted.getPackageName()))return;
        try {
        Notification n=posted.getNotification();
        if(n==null||n.extras==null)return;
        if((n.flags&Notification.FLAG_GROUP_SUMMARY)!=0)return;
        CharSequence text=n.extras.getCharSequence(Notification.EXTRA_BIG_TEXT);
        if(text==null||text.length()==0)text=n.extras.getCharSequence(Notification.EXTRA_TEXT);
        if(text==null||text.length()==0)return;
        PaymentNotifications.offer(this,posted.getPackageName(),posted.getKey(),text.toString(),posted.getPostTime());}catch(Exception ignored){/* Do not log notification text. */}
    }
}
