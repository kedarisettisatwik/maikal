# Android downloads

- **Maikal-Local.apk** — device-only diary, no Firebase SDK or Internet permission. Package: `com.maikal.daily.local`.
- **Maikal-Firebase.apk** — cloud-enabled edition for the authorized Maikal account. Package: `com.maikal.daily`.

The editions install side by side and have separate local storage. The Firebase edition updates earlier Maikal installations when signed with the same key; do not uninstall your existing app if you want to preserve device data. These are debug-signed installation files.

Open **Menu → Alarms** to create daily, weekday, one-time, or date-specific ringing alarms. Enable alarm and lock-screen permissions using the button on that screen. **Snooze** rings again after five minutes; **Stop** ends the current occurrence. Future recurring occurrences remain scheduled. Alarms are device-local in both editions.

Rebuild both APKs with `npm run android:build` from the repository root. Keep `android/`: it contains the native alarm and widget source, not disposable output.
