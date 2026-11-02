# MANTRA Local: Google Play review and upload checklist

Reviewed 2 November 2026. Package `com.maikal.daily.local`; version `2.9.2-local`, code `38`; min Android 8.0/API 26, target/compile API 36. This is the local edition only. The website and Firebase APK downloads have not been replaced.

## Result

A signed release Android App Bundle and a signed release APK have been prepared. Upload the **.aab**, not the APK, to a new Google Play app. This is technically validated release material, not a claim of Google approval. Production publication still requires the policy, listing and testing items below. Nothing has been submitted to Play Console.

## Changes completed during this review

- Removed all local-edition usage reporting, anonymous Firebase sign-in and Firebase analytics REST code from the local bundle through a build-time module replacement. Added a defensive local-mode guard in the shared reporter. Firebase-edition reporting remains available.
- Removed `android.permission.INTERNET` from the merged local manifest. User-selected saved links still open through another app/browser. MANTRA Local cannot perform its own network requests.
- Local guide now explains on-device privacy. Retired analytics tokens/report timestamps are cleared without touching diary data. Previously uploaded analytics are not retroactively deleted by this update.
- Fixed Android 8.0 ringing-screen calls to APIs introduced in Android 8.1, with older window flags as fallback.
- Moved Android 8.1 navigation-bar resource attributes into API-qualified resources.
- Replaced numeric orientation/typeface constants flagged by Android lint. Documented the intentional Usage access permission with a narrow lint suppression; it remains user-controlled Android special access.
- Corrected the local Android SDK properties path for release lint.
- Added opt-in release signing via environment variables. A new private upload key was created locally with a Windows-protected password. No private signing material is included in source, release downloads or email.

## Verification

| Check | Result |
|---|---|
| Existing JS/UI suite | 154 passed in the final full run (40 test files), including the new local privacy tests. |
| Android unit tests | 5 ScreenTime tests passed |
| Release lint | 0 errors, 136 warnings; initial review had 16 errors |
| Release APK/AAB | `assembleLocalRelease` and `bundleLocalRelease` passed |
| Bundle structure | Google's bundletool validate passed |
| APK signing | apksigner verifies the new MANTRA Upload certificate |
| AAB signing | jarsigner verifies the signed bundle; a self-signed upload certificate is expected |
| Release manifest | API 36; version code 38; no debuggable flag; no Internet permission |
| Local packed JS | No Firebase Auth, token, Firestore endpoints or appUsage collection marker |
| Native C/C++ libraries | None packaged; no native ELF page-alignment issue found |
| npm production vulnerability audit | 0 known reported production dependency vulnerabilities at review time; not a complete security guarantee |
| Fresh device/emulator tests | NOT RUN: no connected device/emulator was available |

The 136 warnings are not 136 demonstrated runtime failures. They include small text, hardcoded strings, RTL layout, old/unused resource attributes, launcher icon differences, custom touch accessibility, dependency and backup-rule warnings. Accessibility and large-font checks remain part of the device test gate. Existing custom alarm controls include accessibility actions, but need TalkBack testing.

## Feature-by-feature findings

| Area | Reviewed behavior / remaining check |
|---|---|
| Goals | Local persistence; checkbox/tracker targets; scheduled dates; inclusive target rules; scores/history; UI/model tests pass. Verify updates survive process death and reboot on a real device. |
| Events | Timed/all-day forms; repeating schedules; notification/alarm settings; local persistence. Verify timezone changes and no duplicate delivery. |
| Money | Amounts remain integer paise; rupees display and chart calculations; remembered filters; income/expense/category editing. No bank integration, payment transfer, SMS reading or payment notification listener found. |
| Notes | Text/link/checklist storage; optional descriptions; formatting/link validation; editable opening; deletion confirmation; tags/source filters. Android share receiver takes text only, bounds text and queue sizes, and preserves pending drafts. No image/file attachment capture is promised. |
| Notifications | Completion and tracker reply use a durable native outbox; adds extra tracker counts. Frequent reminders support overnight windows and target-based suppression. Verify permission denial, Doze, midnight and duplicate prevention on device. Android may delay frequent notifications while idle; do not promise every-minute exactness. |
| Alarms | Real alarm audio foreground service, five-minute snooze, stop, ten-minute advance notification and occurrence-specific Dismiss are implemented. Use full-screen permission only for genuine alarms. Check denied/revoked access, lock screen, simultaneous alarms, reboot and time changes. |
| Timer/stopwatch | Local native timing and saved state; timer rings through alarm service. Tools pause after restart as documented. Permission-denied and long-running tests remain. |
| Screen time | Usage access is explained before settings. Local app names/durations/totals stay on device. Permission is optional for the diary; test revocation, empty data, split-screen, timezone and older Android. |
| Widgets | Goals/events, notes, money, screen time, custom shortcuts and theme logic inspected. Test pin, resize, launcher differences, reboots, accessibility and both themes on physical devices. |
| Themes/navigation | Light/dark/system, back behavior and app version present. Large text, landscape, Android 15/16 edge-to-edge and tablets/foldables still require visual QA. |
| Accounts | No local sign-in/sign-up or Firebase record sync. Backend anonymous sign-up for local analytics has now been removed. Do not market local data as cloud-backed. |
| Security | App-private WebView storage and native preferences; backup disabled. No notification-listener/accessibility-service/SMS/contact/location/microphone/broad photo/QUERY_ALL_PACKAGES permissions in reviewed local manifest. Broad FileProvider paths are unused legacy configuration and should be narrowed/removed in future cleanup. No evidence of an active exploit is claimed. |

