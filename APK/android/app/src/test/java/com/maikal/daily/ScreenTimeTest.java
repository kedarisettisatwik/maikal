package com.maikal.daily;
import org.junit.Test;
import java.util.*;
import java.time.*;
import static org.junit.Assert.*;

public class ScreenTimeTest {
    @Test public void clipsMidnightAndExcludesHomeAndBackground(){
        List<ScreenTime.Session> spans=Arrays.asList(new ScreenTime.Session("app",50,150),new ScreenTime.Session("home",150,300),new ScreenTime.Session("app",300,400));
        ScreenTime.Result r=ScreenTime.calculate(spans,100,350,Collections.singleton("home"),new long[]{100,200,300,400});assertEquals(100,r.total);assertEquals(Long.valueOf(100),r.apps.get("app"));assertArrayEquals(new long[]{50,0,50},r.buckets);
    }
    @Test public void overlappingActivitiesAndSplitScreenAreNotDoubleCountedInTotal(){
        List<ScreenTime.Session> spans=Arrays.asList(new ScreenTime.Session("a",0,100),new ScreenTime.Session("a",20,90),new ScreenTime.Session("b",50,150));ScreenTime.Result r=ScreenTime.calculate(spans,0,200,Collections.emptySet(),new long[0]);assertEquals(150,r.total);assertEquals(Long.valueOf(100),r.apps.get("a"));assertEquals(Long.valueOf(100),r.apps.get("b"));
    }
    @Test public void closesOnLockScreenAndShutdownAndIncludesCurrentForeground(){
        List<ScreenTime.Event> events=Arrays.asList(new ScreenTime.Event(10,1,"a","A"),new ScreenTime.Event(20,1,"a","B"),new ScreenTime.Event(30,2,"a","A"),new ScreenTime.Event(40,17,"", ""),new ScreenTime.Event(60,1,"b","B"),new ScreenTime.Event(70,26,"", ""),new ScreenTime.Event(90,1,"c","C"));
        ScreenTime.Result r=ScreenTime.calculate(ScreenTime.sessions(events,100),0,100,Collections.emptySet(),new long[0]);assertEquals(50,r.total);assertEquals(Long.valueOf(30),r.apps.get("a"));assertEquals(Long.valueOf(10),r.apps.get("b"));assertEquals(Long.valueOf(10),r.apps.get("c"));
    }
    @Test public void screenOffEndsForegroundAndDuplicatePauseDoesNotAddTime(){
        List<ScreenTime.Event> events=Arrays.asList(new ScreenTime.Event(10,1,"a","A"),new ScreenTime.Event(10,1,"a","A"),new ScreenTime.Event(20,15,"", ""),new ScreenTime.Event(30,2,"a","A"));assertEquals(10,ScreenTime.calculate(ScreenTime.sessions(events,100),0,100,Collections.emptySet(),new long[0]).total);
    }
    @Test public void calendarDaysRespectDaylightSaving(){ZoneId zone=ZoneId.of("America/New_York");LocalDate day=LocalDate.of(2026,11,1);assertEquals(25*3600000L,ScreenTime.midnight(day.plusDays(1),zone)-ScreenTime.midnight(day,zone));}
}
