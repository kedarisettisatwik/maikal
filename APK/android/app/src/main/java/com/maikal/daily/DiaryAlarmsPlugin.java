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
