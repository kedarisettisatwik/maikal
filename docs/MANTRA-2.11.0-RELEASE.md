# MANTRA 2.11.0

Both APK editions use version name 2.11.0 and version code 43. Their shared diary features are built from the same source. Local remains offline; Firebase retains its authorized-account sync, cloud analytics and existing private feeds.

- Add Note of the day above Today’s goals. The dated reflection saves on leaving the field or Save daily note, supports line breaks, and appears in Calendar for the selected date.
- Local persists dated notes only on the device. Firebase includes the same record type in authenticated cloud merge/sync and local-to-cloud transfer.
- Add a complete, edition-specific offline privacy policy in More. Public Local/Firebase policy pages are included in the launch website.
- Refresh the native alarm list after returning from ringing, so delete-after-completion is reflected immediately. Validate date-only task/note dates independently of UTC offsets.
- Remove the unused broad FileProvider registration; no file sharing/export permission is introduced.
- Website: update Install APK links and the launch site’s bundled Local APK. No diary website UI changes.

Store upload materials for the Local edition are prepared separately: signed AAB, 512px icon, 1024x500 feature graphic, real APK screenshots, descriptions, privacy policy, Data safety and permission/declaration guidance. The Firebase AAB is a separate private/authorized edition and must not reuse Local Data safety answers.

Website APKs are now non-debuggable release builds, re-signed with their existing website identity for direct updates without uninstalling. Play bundles use the existing upload key. Play App Signing may prevent updating an existing debug-signed local installation; do not uninstall a diary containing data to work around signature differences. Local backup is disabled and no complete export/import is introduced.

Target/compile API 36; minimum API 26. Play Console account verification, required testing, content/declaration answers and Google review remain external requirements. No Play submission is performed.

## Checks

179 JS tests passed in the full run, with 25 focused date/task/scoring checks passing after the final date validation fix. Both editions' native feature cases passed, including a corrected real-goal focus fixture. Daily-note save/reopen/calendar behavior passed against the actual non-debuggable distribution APKs. The Local release alarm test created an alarm, waited for its scheduled firing, inspected the notification, opened ringing controls, swiped Stop and verified immediate list removal. Store screenshots are actual APK screens with demo records.

Both release builds and lint passed (zero errors; nonblocking warning counts in verification metadata). Production npm audit reported no known vulnerabilities. APK/AAB signatures, exact 2.11.0 version parity, API levels, seven widgets, no broad FileProvider, shared feature labels, Local Internet/endpoint absence and bundletool validation passed. The Play packet contains only the Local AAB; Firebase Play artifacts are not distributed.

Physical-device/manufacturer testing, live authorized-account cloud write verification and Play Console account/declaration/review steps remain outside these automated checks. The upload guide explains the user steps and official references.
