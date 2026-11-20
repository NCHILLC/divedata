# The CI test APK is a release build

2026-11-20: The `android` CI job runs `./gradlew assembleRelease` and uploads the APK as artifact `divedata-test-apk`.

Why: a debug APK has no JavaScript bundle; it expects a dev server on the computer and shows "Unable to load script" on a phone. A release build carries the bundle and opens on its own. Expo's template signs release builds with the debug keystore, so CI needs no secret. This APK is for testing only: real releases are signed with the release key.
