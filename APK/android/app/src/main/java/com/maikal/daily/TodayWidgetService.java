package com.maikal.daily;

import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import org.json.JSONObject;
import java.util.ArrayList;

// Collection adapter for Android 8–11; newer Android uses inline collection items.
public class TodayWidgetService extends RemoteViewsService {
    @Override public RemoteViewsFactory onGetViewFactory(Intent intent) {
        return new RemoteViewsFactory() {
            ArrayList<JSONObject> rows = new ArrayList<>();
            public void onCreate() { onDataSetChanged(); }
            public void onDataSetChanged() { try { rows = TodayWidgetProvider.today(getApplicationContext()); } catch (Exception e) { rows.clear(); } }
            public void onDestroy() { rows.clear(); }
            public int getCount() { return rows.size(); }
            public RemoteViews getViewAt(int position) { try { return TodayWidgetProvider.row(getApplicationContext(), rows.get(position)); } catch (Exception e) { return null; } }
            public RemoteViews getLoadingView() { return null; }
            public int getViewTypeCount() { return 1; }
            public long getItemId(int position) { return position; }
            public boolean hasStableIds() { return false; }
        };
    }
}
