package com.maikal.daily;

import org.json.JSONArray;
import org.json.JSONObject;

final class GreetingReminders {
    private static final String[] MESSAGES={
        "Pick one small goal and give it a little attention.","A quick look at your plans can make the next hour easier.","Your progress does not have to be big to count. What is one next step?","Check your diary for a goal or reminder that needs your attention.",
        "A little consistency goes a long way. How are your goals coming along?","Take a breath, open your plans, and choose what matters next.","Have a completed goal? Mark it off and enjoy that little win.","A fresh check-in: review your goals, meetings and reminders.",
        "You can begin again at any point in the day. Choose one manageable task.","Make a little space for the goal you care about today.","Your diary is here when you need a moment to organize your next step.","Small steps add up. Record any progress you have made so far.",
        "What is one thing you would like to move forward today?","Before moving to your next task, check what is in your diary.","Give yourself credit for your progress, then pick a gentle next step.","Any reminders waiting? A quick review can help you stay on track.",
        "A goal is a direction, not a race. Take the next step at your pace.","Check your tracker totals and add anything you have done today.","One focused moment can help. Choose a goal and start small.","Your plans can change. Review your diary and make room for what matters.",
        "A little follow-through today makes tomorrow easier.","Open MANTRA for a quick look at your remaining goals and plans.","What have you already accomplished? Take a moment to record it.","Keep the next step simple. Your goals are waiting in your diary.",
        "A quick check-in can bring a little clarity to your day.","Look over your reminders so that the small things do not get lost.","Progress can be quiet. Update a tracker or check off a completed goal.","Choose one useful thing to do next, however small it is.",
        "Your diary is a place to reset. Take a look at today's priorities.","Make your next action a little more intentional. Check your plans.","A moment for your goals: review, update, and keep going at your pace.","Remember to notice your small wins while you review your day."
    };
    static String[] message(String id,java.time.LocalDate date){String[] times={"06:30","10:00","11:00","12:00","16:00","18:00","21:00","01:00"};int slot=0;for(int i=0;i<times.length;i++)if(id.equals("greeting_"+times[i]))slot=i;String[] titles={"A small step for today","Your MANTRA check-in","A moment for your plans","Keep your day in view","A little room for progress","Your next small step","A gentle goal reminder"};return new String[]{titles[Math.floorMod(date.toEpochDay()+slot,titles.length)],MESSAGES[Math.floorMod(date.toEpochDay()*11+slot,MESSAGES.length)]};}
    static JSONArray entries() throws Exception {
        String[][] greetings = {
            {"06:30", "Good morning!", "A fresh page awaits. Have you checked today's goals, reminders and meetings?"},
            {"10:00", "A little morning momentum", "Hey, have you checked your goals and reminders? One small step counts."},
            {"11:00", "Your late-morning check-in", "How is your morning going? Take a look at your goals, meetings and reminders."},
            {"12:00", "Hello, afternoon!", "Pause for a moment and check your goals and reminders for the rest of today."},
            {"16:00", "A gentle afternoon nudge", "Have you checked your goals and reminders? There is still time for a little progress."},
            {"18:00", "Good evening!", "Check your remaining goals, reminders and meetings before the evening gets busy."},
            {"21:00", "Time for a little reflection", "How did today go? Check off your goals and review any remaining reminders."},
            {"01:00", "Still up? A gentle check-in", "Hey, have you checked your goals and reminders? A fresh day is here. Take care and rest well."}
        };
        JSONArray result = new JSONArray();
        for (String[] greeting : greetings) result.put(new JSONObject().put("id", "greeting_" + greeting[0]).put("kind", "greeting")
            .put("title", greeting[1]).put("body", greeting[2]).put("schedule", new JSONObject().put("type", "everyday"))
            .put("times", new JSONArray().put(greeting[0])));
        return result;
    }
}
