package com.maikal.daily;
import android.app.NotificationManager;
import android.content.Context;

/** Remove the retired payment detector's device-only state on upgrade. */
final class LegacyPaymentCleanup {
    static void run(Context c) {
        c.deleteSharedPreferences("payment_detection");
        NotificationManager manager=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
        for(android.service.notification.StatusBarNotification n:manager.getActiveNotifications())
            if(n.getId()==9401)manager.cancel(n.getTag(),n.getId());
        manager.deleteNotificationChannel("maikal_payments");
    }
}
