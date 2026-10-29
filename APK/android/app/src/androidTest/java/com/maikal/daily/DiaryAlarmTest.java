package com.maikal.daily;

import android.content.Context;
import androidx.test.core.app.ApplicationProvider;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.time.LocalDate;
import static org.junit.Assert.*;

@RunWith(AndroidJUnit4.class)
public class DiaryAlarmTest {
    @Test public void weekdaysUseSundayZeroAndRespectCreationDate() throws Exception {
        JSONObject entry = new JSONObject("{\"createdDate\":\"2026-11-02\",\"schedule\":{\"type\":\"days\",\"days\":[0,3]}}");
        assertEquals(LocalDate.parse("2026-11-04"), DiaryAlarmReceiver.nextDate(entry, LocalDate.parse("2026-10-30")));
        assertEquals(LocalDate.parse("2026-11-08"), DiaryAlarmReceiver.nextDate(entry, LocalDate.parse("2026-11-05")));
    }
    @Test public void explicitDatesSelectEarliestRemainingDate() throws Exception {
        JSONObject entry = new JSONObject("{\"schedule\":{\"type\":\"dates\",\"dates\":[\"2026-12-20\",\"2026-11-01\"]}}");
        assertEquals(LocalDate.parse("2026-11-01"), DiaryAlarmReceiver.nextDate(entry, LocalDate.parse("2026-10-30")));
        assertNull(DiaryAlarmReceiver.nextDate(entry, LocalDate.parse("2026-12-21")));
    }
    @Test public void rangesStopAfterLastDay() throws Exception {
        JSONObject entry = new JSONObject("{\"schedule\":{\"type\":\"range\",\"from\":\"2026-11-01\",\"to\":\"2026-11-03\"}}");
        assertEquals(LocalDate.parse("2026-11-01"), DiaryAlarmReceiver.nextDate(entry, LocalDate.parse("2026-10-30")));
        assertEquals(LocalDate.parse("2026-11-03"), DiaryAlarmReceiver.nextDate(entry, LocalDate.parse("2026-11-03")));
        assertNull(DiaryAlarmReceiver.nextDate(entry, LocalDate.parse("2026-11-04")));
    }
    @Test public void persistsMultipleTimesAndCancelsRemovedEntries() throws Exception {
        Context context = ApplicationProvider.getApplicationContext();
        JSONArray entries = new JSONArray("[{\"id\":\"test\",\"title\":\"Test goal\",\"schedule\":{\"type\":\"everyday\"},\"times\":[\"09:00\",\"18:00\"]}]");
        DiaryAlarmReceiver.replace(context, entries);
        assertEquals(2, new JSONArray(context.getSharedPreferences("maikal_alarms", 0).getString("alarms", "[]")).length());
        DiaryAlarmReceiver.replace(context, new JSONArray());
        assertEquals("[]", context.getSharedPreferences("maikal_alarms", 0).getString("alarms", ""));
    }
}
