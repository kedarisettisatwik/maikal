package com.maikal.daily;

import android.app.AppOpsManager;
import android.app.usage.*;
import android.content.*;
import android.content.pm.*;
import android.os.Process;
import java.time.*;
import java.util.*;

/** Device-only usage reader. Only daily totals cross the Capacitor bridge. */
public final class ScreenTime {
    public static final class Event {
        final long at; final int type; final String pkg, activity;
        Event(long at,int type,String pkg,String activity){this.at=at;this.type=type;this.pkg=pkg==null?"":pkg;this.activity=activity==null?"":activity;}
    }
    public static final class Session {
        final String pkg; final long start,end;
        Session(String pkg,long start,long end){this.pkg=pkg;this.start=start;this.end=end;}
    }
    public static final class Result {
        final long start,end,total; final Map<String,Long> apps; final long[] buckets;
        Result(long start,long end,long total,Map<String,Long> apps,long[] buckets){this.start=start;this.end=end;this.total=total;this.apps=apps;this.buckets=buckets;}
    }
    static boolean allowed(Context context){
        AppOpsManager ops=(AppOpsManager)context.getSystemService(Context.APP_OPS_SERVICE);
        return ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,Process.myUid(),context.getPackageName())==AppOpsManager.MODE_ALLOWED;
    }
    static String deviceId(Context c){android.content.SharedPreferences p=c.getSharedPreferences("maikal_track",0);String id=p.getString("deviceId",null);if(id==null){id=UUID.randomUUID().toString();p.edit().putString("deviceId",id).commit();}return id;}
    static long midnight(LocalDate date,ZoneId zone){return date.atStartOfDay(zone).toInstant().toEpochMilli();}
    static String duration(long millis){long min=millis/60000;if(min==0)return millis>0?"< 1 min":"0 min";return (min>=60?min/60+" h ":"")+(min%60)+" min";}
    static List<Event> events(Context c,long start,long end){
        if(!allowed(c))throw new SecurityException("Usage access is required");
        UsageEvents source=((UsageStatsManager)c.getSystemService(Context.USAGE_STATS_SERVICE)).queryEvents(start,end);
        if(source==null)throw new IllegalStateException("Unlock your phone to read usage history.");
        List<Event> events=new ArrayList<>();UsageEvents.Event event=new UsageEvents.Event();
        while(source.hasNextEvent()){source.getNextEvent(event);int t=event.getEventType();if(t==1||t==2||t==15||t==17||t==23||t==26)events.add(new Event(event.getTimeStamp(),t,event.getPackageName(),event.getClassName()));}
        return events;
    }
    static Set<String> excluded(Context c){Set<String> result=new HashSet<>(Arrays.asList("android","com.android.systemui"));Intent home=new Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME);for(ResolveInfo info:c.getPackageManager().queryIntentActivities(home,PackageManager.MATCH_DEFAULT_ONLY))result.add(info.activityInfo.packageName);return result;}
    static List<Session> sessions(List<Event> events,long end){
        Map<String,Long> opened=new HashMap<>();List<Session> sessions=new ArrayList<>();
        for(Event e:events){String key=e.pkg+"\n"+e.activity;
            if(e.type==1){opened.putIfAbsent(key,e.at);}
            else if(e.type==2||e.type==23){Long start=opened.remove(key);if(start!=null&&e.at>start)sessions.add(new Session(e.pkg,start,e.at));}
            else if(e.type==15||e.type==17||e.type==26){for(Map.Entry<String,Long> entry:opened.entrySet())if(e.at>entry.getValue())sessions.add(new Session(entry.getKey().split("\n",2)[0],entry.getValue(),e.at));opened.clear();}
        }
        for(Map.Entry<String,Long> entry:opened.entrySet())if(end>entry.getValue())sessions.add(new Session(entry.getKey().split("\n",2)[0],entry.getValue(),end));return sessions;
    }
    static Result calculate(List<Session> sessions,long start,long end,Set<String> excluded,long[] edges){
        Map<String,List<long[]>> byApp=new HashMap<>();List<long[]> all=new ArrayList<>();
        for(Session s:sessions){long a=Math.max(start,s.start),b=Math.min(end,s.end);if(a>=b||excluded.contains(s.pkg)||s.pkg.isEmpty())continue;long[] span={a,b};byApp.computeIfAbsent(s.pkg,k->new ArrayList<>()).add(span);all.add(span);}
        Map<String,Long> apps=new HashMap<>();for(Map.Entry<String,List<long[]>> entry:byApp.entrySet())apps.put(entry.getKey(),union(entry.getValue(),start,end));
        long[] buckets=new long[Math.max(0,edges.length-1)];for(int i=0;i<buckets.length;i++)buckets[i]=union(all,edges[i],Math.min(end,edges[i+1]));
        return new Result(start,end,union(all,start,end),apps,buckets);
    }
    private static long union(List<long[]> spans,long start,long end){
        if(end<=start)return 0;List<long[]> copy=new ArrayList<>();for(long[] s:spans)if(s[1]>start&&s[0]<end)copy.add(new long[]{Math.max(start,s[0]),Math.min(end,s[1])});copy.sort(Comparator.comparingLong(a->a[0]));long total=0,a=-1,b=-1;for(long[] s:copy){if(a<0){a=s[0];b=s[1];}else if(s[0]<=b)b=Math.max(b,s[1]);else{total+=b-a;a=s[0];b=s[1];}}return total+(a<0?0:b-a);
    }
    static Result read(Context c,int range){
        ZoneId zone=ZoneId.systemDefault();LocalDate today=LocalDate.now(zone);long now=System.currentTimeMillis();LocalDate first=range==2?today.minusDays(6):range==1?today.minusDays(1):today;long start=midnight(first,zone),end=range==1?midnight(today,zone):now;
        long[] edges=new long[range==2?8:13];for(int i=0;i<edges.length;i++)edges[i]=range==2?midnight(first.plusDays(i),zone):(i==12?midnight(first.plusDays(1),zone):first.atStartOfDay(zone).plusHours(i*2L).toInstant().toEpochMilli());
        return calculate(sessions(events(c,midnight(first.minusDays(1),zone),now),now),start,end,excluded(c),edges);
    }
    static List<Map.Entry<String,Long>> sorted(Result r){List<Map.Entry<String,Long>> rows=new ArrayList<>(r.apps.entrySet());rows.sort(Map.Entry.<String,Long>comparingByValue().reversed());return rows;}
    static String label(Context c,String pkg){try{return c.getPackageManager().getApplicationLabel(c.getPackageManager().getApplicationInfo(pkg,0)).toString();}catch(Exception e){return pkg;}}
    static org.json.JSONObject dailyTotals(Context c)throws Exception{
        org.json.JSONObject result=new org.json.JSONObject().put("allowed",allowed(c));if(!allowed(c))return result;
        ZoneId zone=ZoneId.systemDefault();LocalDate today=LocalDate.now(zone);long now=System.currentTimeMillis();LocalDate first=today.minusDays(6);List<Event> history=events(c,midnight(first.minusDays(1),zone),now);List<Session> sessions=sessions(history,now);Set<String> excluded=excluded(c);org.json.JSONArray days=new org.json.JSONArray();
        android.content.SharedPreferences prefs=c.getSharedPreferences("maikal_track",0);org.json.JSONObject archive=new org.json.JSONObject(prefs.getString("totals","{}"));
        for(int i=0;i<7;i++){LocalDate date=first.plusDays(i);long start=midnight(date,zone),end=Math.min(now,midnight(date.plusDays(1),zone));String key=zone.getId()+":"+date;org.json.JSONObject saved=archive.optJSONObject(key);Result usage=calculate(sessions,start,end,excluded,new long[0]);
            // Do not manufacture zero days before Android's retained event history.
            if(!date.equals(today)&&saved==null&&(history.isEmpty()||history.get(0).at>=end))continue;
            long total=saved==null?usage.total:Math.max(saved.optLong("totalMs"),usage.total);org.json.JSONObject day=new org.json.JSONObject().put("date",date.toString()).put("totalMs",Math.min(end-start,total)).put("observedAt",end);days.put(day);archive.put(key,day);
        }
        // Keep a short local archive so history pruning never reduces already observed totals.
        java.util.Iterator<String> keys=archive.keys();List<String> remove=new ArrayList<>();while(keys.hasNext()){String key=keys.next();if(key.substring(key.lastIndexOf(':')+1).compareTo(today.minusDays(30).toString())<0)remove.add(key);}for(String key:remove)archive.remove(key);prefs.edit().putString("totals",archive.toString()).apply();
        return result.put("deviceId",deviceId(c)).put("deviceName",android.os.Build.MODEL).put("timezone",zone.getId()).put("days",days);
    }
}
