package com.maikal.daily;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.*;
import android.provider.Settings;
import android.view.*;
import android.widget.*;
import org.json.*;
import java.time.*;
import java.util.*;

/** Native alarm editor, available in both APKs even without Firebase or WebView connectivity. */
public class AlarmsActivity extends Activity {
    private LinearLayout root;
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private TextView text(String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(0xff253439);t.setPadding(0,dp(8),0,dp(8));return t;}
    private Button button(String value,LinearLayout parent,Runnable action){Button b=new Button(this);b.setText(value);parent.addView(b);b.setOnClickListener(v->action.run());return b;}
    private void page(String title){ScrollView scroll=new ScrollView(this);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(20),dp(24),dp(20),dp(24));root.setBackgroundColor(0xfffaf8ef);scroll.addView(root);setContentView(scroll);root.addView(text(title,28));}
    private void error(Exception e){new AlertDialog.Builder(this).setTitle("Check your alarm").setMessage(e.getMessage()).setPositiveButton("OK",null).show();}
    @Override public void onCreate(Bundle state){super.onCreate(state);showList();}
    @Override protected void onResume(){super.onResume();ClockAlarms.restore(this);}
    private void permissions(){
        if(Build.VERSION.SDK_INT>=33&&checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED){requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},33);return;}
        if(!ClockAlarms.canSchedule(this)){startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,Uri.parse("package:"+getPackageName())));return;}
        if(Build.VERSION.SDK_INT>=34&&!((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).canUseFullScreenIntent()){startActivity(new Intent(Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,Uri.parse("package:"+getPackageName())));return;}
        Toast.makeText(this,"Alarm permissions are ready",Toast.LENGTH_SHORT).show();
    }
    private void showList(){
        page("Alarms");root.addView(text("Real ringing alarms · Snooze repeats after 5 minutes. Alarms are saved on this device, separately from diary notifications.",14));
        button("Alarm permissions / lock-screen access",root,this::permissions);
        root.addView(text("Android needs Alarms & reminders permission for exact timing. Allow full-screen alarms to show Snooze and Stop on the lock screen. Force-stop or switching off the phone prevents alarms. Ringing automatically stops after 10 minutes.",12));
        button("+ Add alarm",root,()->edit(null));
        try{JSONArray records=ClockAlarms.all(this);if(records.length()==0)root.addView(text("No alarms yet.",16));
            for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);String id=r.getString("id");LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(0,dp(16),0,dp(16));root.addView(box);
                box.addView(text(r.getString("time")+" · "+r.getString("title"),22));box.addView(text(describe(r),14));
                Switch enabled=new Switch(this);enabled.setText("Enabled");enabled.setChecked(r.optBoolean("enabled"));box.addView(enabled);enabled.setOnCheckedChangeListener((v,on)->{try{r.put("enabled",on);r.put("snoozedUntil",0);ClockAlarms.save(this,r);if(!on)startService(new Intent(this,ClockAlarmService.class).setAction("STOP").putExtra("id",id));}catch(Exception e){enabled.setOnCheckedChangeListener(null);enabled.setChecked(!on);error(e);showList();}});
                LinearLayout actions=new LinearLayout(this);box.addView(actions);button("Edit",actions,()->edit(r));button("Delete",actions,()->new AlertDialog.Builder(this).setMessage("Delete this alarm?").setNegativeButton("Cancel",null).setPositiveButton("Delete",(d,w)->{ClockAlarms.delete(this,id);showList();}).show());
                if(r.optLong("snoozedUntil")>System.currentTimeMillis())box.addView(text("Snoozed until "+Instant.ofEpochMilli(r.optLong("snoozedUntil")).atZone(ZoneId.systemDefault()).toLocalTime().withSecond(0).withNano(0),14));
            }
        }catch(Exception e){error(e);}button("Back to diary",root,this::finish);
    }
    private String describe(JSONObject r)throws Exception{JSONObject s=r.getJSONObject("schedule");if(r.optBoolean("oneTime"))return "One time · "+s.getJSONArray("dates").getString(0);switch(s.getString("type")){case"everyday":return "Every day";case"days":String[] names={"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};ArrayList<String> chosen=new ArrayList<>();JSONArray days=s.getJSONArray("days");for(int i=0;i<days.length();i++)chosen.add(names[days.getInt(i)]);return String.join(", ",chosen);default:return "Dates · "+s.getJSONArray("dates").toString();}}
    private void edit(JSONObject existing){
        try{
            page(existing==null?"New alarm":"Edit alarm");root.addView(text("Alarm name",14));EditText title=new EditText(this);title.setSingleLine();title.setHint("e.g. Wake up");title.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(150)});title.setText(existing==null?"":existing.optString("title"));root.addView(title);
            LocalTime initial=existing==null?LocalTime.now().plusMinutes(2).withSecond(0).withNano(0):LocalTime.parse(existing.getString("time"));int[] time={initial.getHour(),initial.getMinute()};
            Button timeButton=button(String.format(Locale.US,"%02d:%02d",time[0],time[1]),root,()->{});timeButton.setTextSize(28);timeButton.setOnClickListener(v->new TimePickerDialog(this,(view,h,m)->{time[0]=h;time[1]=m;timeButton.setText(String.format(Locale.US,"%02d:%02d",h,m));},time[0],time[1],true).show());
            root.addView(text("Repeat",14));Spinner repeat=new Spinner(this);repeat.setAdapter(new ArrayAdapter<>(this,android.R.layout.simple_spinner_dropdown_item,new String[]{"Every day","Particular weekdays","One time","Particular dates"}));root.addView(repeat);
            LinearLayout daysBox=new LinearLayout(this);daysBox.setOrientation(LinearLayout.VERTICAL);root.addView(daysBox);CheckBox[] checks=new CheckBox[7];String[] weekdays={"Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"};for(int i=0;i<7;i++){checks[i]=new CheckBox(this);checks[i].setText(weekdays[i]);daysBox.addView(checks[i]);}
            LinearLayout datesBox=new LinearLayout(this);datesBox.setOrientation(LinearLayout.VERTICAL);root.addView(datesBox);datesBox.addView(text("Dates (YYYY-MM-DD, separated by commas)",13));EditText dates=new EditText(this);dates.setHint("2026-10-30, 2026-11-02");dates.setText(LocalDate.now().toString());datesBox.addView(dates);
            button("Choose a date",datesBox,()->{LocalDate today=LocalDate.now();new DatePickerDialog(this,(view,y,m,d)->{String date=LocalDate.of(y,m+1,d).toString();if(repeat.getSelectedItemPosition()==2)dates.setText(date);else{String old=dates.getText().toString().trim();dates.setText(old.isEmpty()?date:old+", "+date);}},today.getYear(),today.getMonthValue()-1,today.getDayOfMonth()).show();});
            int selection=0;if(existing!=null){JSONObject s=existing.getJSONObject("schedule");selection=existing.optBoolean("oneTime")?2:"days".equals(s.getString("type"))?1:"dates".equals(s.getString("type"))?3:0;JSONArray chosen=s.optJSONArray("days");if(chosen!=null)for(int i=0;i<chosen.length();i++)checks[chosen.getInt(i)].setChecked(true);JSONArray ds=s.optJSONArray("dates");if(ds!=null){ArrayList<String> list=new ArrayList<>();for(int i=0;i<ds.length();i++)list.add(ds.getString(i));dates.setText(String.join(", ",list));}}
            repeat.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(){public void onNothingSelected(android.widget.AdapterView<?> p){}public void onItemSelected(android.widget.AdapterView<?> p,android.view.View v,int pos,long id){daysBox.setVisibility(pos==1?View.VISIBLE:View.GONE);datesBox.setVisibility(pos>=2?View.VISIBLE:View.GONE);}});repeat.setSelection(selection);
            button("Save alarm",root,()->{try{int mode=repeat.getSelectedItemPosition();JSONObject s=new JSONObject();s.put("type",mode==0?"everyday":mode==1?"days":"dates");if(mode==1){JSONArray d=new JSONArray();for(int i=0;i<7;i++)if(checks[i].isChecked())d.put(i);s.put("days",d);}if(mode>=2){LinkedHashSet<String> unique=new LinkedHashSet<>();for(String date:dates.getText().toString().split(","))if(!date.trim().isEmpty())unique.add(LocalDate.parse(date.trim()).toString());if(mode==2&&unique.size()!=1)throw new IllegalArgumentException("Choose exactly one date for a one-time alarm");s.put("dates",new JSONArray(unique));}
                JSONObject record=new JSONObject();record.put("id",existing==null?UUID.randomUUID().toString():existing.getString("id"));record.put("title",title.getText().toString().trim());record.put("time",String.format(Locale.US,"%02d:%02d",time[0],time[1]));record.put("schedule",s);record.put("oneTime",mode==2);record.put("enabled",true);record.put("snoozedUntil",0);ClockAlarms.save(this,record);Toast.makeText(this,"Alarm saved",Toast.LENGTH_SHORT).show();showList();
            }catch(Exception e){error(e);}});button("Cancel",root,this::showList);
        }catch(Exception e){error(e);}
    }
}
