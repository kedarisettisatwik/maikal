# MANTRA 2.10.2

Both APK editions, version code 42. Website changes only the APK download links.

- Time-tracker goals display exactly two decimal places for current minutes and target labels, including APK reports, goal widget values/targets and notifications. Count trackers retain their existing formatting.
- Formatting is display-only. Full stored precision and scoring thresholds are preserved. Focusing and leaving an unchanged input does not save the rounded display value. Explicit edits retain their entered precision.

Both editions retain the previous signing identities for website updates and separate Play bundles. Local remains offline with no Internet permission or Firebase uploads. Existing installations from the website can update without uninstalling.

Verification includes goal input/precision and report rendering tests, native widget/notification formatting checks, both release builds/lint/unit tests, signatures, bundletool validation and Local offline endpoint exclusion. Release lint has nonblocking warnings. Play Console review and required declarations/testing remain external gates; no Play submission is made.
