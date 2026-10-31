package com.maikal.daily;

import android.app.*;
import android.content.*;
import android.content.pm.*;
import android.graphics.Color;
import android.os.*;
import android.provider.Settings;
import android.widget.*;
import java.util.*;

public class PaymentSettingsActivity extends Activity {
    private LinearLayout page,apps;private TextView status;
    int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    TextView text(String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(0xff20392b);t.setPadding(0,dp(10),0,dp(10));return t;}
    Button button(String label,Runnable action){Button b=new Button(this);b.setText(label);b.setAllCaps(false);b.setOnClickListener(v->action.run());page.addView(b);return b;}
    @Override public void onCreate(Bundle state){super.onCreate(state);
        ScrollView scroll=new ScrollView(this);page=new LinearLayout(this);page.setOrientation(LinearLayout.VERTICAL);page.setPadding(dp(20),dp(16),dp(20),dp(28));page.setBackgroundColor(Color.WHITE);scroll.addView(page);setContentView(scroll);
        button("← Back",this::finish);page.addView(text("Detect payment notifications",24));
        page.addView(text("Optional · off until enabled. Android Notification access can expose all notification text. Maikal processes only new notifications from apps you select below. Selecting an SMS app allows processing its SMS notification text too.",14));
        page.addView(text("Raw text is processed on this device and never uploaded or saved. Only amount, type and date are kept locally for review. Suggestions expire after 48 hours; expired drafts and 7-day duplicate hashes are cleared on the next detection. Nothing becomes a transaction until you choose a category and save. Saved transactions follow your diary’s Local/Firebase storage rules.",13));
        Switch enabled=new Switch(this);enabled.setText("Detect selected apps");enabled.setTextColor(0xff20392b);enabled.setChecked(PaymentNotifications.prefs(this).getBoolean("enabled",false));page.addView(enabled);
        enabled.setOnCheckedChangeListener((b,on)->{if(on){PaymentNotifications.prefs(this).edit().putBoolean("enabled",true).apply();if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},48);}else PaymentNotifications.disable(this);updateStatus();});
        status=text("",13);page.addView(status);
        button("Open Android Notification access",()->startActivity(new Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)));
        button("Maikal notification settings",()->startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE,getPackageName())));
        page.addView(text("Choose bank / payment apps",18));page.addView(text("Only select apps you trust to send payment confirmations. No SMS-reading permission is requested. Detection depends on visible notification text and does not import old messages.",13));
        EditText search=new EditText(this);search.setSingleLine(true);search.setHint("Search installed apps");page.addView(search);
        apps=new LinearLayout(this);apps.setOrientation(LinearLayout.VERTICAL);page.addView(apps);
        Intent launcher=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_LAUNCHER);
        List<ResolveInfo> found=getPackageManager().queryIntentActivities(launcher,0);found.sort((a,b)->a.loadLabel(getPackageManager()).toString().compareToIgnoreCase(b.loadLabel(getPackageManager()).toString()));
        Set<String> unique=new HashSet<>();
        for(ResolveInfo info:found){String pkg=info.activityInfo.packageName;if(pkg.equals(getPackageName())||!unique.add(pkg))continue;CheckBox cb=new CheckBox(this);cb.setText(info.loadLabel(getPackageManager())+"\n"+pkg);cb.setTextSize(13);cb.setTextColor(0xff20392b);cb.setPadding(0,dp(9),0,dp(9));cb.setChecked(PaymentNotifications.prefs(this).getStringSet("apps",Collections.emptySet()).contains(pkg));cb.setOnCheckedChangeListener((v,on)->{Set<String> selected=new HashSet<>(PaymentNotifications.prefs(this).getStringSet("apps",Collections.emptySet()));if(on)selected.add(pkg);else selected.remove(pkg);PaymentNotifications.prefs(this).edit().putStringSet("apps",selected).apply();updateStatus();});apps.addView(cb);}
        search.addTextChangedListener(new android.text.TextWatcher(){public void beforeTextChanged(CharSequence s,int start,int count,int after){}public void onTextChanged(CharSequence s,int start,int before,int count){String q=s.toString().toLowerCase(Locale.ROOT);for(int i=0;i<apps.getChildCount();i++){CheckBox cb=(CheckBox)apps.getChildAt(i);cb.setVisibility(cb.getText().toString().toLowerCase(Locale.ROOT).contains(q)?android.view.View.VISIBLE:android.view.View.GONE);}}public void afterTextChanged(android.text.Editable e){}});
    }
    @Override public void onResume(){super.onResume();updateStatus();}
    private void updateStatus(){if(status==null)return;boolean access=androidx.core.app.NotificationManagerCompat.getEnabledListenerPackages(this).contains(getPackageName());boolean notifications=((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).areNotificationsEnabled();int count=PaymentNotifications.prefs(this).getStringSet("apps",Collections.emptySet()).size();status.setText("Detection: "+(PaymentNotifications.prefs(this).getBoolean("enabled",false)?"on":"off")+" · Selected apps: "+count+"\nNotification access: "+(access?"allowed":"needed")+" · Maikal notifications: "+(notifications?"allowed":"needed"));}
}
