# Android downloads

- **Maikal-Local.apk** — device-only diary, no Firebase SDK or Internet permission. Package: `com.maikal.daily.local`.
- **Maikal-Firebase.apk** — cloud-enabled edition for the authorized Maikal account. Package: `com.maikal.daily`.

The editions install side by side and have separate local storage. The Firebase edition updates earlier Maikal installations when signed with the same key; do not uninstall your existing app if you want to preserve device data. These are debug-signed installation files.

Open **Menu → Alarms** to create daily, weekday, one-time, or date-specific ringing alarms. Enable alarm and lock-screen permissions using the button on that screen. **Snooze** rings again after five minutes; **Stop** ends the current occurrence. Future recurring occurrences remain scheduled. Alarms are device-local in both editions.

Version 1.4.1 uses Maikal's default cream (#FAF8EF) background, ink text, blue controls and green Add button for the alarm list and editor, including when the device is in dark mode. Wheel time selection and alarm cards are retained. The ringing screen uses a large clock on a dark background. Drag its center handle **left to Snooze** or **right to Stop**; a short drag takes no action. Accessibility actions and notification buttons remain available.

An advance notification is scheduled **10 minutes before each regular alarm occurrence**. Its **Dismiss** action (or swiping away the notice) hides only that occurrence's notification; it does not cancel the ringing alarm or future repeat notifications. Editing/disabling/deleting the alarm cancels stale advance notices. Alarms created less than ten minutes before ringing do not generate a retroactive notice. Five-minute snoozes do not receive another ten-minute advance notice.

Rebuild both APKs with `npm run android:build` from the repository root. Keep `android/`: it contains the native alarm and widget source, not disposable output.
