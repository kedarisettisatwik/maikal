# MANTRA 2.10.1

Both Android editions. Version code 41. Website changes only the APK download links.

- Add spacing above Completion in More.
- Recalculate daily and overall completion when goals are deleted, excluding deleted goals from historical snapshots too. With no eligible items, show No scheduled items rather than a stale percentage.
- Add Start over in More, with confirmation. It excludes dates before today from scoring and immediately counts today's completed eligible goals/tasks. It preserves all diary data and progress. The scoring start date is persisted locally and synchronized by the Firebase edition.
- Home and all-task lists show only the task title, completion checkbox and small deadline/time metadata. Tap the title for a dedicated detail view with description, total time, target, Edit/Delete and enabled Focus controls.
- Screen-time widget is now 2 wide x 1 high and shows only today's total time. No title, app list, timestamp or extra footer. It follows light/dark/system; tap opens Track. Without usage access it shows a setup prompt. Existing larger widgets may need removing and re-adding to use the new default size.

The Local edition retains no Internet permission or Firebase uploads. Website update APKs retain the existing signing key; normal updates do not require uninstalling. Separate Play APKs/AABs use the existing upload key and must not be installed over a differently signed diary by uninstalling it without a backup.

Signed AAB validation, permission/signature verification, release lint, unit tests and focused widget checks are performed before publication. Google Play review, public privacy policy, declarations, listing and required developer-account testing remain external gates; no Play submission is performed.

## Verification

- Full app suite: 168 tests passed across 41 files before the final task-view change. The final targeted task/scoring/dashboard run passed all 34 tests, including compact rows, completion, details and edit navigation.
- Both APK editions passed the two focused Android widget checks: exactly seven supported widgets with correct dimensions, and actual total-only screen-time RemoteViews inflation.
- Both release builds and lint checks passed; nonblocking lint warnings are recorded in release-verification.json. Five Android unit tests per edition passed. APK/AAB signatures, bundle validation and Local offline restrictions are checked before publishing.
