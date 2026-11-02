# MANTRA 2.10.0 Android release

Scope: both APKs; website changes only APK download targets. Application IDs remain `com.maikal.daily.local` and `com.maikal.daily`. Both display MANTRA. Version code 40, target/compile API 36, minimum API 26.

## Changes

- One-time standalone alarms offer Delete after completion. Stop or the ten-minute ringing timeout removes an opted-in alarm. Snooze preserves it and rings again after five minutes. Dismissing the advance notification still skips just the upcoming occurrence.
- Widget picker contains exactly seven MANTRA widgets: Today goals/events, Track screen time, chosen note, Add note 1x1, Add transaction 1x1, combined shortcuts 2x1 and 1x2. Dimensions are width x height. Combined widgets fill a low horizontal bar / narrow vertical bar with small padding, rounded background and green icons. Background follows light/dark/system. Money summary and custom widgets are retired; existing retired widgets must be removed and supported replacements re-added.
- Tracker notifications offer Add progress and Set total. Both use idempotent, ordered native storage; pending focus time is included before calculating additions. Screen-time-managed goals do not accept notification/manual overrides.
- Track offers Set screen time as goal with a daily At most target in minutes. Save the target in Track, then return to MANTRA. Progress comes from Android Usage access, not a manual counter. Configure or disable it only in Track; permission remains optional for other features. Separate devices have separate managed goal identities.
- Minute tracker goals can enable Focus. Opening Focus starts/resumes that item; only one session exists. Leaving MANTRA pauses, while screen lock keeps counting. Stop saves fractional minutes through a durable outbox. Sessions split at device-local midnight. Repeated imports do not add time twice, and manual totals or subsequent native replies retain the intended total. Task focus time is for review. Sessions restore paused after a process restart or reboot rather than guessing unobserved time.
- Tasks have title, optional description, icon/emoji, start date, optional deadline, completion, notification/alarm times and frequent reminders. Tasks have **no repeat control**: the same task remains active until completed; reminders are bounded by start/deadline (or completion if no deadline). No task instances are generated. Time tracking asks for an At least/At most review target and Focus; manual total adjustment is allowed.
- A task counts once on its deadline if marked complete by the end of that date in the device timezone. Late completion is missed on the original deadline. No deadline means no score contribution. Changing a saved deadline, including clearing/adding/reverting it, permanently excludes that task from scoring. Time targets never determine task completion.
- More > Calendar has month navigation, day selection and a spaced agenda listing scheduled goals/events and tasks whose current deadline is that day. Opening managed screen-time goals goes to Track.
- Scores are completed eligible items / all eligible items, rounded to whole percentages. Eligible items are scheduled checkbox goals, target-based trackers, and unchanged-deadline tasks. Events and target-free trackers are excluded. Overall is a weighted ratio across elapsed days including missed days, not an average of day percentages. Future dates are excluded; empty days say No scheduled items. Today is numeric; overall is a donut. New `completionScore` records preserve old point-score records and do not change the website's existing scoring UI.
- Goals and events can repeat on a particular day of each month (1–31). Months without that day are skipped; leap years are handled. This feeds the calendar, reports, notifications, native alarms and Today widget.

## Distribution and Play readiness

Website APKs retain the prior debug signing identity so matching existing website installations can update without uninstalling. Separately signed release APKs and AABs are included for Google Play/internal testing using the private upload key from the previous local Play candidate. Upload AAB files, not debug APKs, for new Play apps. Never uninstall an existing local diary to test a differently signed release. Existing Play-signing/data migration considerations remain: no full diary export/import UI is introduced here.

Local remains offline: no Internet permission, Firebase SDK/network endpoints, analytics uploads or cloud sign-in. Firebase retains its existing authorized-account cloud synchronization and analytics, so its privacy/Data safety declarations differ from Local. The Firebase edition is not converted into a public multi-user backend by this release.

Release build checks are necessary but do not confer Play approval. Before production, complete Play Console account verification, policy/foreground-service/full-screen declarations, a public and in-app privacy policy, Data safety, content rating/audience, financial-features declaration for expense tracking, listing assets and the required testing for the developer account. Screen time requires an explanatory Usage access flow. Alarms use user-granted SCHEDULE_EXACT_ALARM. No notification-listener, SMS, contact, accessibility-service, broad photo or microphone permissions are added. Remaining nonblocking lint warnings are recorded in release check results.

See `MANTRA-LOCAL-PLAY-REVIEW.md` for the original review and official references; version-specific counts there describe the older 2.9.2 candidate.


## Verification completed on 3 November 2026

- 164 JS/UI/model tests passed across 41 files; the website's edition-specific download tests also passed.
- The 11 new-feature instrumentation tests passed on each APK variant (22 variant checks), using the API 37 development emulator. These cover monthly dates, Add/Set total idempotency including pending focus time, screen-time configuration, durable focus, task completion independence, delete-after-done, exactly seven widget registrations/dimensions, actual task/calendar WebView screens, screen-off versus leaving-app behavior, notification reply actions and the local network-permission restriction.
- An additional 15 linked-alarm and frequent-reminder regressions passed on the local emulator run.
- Both release lint checks passed with zero errors. Nonblocking warnings remain (174 Local / 176 Firebase in the initial 2.10.0 release check); final artifact verification records the current counts.
- Existing five Android screen-time unit tests passed for both editions during release build checks.
- Task and calendar screenshots were inspected. Calendar selection styling is explicitly scoped above the editorial button reset.
- Signed release artifacts and unchanged-debug-key website update APKs are built separately. APK signatures, bundletool validation, final permissions/provider count, local Firebase endpoint exclusion and SHA-256 files are verified before publication.

Play Console review, a public privacy policy and real manufacturer/device testing remain external release gates, not claims made by these automated checks. No Play Console submission is performed here.
