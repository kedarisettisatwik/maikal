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
    private LinearLayout root;private FrameLayout frame;private LocalTime draftTime=LocalTime.now().plusMinutes(2).withSecond(0).withNano(0);

    private int ink(){return 0xff253439;}
    private int accent(){return 0xff25704d;}
    private android.graphics.drawable.GradientDrawable background(int color,int radius){android.graphics.drawable.GradientDrawable d=new android.graphics.drawable.GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private int dp(int value){return Math.round(value*getResources().getDisplayMetrics().density);}
    private TextView text(String value,int size){TextView t=new TextView(this);t.setText(value);t.setTextSize(size);t.setTextColor(ink());t.setPadding(0,dp(7),0,dp(7));return t;}
    private Button button(String value,LinearLayout parent,Runnable action){Button b=new Button(this);b.setText(value);b.setTextColor(accent());b.setAllCaps(false);b.setBackgroundColor(android.graphics.Color.TRANSPARENT);if(value.startsWith("‹")){b.setGravity(Gravity.LEFT|Gravity.CENTER_VERTICAL);parent.addView(b,new LinearLayout.LayoutParams(-2,-2));}else parent.addView(b);b.setOnClickListener(v->action.run());return b;}
    private void page(String title){frame=new FrameLayout(this);frame.setBackgroundColor(0xffffffff);ScrollView scroll=new ScrollView(this);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setPadding(dp(22),dp(18),dp(22),dp(110));scroll.addView(root);frame.addView(scroll);frame.setOnApplyWindowInsetsListener((v,insets)->{v.setPadding(insets.getSystemWindowInsetLeft(),insets.getSystemWindowInsetTop(),insets.getSystemWindowInsetRight(),insets.getSystemWindowInsetBottom());return insets;});setContentView(frame);button("‹ Back",root,title.equals("Alarms")?this::finish:this::showList);root.addView(text(title,27));}
    private TimePicker wheel(LocalTime time){TimePicker picker=(TimePicker)getLayoutInflater().inflate(R.layout.alarm_time_picker,root,false);picker.setIs24HourView(false);picker.setHour(time.getHour());picker.setMinute(time.getMinute());picker.setBackground(background(0xfff1f7f3,14));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(190));p.setMargins(0,dp(10),0,dp(20));root.addView(picker,p);return picker;}
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
        page("Alarms");root.addView(text("Set your alarm",16));TimePicker preview=wheel(draftTime);preview.setOnTimeChangedListener((view,h,m)->draftTime=LocalTime.of(h,m));root.addView(text("Your alarms",18));
        Button add=new Button(this);add.setText("+");add.setContentDescription("Add alarm");add.setTextSize(32);add.setTextColor(android.graphics.Color.WHITE);add.setBackground(background(0xff44725c,40));add.setElevation(dp(8));FrameLayout.LayoutParams addPosition=new FrameLayout.LayoutParams(dp(64),dp(64),Gravity.BOTTOM|Gravity.RIGHT);addPosition.setMargins(0,0,dp(24),dp(24));frame.addView(add,addPosition);add.setOnClickListener(v->edit(null));
        try{JSONArray records=ClockAlarms.all(this);if(records.length()==0)root.addView(text("No alarms yet.",16));
            for(int i=0;i<records.length();i++){JSONObject r=records.getJSONObject(i);String id=r.getString("id");LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(dp(14),dp(8),dp(14),dp(8));box.setBackground(background(0xfff1f7f3,12));box.setElevation(dp(2));LinearLayout.LayoutParams card=new LinearLayout.LayoutParams(-1,-2);card.setMargins(0,dp(5),0,dp(8));root.addView(box,card);
                TextView name=text(r.getString("title"),13);box.addView(name);LinearLayout timeRow=new LinearLayout(this);timeRow.setGravity(Gravity.CENTER_VERTICAL);box.addView(timeRow);LocalTime value=LocalTime.parse(r.getString("time"));TextView clock=text(value.format(java.time.format.DateTimeFormatter.ofPattern("hh:mm"))+"  "+(value.getHour()<12?"AM":"PM"),27);timeRow.addView(clock,new LinearLayout.LayoutParams(0,-2,1));
                Switch enabled=new Switch(this);enabled.setContentDescription("Enable "+r.getString("title"));enabled.setChecked(r.optBoolean("enabled"));enabled.setThumbTintList(new android.content.res.ColorStateList(new int[][]{new int[]{android.R.attr.state_checked},new int[]{}},new int[]{accent(),0xffb9b8af}));timeRow.addView(enabled);enabled.setOnCheckedChangeListener((v,on)->{try{r.put("enabled",on);r.put("snoozedUntil",0);ClockAlarms.save(this,r);if(!on)startService(new Intent(this,ClockAlarmService.class).setAction("STOP").putExtra("id",id));}catch(Exception e){enabled.setOnCheckedChangeListener(null);enabled.setChecked(!on);error(e);showList();}});
                TextView recurrence=text(describe(r),12);recurrence.setAlpha(.7f);box.addView(recurrence);clock.setOnClickListener(v->{if(r.optBoolean("diaryLinked"))editLinked(r);else edit(r);});name.setOnClickListener(v->{if(r.optBoolean("diaryLinked"))editLinked(r);else edit(r);});
                LinearLayout actions=new LinearLayout(this);box.addView(actions);
                if(r.optBoolean("diaryLinked")){box.addView(text("Linked "+r.optString("sourceKind","entry")+" · Edit its alarm times in the diary",12));button("Edit linked "+r.optString("sourceKind","entry"),actions,()->editLinked(r));}
                else{button("Edit",actions,()->edit(r));button("Delete",actions,()->new AlertDialog.Builder(this).setMessage("Delete this alarm?").setNegativeButton("Cancel",null).setPositiveButton("Delete",(d,w)->{ClockAlarms.delete(this,id);showList();}).show());}
                if(r.optLong("snoozedUntil")>System.currentTimeMillis())box.addView(text("Snoozed until "+Instant.ofEpochMilli(r.optLong("snoozedUntil")).atZone(ZoneId.systemDefault()).toLocalTime().withSecond(0).withNano(0),14));
            }
        }catch(Exception e){error(e);}button("Alarm permissions / lock-screen access",root,this::permissions);TextView note=text("Snooze · 5 minutes. A notification arrives 10 minutes before each alarm. Dismiss hides that notice only; your alarm still rings.",12);note.setAlpha(.7f);root.addView(note);
    }
    private String describe(JSONObject r)throws Exception{JSONObject s=r.getJSONObject("schedule");if(r.optBoolean("oneTime"))return "One time · "+s.getJSONArray("dates").getString(0);switch(s.getString("type")){case"everyday":return "Every day";case"range":return s.getString("from")+" – "+s.getString("to");case"days":String[] names={"Sun","Mon","Tue","Wed","Thu","Fri","Sat"};ArrayList<String> chosen=new ArrayList<>();JSONArray days=s.getJSONArray("days");for(int i=0;i<days.length();i++)chosen.add(names[days.getInt(i)]);return String.join(", ",chosen);default:return "Dates · "+s.getJSONArray("dates").toString();}}
    private void editLinked(JSONObject alarm){startActivity(new Intent(this,MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP).putExtra("diaryRecordId",alarm.optString("sourceId")).putExtra("diaryUid",alarm.optString("sourceUid")));}
    private void edit(JSONObject existing){
        try{
            page(existing==null?"New alarm":"Edit alarm");root.addView(text("Alarm name",14));EditText title=new EditText(this);title.setContentDescription("Alarm name");title.setTextColor(ink());title.setSingleLine();title.setHint("e.g. Wake up");title.setFilters(new android.text.InputFilter[]{new android.text.InputFilter.LengthFilter(150)});title.setText(existing==null?"":existing.optString("title"));root.addView(title);
            LocalTime initial=existing==null?draftTime:LocalTime.parse(existing.getString("time"));int[] time={initial.getHour(),initial.getMinute()};TimePicker timePicker=wheel(initial);timePicker.setOnTimeChangedListener((view,h,m)->{time[0]=h;time[1]=m;});
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
