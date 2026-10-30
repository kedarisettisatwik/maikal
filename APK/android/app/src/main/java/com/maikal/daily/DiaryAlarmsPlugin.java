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
    @PluginMethod public void prepareAlarmAccess(PluginCall call){getActivity().runOnUiThread(()->{
        try{
            android.app.NotificationManager manager=(android.app.NotificationManager)getContext().getSystemService(android.content.Context.NOTIFICATION_SERVICE);
            if(!manager.areNotificationsEnabled()){
                getActivity().startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getContext().getPackageName()));
                call.reject("Enable Maikal notifications for alarm controls, then return and save again.");return;
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
    @PluginMethod
    public void replace(PluginCall call) {
        try {
            JSONArray entries = call.getArray("entries");
            if (entries == null) { call.reject("Missing entries"); return; }
            JSONArray records = call.getArray("records");
            NativeDiaryStore.snapshot(getContext(), call.getString("uid", "local"), records == null ? new JSONArray() : records);
            ClockAlarms.syncDiary(getContext(),call.getString("uid","local"),records==null?new JSONArray():records);
            NoteWidgetProvider.refresh(getContext());
            JSONArray greetings = GreetingReminders.entries();
            for (int i = 0; i < greetings.length(); i++) entries.put(greetings.getJSONObject(i));
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
