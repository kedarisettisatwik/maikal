package com.maikal.daily;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.JSObject;
import android.content.Intent;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "DiaryAlarms")
public class DiaryAlarmsPlugin extends Plugin {
    @PluginMethod public void saveScoreCard(PluginCall call){
        java.io.File export=null;
        try{
            String image=call.getString("image","");boolean jpeg=image.startsWith("data:image/jpeg;base64,");String mime=jpeg?"image/jpeg":"image/png",extension=jpeg?".jpg":".png";if((!jpeg&&!image.startsWith("data:image/png;base64,"))||image.length()>16*1024*1024){call.reject("Could not read score card image");return;}
            java.io.File folder=new java.io.File(getContext().getCacheDir(),"score_exports");if(!folder.exists()&&!folder.mkdirs())throw new java.io.IOException("Device storage is full");
            java.io.File[] old=folder.listFiles();if(old!=null)for(java.io.File f:old)if(f.getName().matches("score-[A-Za-z0-9-]+\\.(png|jpg)")&&f.lastModified()<System.currentTimeMillis()-86400000L)f.delete();
            export=new java.io.File(folder,"score-"+java.util.UUID.randomUUID()+extension);
            byte[] bytes=android.util.Base64.decode(image.substring(image.indexOf(',')+1),android.util.Base64.DEFAULT);try(java.io.FileOutputStream out=new java.io.FileOutputStream(export)){out.write(bytes);}
            // Capacitor saves plugin-call options when the system picker stops this activity.
            // Keep the image on private disk; a multi-megabyte data URL exceeds Binder's limit.
            call.getData().remove("image");call.getData().put("exportFile",export.getName());
            Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(mime).addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE,call.getString("filename","MANTRA-score"+extension).replaceAll("[^A-Za-z0-9._-]","_"));startActivityForResult(call,intent,"scoreCardSaved");
        }catch(Exception e){if(export!=null)export.delete();call.reject("Could not prepare score card download",e);}
    }
    @com.getcapacitor.annotation.ActivityCallback private void scoreCardSaved(PluginCall call,androidx.activity.result.ActivityResult result){
        if(call==null)return;java.io.File export=null;
        try{
            String filename=call.getString("exportFile","");if(!filename.matches("score-[A-Za-z0-9-]+\\.(png|jpg)"))throw new java.io.IOException("Export expired. Please try again.");
            export=new java.io.File(new java.io.File(getContext().getCacheDir(),"score_exports"),filename);
            if(result.getResultCode()!=android.app.Activity.RESULT_OK||result.getData()==null||result.getData().getData()==null){call.resolve(new JSObject().put("cancelled",true));return;}
            try(java.io.InputStream in=new java.io.FileInputStream(export);java.io.OutputStream out=getContext().getContentResolver().openOutputStream(result.getData().getData())){if(out==null)throw new java.io.IOException("No destination selected");byte[] buffer=new byte[16384];int count;while((count=in.read(buffer))!=-1)out.write(buffer,0,count);}
            call.resolve(new JSObject().put("cancelled",false));
        }catch(Exception e){call.reject("Could not save score card image",e);}finally{if(export!=null)export.delete();}
    }
    @PluginMethod public void openCustomWidgetBuilder(PluginCall call){getActivity().startActivity(new Intent(getContext(),CustomWidgetConfigureActivity.class));call.resolve();}
    @PluginMethod public void timeTools(PluginCall call){try{call.resolve(new JSObject(TimeTools.control(getContext(),call.getString("command","status"),call.getInt("durationMs",0)).toString()));}catch(Exception e){call.reject(e.getMessage(),e);}}
    @PluginMethod public void setTheme(PluginCall call){MantraTheme.save(getContext(),call.getString("theme","system"));call.resolve();}
    @PluginMethod public void prepareAlarmAccess(PluginCall call){getActivity().runOnUiThread(()->{
        try{
            android.app.NotificationManager manager=(android.app.NotificationManager)getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            if(!manager.areNotificationsEnabled()){
                getActivity().startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getContext().getPackageName()));
                call.reject("Enable MANTRA notifications for alarm controls, then return and save again.");return;
            }
            if(!ClockAlarms.canSchedule(getContext())){
                getActivity().startActivity(new Intent(android.provider.Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM,android.net.Uri.parse("package:"+getContext().getPackageName())));
                call.reject("Enable Alarms & reminders, then return and save again.");return;
            }
            if(android.os.Build.VERSION.SDK_INT>=34&&!manager.canUseFullScreenIntent()){
                getActivity().startActivity(new Intent(android.provider.Settings.ACTION_MANAGE_APP_USE_FULL_SCREEN_INTENT,android.net.Uri.parse("package:"+getContext().getPackageName())));
                call.reject("Allow full-screen alarms, then return and save again.");return;
            }
            ClockAlarms.restore(getContext());call.resolve();
        }catch(Exception e){call.reject("Open Menu → Alarms to enable alarm and lock-screen access, then save again.",e);}
    });}
    private final java.util.concurrent.ExecutorService usageWorker=java.util.concurrent.Executors.newSingleThreadExecutor();
    @PluginMethod public void openTrack(PluginCall call){getActivity().startActivity(new Intent(getContext(),TrackActivity.class));call.resolve();}
    @PluginMethod public void screenTimeTotals(PluginCall call){usageWorker.execute(()->{try{org.json.JSONObject totals=ScreenTime.dailyTotals(getContext());JSObject result=new JSObject(totals.toString());call.resolve(result);TrackWidgetProvider.refresh(getContext());}catch(Exception e){call.reject("Could not read screen time. Check Usage access and unlock your phone.",e);}});}
    @Override protected void handleOnDestroy(){usageWorker.shutdownNow();super.handleOnDestroy();}
    @PluginMethod public void pendingShare(PluginCall call) {
        try { org.json.JSONObject share=SharedNotes.pending(getContext()); JSObject result=new JSObject(); if(share!=null)result.put("share",share);call.resolve(result); }
        catch(Exception e){call.reject("Could not read shared note",e);}
    }
    @PluginMethod public void acknowledgeShare(PluginCall call) {
        try{SharedNotes.acknowledge(getContext(),call.getString("id",""));call.resolve();}catch(Exception e){call.reject("Could not acknowledge shared note",e);}
    }
    @PluginMethod public void openNoteLink(PluginCall call) {
        try{android.net.Uri uri=android.net.Uri.parse(call.getString("url",""));String scheme=uri.getScheme();if(!"https".equalsIgnoreCase(scheme)&&!"http".equalsIgnoreCase(scheme)){call.reject("Only web links can be opened");return;}getActivity().startActivity(new Intent(Intent.ACTION_VIEW,uri));call.resolve();}
        catch(Exception e){call.reject("No app is available to open this link",e);}
    }
    @PluginMethod public void openAlarms(PluginCall call) {
        getActivity().startActivity(new Intent(getContext(), AlarmsActivity.class));
        call.resolve();
    }
    @PluginMethod public void listAlarms(PluginCall call) {
        try { call.resolve(new JSObject().put("alarms", ClockAlarms.all(getContext()))); }
        catch (Exception e) { call.reject("Could not read alarms", e); }
    }
    @PluginMethod public void setAlarmEnabled(PluginCall call) {
        try {
            org.json.JSONObject alarm = ClockAlarms.find(getContext(), call.getString("id", ""));
            if (alarm == null) { call.reject("This alarm no longer exists"); return; }
            alarm.put("enabled", call.getBoolean("enabled", false)); alarm.put("snoozedUntil", 0);
            ClockAlarms.save(getContext(), alarm);
            if (!alarm.optBoolean("enabled")) getContext().startService(new Intent(getContext(), ClockAlarmService.class).setAction("STOP").putExtra("id", alarm.getString("id")));
            call.resolve();
        } catch (Exception e) { call.reject("Open alarm settings to check access, then try again", e); }
    }
    @PluginMethod
    public void replace(PluginCall call) {
        try {
            JSONArray entries = call.getArray("entries");
            if (entries == null) { call.reject("Missing entries"); return; }
            JSONArray records = call.getArray("records");
            NativeDiaryStore.snapshot(getContext(), call.getString("uid", "local"), records == null ? new JSONArray() : records);CustomWidgetProvider.refresh(getContext());
            ClockAlarms.syncDiary(getContext(),call.getString("uid","local"),records==null?new JSONArray():records);
            NoteWidgetProvider.refresh(getContext());
            JSONArray greetings = GreetingReminders.entries();
            if(call.getBoolean("scoreNudges",true)){JSONArray scores=ScoreReminders.entries();for(int i=0;i<scores.length();i++)entries.put(scores.getJSONObject(i));}
            ScoreReminders.clearIfNoReport(getContext());
            for(int i=0;i<greetings.length();i++){org.json.JSONObject greeting=greetings.getJSONObject(i);String time=greeting.getJSONArray("times").getString(0);if(call.getBoolean("scoreNudges",true)&&java.util.Arrays.asList("00:30","01:00","06:00","08:00","10:00","11:00").contains(time))continue;entries.put(greeting); }
            DiaryAlarmReceiver.replace(getContext(), entries);
            TodayWidgetProvider.refresh(getContext());
            call.resolve();
        } catch (Exception error) { call.reject("Could not schedule reminders", error); }
    }
    @PluginMethod public void pendingActions(PluginCall call) {
        try { call.resolve(new JSObject().put("actions", NativeDiaryStore.pending(getContext(), call.getString("uid", "local")))); }
        catch (Exception e) { call.reject("Could not read completion actions", e); }
    }
    @PluginMethod public void acknowledgeActions(PluginCall call) {
        try { NativeDiaryStore.acknowledge(getContext(), call.getArray("ids")); call.resolve(); }
        catch (Exception e) { call.reject("Could not acknowledge completion actions", e); }
    }
    @PluginMethod public void consumeLaunch(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Intent intent = getActivity().getIntent();
            String kind = intent.getStringExtra("transactionKind");
            JSObject result = new JSObject();
            String quick=intent.getStringExtra("quickAction");
            if(java.util.Arrays.asList("note","transaction","goal","plan","money","report").contains(quick)){
                String requestId=intent.getStringExtra("quickRequestId");if(requestId==null){requestId=java.util.UUID.randomUUID().toString();intent.putExtra("quickRequestId",requestId);}result.put("type","quick");result.put("action",quick);result.put("requestId",requestId);result.put("moneyPeriod","month".equals(intent.getStringExtra("moneyPeriod"))?"month":"day");call.resolve(result);return;
            }
            if(intent.hasExtra("diaryRecordId")){
                String requestId=intent.getStringExtra("entryLaunchRequestId");if(requestId==null){requestId=java.util.UUID.randomUUID().toString();intent.putExtra("entryLaunchRequestId",requestId);}
                result.put("type","entry");result.put("recordId",intent.getStringExtra("diaryRecordId"));result.put("uid",intent.getStringExtra("diaryUid"));result.put("requestId",requestId);call.resolve(result);return;
            }
            if(intent.hasExtra("noteId") || intent.getBooleanExtra("openNotes",false)) {
                String requestId=intent.getStringExtra("noteLaunchRequestId");if(requestId==null){requestId=java.util.UUID.randomUUID().toString();intent.putExtra("noteLaunchRequestId",requestId);}
                result.put("type",intent.hasExtra("noteId")?"note":"notes");result.put("noteId",intent.getStringExtra("noteId"));result.put("uid",intent.getStringExtra("noteUid"));result.put("requestId",requestId);call.resolve(result);return;
            }
            if ("income".equals(kind) || "expense".equals(kind)) {
                String requestId = intent.getStringExtra("transactionRequestId");
                if (requestId == null) { requestId = java.util.UUID.randomUUID().toString(); intent.putExtra("transactionRequestId", requestId); }
                result.put("type", "transaction"); result.put("kind", kind); result.put("requestId", requestId);
            }
            call.resolve(result);
        });
    }
    @PluginMethod public void acknowledgeLaunch(PluginCall call) {
        getActivity().runOnUiThread(() -> {
            Intent intent = getActivity().getIntent();
            if(call.getString("requestId", "").equals(intent.getStringExtra("quickRequestId"))){intent.removeExtra("quickAction");intent.removeExtra("quickRequestId");intent.removeExtra("moneyPeriod");}
            if(call.getString("requestId", "").equals(intent.getStringExtra("entryLaunchRequestId"))){intent.removeExtra("diaryRecordId");intent.removeExtra("diaryUid");intent.removeExtra("entryLaunchRequestId");}
            if(call.getString("requestId", "").equals(intent.getStringExtra("noteLaunchRequestId"))) {
                intent.removeExtra("noteId");intent.removeExtra("noteUid");intent.removeExtra("noteLaunchRequestId");intent.removeExtra("openNotes");
            }
            if (call.getString("requestId", "").equals(intent.getStringExtra("transactionRequestId"))) {
                intent.removeExtra("transactionKind"); intent.removeExtra("transactionRequestId");
            }
            call.resolve();
        });
    }
}
