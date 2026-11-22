# Testing live mode without a phone or a meet

Live mode only shows its alerts while a board moves, and real boards move a few hours a week. The pretend meet
is a made-up event on your own computer: 6 made-up divers, 3 rounds, one dive every 40 seconds, then the event
closes. A test build for the Android emulator reads it instead of DiveMeets, so every alert can be checked any
time, without a phone and without DiveMeets' check.

It does not test what only a real phone does: battery saving with the screen locked, maker rules (Samsung), or
DiveMeets itself. Do a phone run on a real meet before a release.

## What you need

- The Android emulator and an x86_64 system image (API 34, `google_apis`), with an AVD made from them.
  The emulator needs the Windows Hypervisor Platform on Windows, or KVM on Linux (`emulator -accel-check`).
- `adb` (Android platform-tools).
- The emulator test build: the `divedata-emulator-apk` artifact of the **Emulator build** workflow
  (`.github/workflows/emulator-build.yml`). Start one with `gh workflow run emulator-build.yml --ref <branch>`.
  Never install it on a phone a parent uses: it reads only the pretend meet.

## Steps

1. Start the pretend meet from the repo folder: `node scripts/pretend-meet.mjs` (or `node scripts/pretend-meet.mjs 30`
   for one dive every 30 seconds). It prints each page the app asks for. Restart it to start the event over.
2. Start the emulator: `emulator -avd <name>`.
3. Install the build: `adb install -r <path to the APK>`.
4. Open the pretend meet: `adb shell am start -a android.intent.action.VIEW -d divedata://meet/999001 org.divedata.app`.
   Both boards under "Live now" are the same pretend event.
5. On the board, open a pretend diver and follow them; follow a second one too. Go back to the board and tap
   **Follow live**, then allow notifications.
6. Watch it run (about 12 minutes at 40 seconds a dive):
   - the ongoing notification counts down and names the followed diver who dives soonest,
   - the "dives soon" alert when a followed diver is the chosen number of divers away,
   - the "up next" alert,
   - the move to round 2 and round 3,
   - once the event closes, the last alert and live mode stopping on its own.
7. Screen off: `adb shell input keyevent KEYCODE_SLEEP`. Deep battery saving: `adb shell dumpsys deviceidle force-idle`
   (undo with `adb shell dumpsys deviceidle unforce`). The pretend meet's log shows whether reads keep coming.

Read the notifications without looking at the screen:
`adb shell dumpsys notification --noredact | grep -E "android.title|android.text"`.
