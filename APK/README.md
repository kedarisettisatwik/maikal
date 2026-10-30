# Android downloads

Version **1.8.0** adds optional **Alarm times** alongside **Notification times** in the APK goal, reminder and meeting forms. Add times in either section or both; leave a section empty to disable that alert type. Alarm times use the entry’s repeat schedule (daily, weekdays, dates or date range) and the device timezone. The browser keeps its existing notification controls and preserves alarm metadata when editing an APK-created entry.

Saving an APK entry creates linked ringing alarms immediately. They appear in the full-screen **Menu → Alarms** list with the entry’s title and a linked-entry label. **Edit linked goal/reminder/meeting** opens the original diary form. Change or remove alarm times there; deleting the entry cancels its linked alarms and snoozes. Standalone alarms are preserved. The alarm-list switch can disable an individual linked alarm on that device; ordinary sync preserves its disabled state, snooze and dismissed advance notice. Changing its repeat schedule resets that linked alarm’s state. Expired dates appear as off.

Android notification, Alarms & reminders and full-screen alarm permissions are checked before saving an entry with alarms. If access is missing, Android Settings opens and the form keeps its draft; grant access, return and save again. Once armed, linked alarms use the existing alarm sound, full-screen ringing UI, swipe snooze/stop, five-minute snooze and ten-minute advance notice. Android controls whether a full-screen alert or a heads-up alert appears while the phone is unlocked.

Local keeps entries and alarms on the device. Firebase syncs the entry’s alarm-time preferences with the diary; each connected APK creates its own account-scoped native alarms when its records sync. Switching accounts removes the previous account’s linked alarms. Already scheduled alarms work without Firebase connectivity. Publish these builds with `python scripts/publish-apks.py --tag android-v1.8.0 --notes "Optional linked ringing alarms for goals, reminders and meetings in both APK editions. Choose notifications, alarms or both. Linked alarms appear in Alarms and follow entry edits and deletion. Existing five-minute snooze, Stop and advance notices are preserved. Both launcher names remain Maikal. Debug APKs for direct installation; install over the matching edition to preserve data."`.

Version **1.7.0** adds **Menu → Track** in both APKs. Enable Android **Usage access** once to see today, yesterday or the last seven days of foreground app usage, total screen time and a usage chart. Tap an app for its duration. Home, lock screen and background activity are excluded; overlapping split-screen usage is counted once in the total. Android controls how much detailed event history remains available, so older days may be incomplete. No continuous monitoring service or accessibility access is used.

Add **Maikal Track** from the Android home-screen widget picker for today’s total and three most-used apps. Tap the widget to open Track. Android refreshes it periodically (requested every 30 minutes, subject to system scheduling); opening Maikal also refreshes it. The update timestamp shows freshness.

The homepage screen-time summary replaces the old “Small things” quotation. App-by-app usage stays on the phone. Daily totals, date, timezone, a random installation ID and device model use `type: screentime` records in the existing account-scoped `maikalRecords` collection. Local keeps these totals on-device; Firebase uploads them only to the authorized connected diary using existing sign-in, rules and offline retry. Opening/resuming Maikal reads totals and syncs them; while its dashboard is visible, it checks each minute. It does not upload while the APK is closed. Grant access and return to the Firebase APK to seed the website summary. The website shows the latest reporting phone’s total for today and its timestamp; it never adds overlapping phones together or presents yesterday’s value as today’s.

Build with `npm run android:build`, verify, then publish using `python scripts/publish-apks.py --tag android-v1.7.0`. APKs retain their package IDs, signatures and launcher name **Maikal**.

Version **1.6.0** adds **Maikal Note** to Android's widget picker. Long-press the home screen, choose Widgets → Maikal Note, and select a saved note. The resizable widget shows a text/link/checklist preview; tap its body to open that exact note, or tap **Change** to choose another. Open the APK once after upgrading so its note snapshot is available. Edits and Firebase sync refresh the widget while the app is running. Deleted or unavailable notes show a placeholder; widgets do not expose notes from a different connected diary.

The website's **Install APK** link downloads the Local edition unless its authorized Firebase account is connected, then downloads the Firebase edition. Public release assets are published using `python scripts/publish-apks.py --tag android-v1.6.0`; when making a new release, update `apkRelease` in `src/components/ApkDownload.jsx` after building and verifying both APKs.

Version **1.5.0**: both editions display the app name **Maikal** on the launcher and Android share sheet. Use the filenames below to distinguish the downloads; the editions retain separate package IDs and data.

## Notes

**Menu → Notes** opens a separate page with saved links, text notes and checklists. Search, filter by tags or source, and open saved links in the browser. URLs in the note body are clickable too. Tags and descriptions can be edited, checklist items can be checked off, and notes can be deleted.

In another Android app, share a **link or text** and select **Maikal**. A capture form asks for the title, description and tags. Shared links are stored as bookmarks; media files and private content are not downloaded. Source labels are inferred from the link's domain. Pending shares remain queued across launches until saved or discarded. Re-opening the same delivered intent does not create a duplicate note.

The **Local APK** keeps notes on that device. The **Firebase APK** syncs notes through the same authorized account and Firestore rules as the diary. Connect that account on the website to display the APK's notes; local drafts in the Firebase APK are merged when you connect. The website supports creating and managing notes but does **not** register as an Android/PWA share target.

- **Maikal-Local.apk** — device-only diary, no Firebase SDK or Internet permission. Package: `com.maikal.daily.local`.
- **Maikal-Firebase.apk** — cloud-enabled edition for the authorized Maikal account. Package: `com.maikal.daily`.

The editions install side by side and have separate local storage. The Firebase edition updates earlier Maikal installations when signed with the same key; do not uninstall your existing app if you want to preserve device data. These are debug-signed installation files.

Open **Menu → Alarms** to create daily, weekday, one-time, or date-specific ringing alarms. Enable alarm and lock-screen permissions using the button on that screen. **Snooze** rings again after five minutes; **Stop** ends the current occurrence. Future recurring occurrences remain scheduled. Alarms are device-local in both editions.

Version 1.4.1 uses Maikal's default cream (#FAF8EF) background, ink text, blue controls and green Add button for the alarm list and editor, including when the device is in dark mode. Wheel time selection and alarm cards are retained. The ringing screen uses a large clock on a dark background. Drag its center handle **left to Snooze** or **right to Stop**; a short drag takes no action. Accessibility actions and notification buttons remain available.

An advance notification is scheduled **10 minutes before each regular alarm occurrence**. Its **Dismiss** action (or swiping away the notice) hides only that occurrence's notification; it does not cancel the ringing alarm or future repeat notifications. Editing/disabling/deleting the alarm cancels stale advance notices. Alarms created less than ten minutes before ringing do not generate a retroactive notice. Five-minute snoozes do not receive another ten-minute advance notice.

Rebuild both APKs with `npm run android:build` from the repository root. Keep `android/`: it contains the native alarm and widget source, not disposable output.