## Important: existing users and signing

The old website APK was **Android Debug-signed** and debuggable. The release files use a new MANTRA Upload key. Android will not install them over the old APK with a different certificate. Google Play normally signs delivered APKs with its Play App Signing key, which can also differ from the upload-key-signed test APK.

**Do not uninstall an existing local installation containing data.** There is currently no full diary export/import UI and automatic backup is disabled. Clearing storage or uninstalling loses the local diary. Use an empty test device/profile for the release APK. Before migrating existing users to Play, implement and test an explicit export/import path, or retain the old installation until a migration plan is ready. Merely increasing versionCode cannot fix a certificate mismatch. This does not prevent a fresh-install closed test for new testers.

## Play Console upload steps

1. Create/verify your developer account. Select app name MANTRA and package `com.maikal.daily.local`. Keep the package stable for future releases. Enter developer/support contact information, app category, countries, free/paid status and target audience accurately.
2. Enable **Play App Signing**. Upload `MANTRA-Local-2.9.2.aab` into Internal testing first. Keep the new upload key for subsequent uploads. Do not upload the debug APK or private keystore. The APK supplied here is for clean-device testing, not the new-app Play submission.
3. Publish a public, non-PDF **Privacy Policy** URL and add an in-app policy entry before production. Include MANTRA/developer identity, contact, local storage, app-usage access, reminders/alarms, external link handling, data loss/deletion and retention. The existing On-device privacy explanation is useful but is not yet the complete public policy/link. An offline-only app still needs a policy.
4. Complete **Data safety** for the shipped local build. This build has no analytics/network permission and does not transmit its diary or usage history. Subject to checking all final dependencies and optional external integrations, no app-collected/shared data is the expected answer. On-device-only processing is different from data transmitted off-device. Do not reuse the Firebase edition's answers.
5. Complete the declarations requested in App content: app access (no login), ads (none found), content rating, target audience, Financial features (describe manual income/expense tracking accurately; do not claim banking/lending), foreground-service type and full-screen intent. Describe actual ringing alarms and attach the demonstrations/evidence Play Console asks for. Keep `SCHEDULE_EXACT_ALARM`, not the automatically granted `USE_EXACT_ALARM`.
6. Prepare a 512x512 listing icon, 1024x500 feature graphic, at least two clear phone screenshots, short/full descriptions and support email. Use real current UI. Promote local goals/events, expense diary, notes, alarm/timer tools, screen time and widgets. Do not advertise Firebase sync, AI, Assistant voice entry or removed photo editing in this local listing. Verify rights/licences for all assets.
7. Install through Internal testing and inspect Play's pre-launch report. Test API 26, 27, 33, 34, 35 and 36 where feasible, a 16 KB environment, common manufacturer devices, dark/light/system, large fonts and offline startup. A bundle validation pass does not replace these tests.
8. For personal accounts created after 13 November 2023, meet Google's closed-test requirement: at least **12 testers opted in continuously for 14 days**, then apply for production access. Account eligibility and the actual Console can add requirements. Do not treat this code review as that test.
9. Resolve pre-launch/review findings, publish the policy and finalize declarations before production rollout. Do not promise uninterrupted alarms after force-stop: Android restricts force-stopped apps until reopened.
10. Back up signing materials securely before changing computers. The private key and Windows-protected password are in `.publish/mantra-play-signing/` inside the APK worktree. The password encryption is tied to the current Windows user/machine; copying only that encrypted password file to another computer is insufficient. Store a usable backup securely; never put keys/passwords in GitHub or email.

## Priorities remaining

**Before production:** public/in-app privacy policy, Play declarations/listing, physical-device and pre-launch testing, and a safe export/import migration for existing debug users. **Recommended:** make the seven daily check-in notifications opt-in with quiet hours; currently they are inserted automatically, including 01:00, and only channel/app settings can silence them. Ordinary encouragement should use inexact scheduling rather than consume exact-alarm privileges. Allow notification-only fallback if users decline full-screen alarms; current alarm setup requires full-screen access. Add a clear local data deletion/export workflow, narrow FileProvider paths and address accessibility warnings.

No account credentials, uploaded diary data or private signing keys are part of this report. The Firebase APK and website were not deployed as part of this local release.

## Official references checked

- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- New-app setup / App Bundles: https://support.google.com/googleplay/android-developer/answer/9859152
- Signing and update compatibility: https://developer.android.com/studio/publish/app-signing
- Privacy policy and User Data: https://support.google.com/googleplay/android-developer/answer/10144311
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Alarm/full-screen permissions: https://support.google.com/googleplay/android-developer/answer/16558241
- Foreground service types: https://developer.android.com/develop/background-work/services/fgs/service-types
- Personal-account testing: https://support.google.com/googleplay/android-developer/answer/14151465
- Listing graphics: https://support.google.com/googleplay/android-developer/answer/9866151
- Financial features declaration: https://support.google.com/googleplay/android-developer/answer/13849271
- 16 KB pages: https://developer.android.com/guide/practices/page-sizes
