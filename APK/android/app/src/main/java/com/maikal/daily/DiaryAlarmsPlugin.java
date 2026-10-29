package com.maikal.daily;

import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;

@CapacitorPlugin(name = "DiaryAlarms")
public class DiaryAlarmsPlugin extends Plugin {
    @PluginMethod
    public void replace(PluginCall call) {
        try {
            JSONArray entries = call.getArray("entries");
            if (entries == null) { call.reject("Missing entries"); return; }
            DiaryAlarmReceiver.replace(getContext(), entries);
            call.resolve();
        } catch (Exception error) { call.reject("Could not schedule reminders", error); }
    }
}
