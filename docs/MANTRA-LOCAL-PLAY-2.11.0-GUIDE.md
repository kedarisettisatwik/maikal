# Google Play upload files — MANTRA Local 2.11.0

Prepared 4 November 2026. Package: `com.maikal.daily.local`. Version name: `2.11.0`. Version code: `43`. Minimum Android: 8.0 (API 26). Target: Android 16 (API 36).

Extract this folder. Do not upload the ZIP itself as an app.

| File | Where it goes |
|---|---|
| `01-app-bundle/MANTRA-Local-Play-2.11.0.aab` | Play Console > Testing > Internal testing > Create release. This is the app binary to upload. |
| `02-store-artwork/icon-512.png` | Main store listing > App icon (512 × 512 PNG). |
| `02-store-artwork/feature-graphic-1024x500.png` | Main store listing > Feature graphic (1024 × 500 PNG). |
| `03-phone-screenshots/01-home.png` | Main store listing > Phone screenshots. |
| `03-phone-screenshots/02-money.png` | Phone screenshots. |
| `03-phone-screenshots/03-notes.png` | Phone screenshots. |
| `03-phone-screenshots/04-calendar.png` | Phone screenshots. |
| `03-phone-screenshots/05-task.png` | Phone screenshots. |
| `04-listing-text/en-US/title.txt` | Paste into App name (under 30 characters). |
| `04-listing-text/en-US/short-description.txt` | Paste into Short description (under 80 characters). |
| `04-listing-text/en-US/full-description.txt` | Paste into Full description (under 4,000 characters). |
| `04-listing-text/en-US/release-notes.txt` | Paste into Release notes for English (US). |
| `05-policy-and-forms/privacy-policy-local.html` | Public policy source; the hosted URL below is what Play Console needs. |
| `05-policy-and-forms/play-console-answers.md` | Reference for Data safety, permissions and App content; enter/review answers in Play Console. |
| `05-policy-and-forms/alarm-demo.mp4` | Demonstration evidence, when present. Host as an accessible/unlisted video and supply its URL if the FGS/full-screen declaration asks for one. |
| `verification.json` and `SHA256SUMS.txt` | Your review/integrity records; not listing fields. |

Public privacy policy URL: https://kedarisettisatwik.github.io/maikal/launch/privacy.html
Website: https://kedarisettisatwik.github.io/maikal/launch/
Public support/privacy email: satwik1330@gmail.com
Suggested main category: Productivity. There are no ads or in-app purchases in this build.

## What you still do in Play Console

1. Verify your developer account and device if requested. Create the app with the correct package identity. The public developer name/address/phone and distribution countries are account decisions, not generated files.
2. Enable Play App Signing. Upload the Local AAB into Internal testing first. The private upload key stays outside this package. Do not upload a website/debug APK, the Firebase AAB, a private keystore or its password.
3. Fill in the store listing using the files above. Review image/logo ownership and text. Screenshots show actual Local APK UI with demonstration records, not a connected user's diary.
4. Add the public privacy policy URL. The app also includes the full policy under More > Privacy policy, available offline.
5. Complete Data safety, App access, Ads, content rating, target audience, financial features and permissions/declarations. Use the supplied factual guide, but answer Play's current questions yourself. Do not claim alarm auto-grant eligibility merely because alarms are available inside a planner.
6. Upload/provide an accessible demonstration video URL when requested for the ringing alarm foreground service/full-screen intent. Complete a physical-phone test of sound, Snooze/Stop, locked-screen behavior, reboot rescheduling, notification replies and optional Usage access. Device vendors can impose additional restrictions.
7. Review the pre-launch report and fix any blocking issues. For eligible new personal accounts, closed testing requires at least 12 continuously opted-in testers for 14 days before applying for production access. This is account-specific.
8. Select countries, pricing and release track and submit for Google's review. No submission or approval was performed by this preparation.

## Existing installations and signing

The website update APKs are non-debuggable release builds that preserve the old website signing identity and can update matching website installations. The Play AAB uses the existing upload key and Google Play signs delivered APKs using Play App Signing. A differently signed Play build cannot update an existing debug-signed local diary. Do not uninstall or clear app storage to force installation: Android backup is disabled and there is no complete export/import tool. Use a clean test device/profile for Play testing, or keep the old installation until a data migration plan exists.

## Firebase edition is separate

Both editions have the same base version and shared diary features, including daily notes/calendar, tasks, goals, events, notes, expenses, time tools, percentages, themes and seven widgets. Local intentionally has no Internet permission/cloud analytics. Firebase intentionally adds authorized-account synchronization, existing private feeds and cloud usage reporting. Its package is `com.maikal.daily`; it is not a public multi-user service and needs separate access instructions, privacy/Data safety answers and declarations if submitted separately.

## Official references checked

- Target API: https://support.google.com/googleplay/android-developer/answer/11926878
- Listing assets: https://support.google.com/googleplay/android-developer/answer/9866151
- User Data/privacy: https://support.google.com/googleplay/android-developer/answer/10144311
- Data safety: https://support.google.com/googleplay/android-developer/answer/10787469
- Foreground service/full-screen: https://support.google.com/googleplay/android-developer/answer/13392821
- Financial declaration: https://support.google.com/googleplay/android-developer/answer/13849271
- Personal-account testing: https://support.google.com/googleplay/android-developer/answer/14151465
