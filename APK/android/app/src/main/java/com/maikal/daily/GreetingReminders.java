package com.maikal.daily;

import org.json.JSONArray;
import org.json.JSONObject;

final class GreetingReminders {
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
