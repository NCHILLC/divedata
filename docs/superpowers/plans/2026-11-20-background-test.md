# Background test Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A throwaway test build that re-reads one DiveMeets page every 30 seconds for 30 minutes with the screen off, logs every read, and shows a pass/fail result.

**Architecture:** A local Expo module (`modules/background-test`, Kotlin) runs an Android foreground service with a partial wake lock and a native 30-second timer, writes the log file and posts notifications. A test screen holds a hidden `react-native-webview`, reloads it on each tick, classifies the page and logs the result. Pure log helpers in `src/spike/` turn the log into a summary.

**Tech Stack:** Expo SDK 58, Expo Modules API (Kotlin), react-native-webview (MIT), Jest.

**Spec:** `docs/superpowers/specs/2026-11-20-background-test-design.md` (parent: `docs/superpowers/specs/2026-11-20-divedata-design.md`)

## Global Constraints

- Branch `spike/background-test`, draft pull request titled `spike: background test (do not merge)`. Never merged; never `gh pr merge`.
- Interval exactly 30 seconds, run length at most 30 minutes, only the one page the person chose.
- The app never solves or works around the bot check; on a check it logs, notifies and stops reading.
- Nothing leaves the phone except through the person tapping **Share log**.
- No new production dependency except `react-native-webview` (installed with `npx expo install react-native-webview`); `npm run check:licenses` must pass.
- Screens never import `src/divemeets/reader` (unchanged; spike code lives in `src/spike/`).
- Tests never call DiveMeets. Every check in AGENTS.md "Done means" passes, plus the `android` CI job.
- Controls the person taps: `accessibilityLabel`, touch target at least 48.

## Review Focus

1. Android closes the app mid-run: the native log still holds the ticks up to that point, and the summary says "stopped early at mm:ss" instead of crashing on a short log. (Task 1 test `stoppedEarly`)
2. The bot check appears mid-run: counted as a check, reading stops, verdict fails with "DiveMeets asked for a check". (Task 1 test `check stops the run`)
3. A tick arrives while the previous read is still loading: logged as `busy`, counted as a missed read, no second load starts. (Task 1 test `busy`; Task 3 screen guard)
4. No signal or a page error: logged as `error`, counted, run continues. (Task 1 test `errors`)
5. Notification permission denied: the run still works; the summary says "Alerts were off". (Task 1 test `alertsOff`)

---

### Task 1: Log helpers (pure)

**Files:**
- Create: `src/spike/log.ts`
- Test: `src/__tests__/spike-log.test.ts`

**Interfaces:**
- Produces:
  - `type LogEntry = { kind: 'tick'; seq: number; nativeAt: number; jsAt: number } | { kind: 'read'; seq: number; startedAt: number; endedAt: number; result: 'page' | 'check' | 'error' | 'busy'; fingerprint?: string } | { kind: 'start'; at: number; url: string; alertsOn: boolean; batteryOptimized: boolean; powerSave: boolean } | { kind: 'stop'; at: number; reason: 'done' | 'stopped' | 'check' }`
  - `parseLog(text: string): LogEntry[]` — one JSON object per line; skips lines that do not parse.
  - `classifyPage(page: { title: string; text: string }): 'page' | 'check'` — `check` when the title is "Just a moment..." or the text contains "Verify you are human" or "Checking your browser" (case-insensitive).
  - `fingerprint(text: string): string` — a stable short hash (djb2 to hex is fine).
  - `type Summary = { planned: number; ticks: number; pages: number; checks: number; errors: number; busy: number; longestGapSeconds: number; maxJsDelaySeconds: number; pageChanges: number; stoppedEarlyAt: string | null; alertsOn: boolean; batteryOptimized: boolean; powerSave: boolean; pass: boolean; reasons: string[] }`
  - `summarize(entries: LogEntry[], plan?: { intervalSeconds: number; minutes: number }): Summary` — default plan 30 s / 30 min, so `planned` = 60. Gap = time between consecutive ticks' `nativeAt` (first gap from `start`), so it measures the timer; stalled reads show in `pages`. `pageChanges` = reads whose fingerprint differs from the previous page read. Pass = `pages >= 54 && longestGapSeconds <= 45 && checks === 0`. `reasons` holds one plain sentence per failed condition, plus "Alerts were off" and "Stopped early at mm:ss" when they apply.

- [ ] **Step 1: Write the failing tests** in `src/__tests__/spike-log.test.ts`:
  - `parseLog skips bad lines`: two valid lines and `"not json"` → length 2.
  - `classifyPage`: `{ title: 'Just a moment...', text: '' }` → `'check'`; text `'Please verify you are human'` → `'check'`; `{ title: 'Event Results', text: 'Round 1' }` → `'page'`.
  - `fingerprint` equal for equal text, different for different text.
  - `clean run passes`: a built log of `start` + 60 ticks + 60 `page` reads 30 000 ms apart, two fingerprints → `pass: true`, `pages: 60`, `pageChanges: 1`, `longestGapSeconds: 30`, `reasons: []`.
  - `stoppedEarly`: same but only 20 reads and no `stop` entry → `pass: false`, `stoppedEarlyAt: '10:00'`, reasons contains `'Stopped early at 10:00'`.
  - `check stops the run`: 10 page reads then one `check` read and `stop` reason `check` → `checks: 1`, `pass: false`, reasons contains `'DiveMeets asked for a check'`.
  - `busy`: one `busy` read among 60 → `busy: 1`, `pages: 59`, still passes.
  - `errors`: 7 `error` reads among 60 → `errors: 7`, `pages: 53`, `pass: false`.
  - `alertsOff`: `start.alertsOn = false` → reasons contains `'Alerts were off'` (does not by itself fail the run).
  - `long gap`: one gap of 61 s → `longestGapSeconds: 61`, `pass: false`.
- [ ] **Step 2: Run** `npx jest src/__tests__/spike-log.test.ts` — expected FAIL, module not found.
- [ ] **Step 3: Implement** `src/spike/log.ts` with the signatures above.
- [ ] **Step 4: Run** `npx jest src/__tests__/spike-log.test.ts` — expected PASS; then `npm run typecheck && npm run lint`.
- [ ] **Step 5: Commit** `feat(spike): log helpers for the background test`.

### Task 2: Native background module

**Files:**
- Create with `npx create-expo-module@latest --local background-test`, then edit: `modules/background-test/index.ts`, `modules/background-test/expo-module.config.json` (Android only), `modules/background-test/android/src/main/AndroidManifest.xml`, `modules/background-test/android/src/main/java/org/divedata/backgroundtest/BackgroundTestModule.kt`, `.../BackgroundTestService.kt`. Delete the template's web and iOS files and its example view.

**Interfaces:**
- Consumes: the `LogEntry` line format from Task 1 (the module writes `tick` and `stop` lines itself as JSON, with `jsAt` filled in by JS — see below).
- Produces (TypeScript, `modules/background-test/index.ts`):
  - `start(intervalSeconds: number, minutes: number): void` — starts the foreground service.
  - `stop(): void` — stops it; the service writes `{kind:'stop', reason:'stopped'}`.
  - `appendLog(line: string): void`, `readLog(): Promise<string>`, `clearLog(): void` — the log file in the app's files folder, `background-test.log`.
  - `notify(title: string, body: string): void` — an ordinary (not ongoing) notification.
  - `phoneState(): { batteryOptimized: boolean; powerSave: boolean; alertsOn: boolean }`.
  - Event `onTick: { seq: number; nativeAt: number }` and event `onFinished: { reason: 'done' | 'check' | 'stopped' }`.
  - JS writes the `tick` line on receipt (`jsAt = Date.now()`), so a frozen JS thread shows as `jsAt - nativeAt`.
- Native requirements:
  - Manifest: permissions `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_SPECIAL_USE`, `POST_NOTIFICATIONS`, `WAKE_LOCK`; the service with `android:foregroundServiceType="specialUse"` and property `android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE` = `Re-reads one public results page every 30 seconds while the person follows a live event`.
  - Service: ongoing notification "DiveData background test" / "Reading every 30 seconds", with a Stop action; `PARTIAL_WAKE_LOCK` with a timeout of `minutes` + 1; a `Handler` on the main looper posts a tick every `intervalSeconds` (sending `onTick` through the module), then stops itself after `minutes` and writes `{kind:'stop', reason:'done'}`.
  - `phoneState`: `PowerManager.isIgnoringBatteryOptimizations` (inverted), `isPowerSaveMode`, `NotificationManagerCompat.areNotificationsEnabled`.

- [ ] **Step 1: Generate the module and strip it to Android.** `npx expo prebuild --platform android --no-install` must list `background-test` as autolinked (check `android/settings.gradle` or the prebuild output); delete `android/` after (it is never committed).
- [ ] **Step 2: Write the Kotlin service and module** to the requirements above.
- [ ] **Step 3: Verify the build compiles.** Push the branch and open the draft PR (title above, body says "Throwaway, do not merge"); expected: the `android` job passes. A local `./gradlew assembleRelease` is optional (heavy on this PC).
- [ ] **Step 4: Run** `npm run typecheck && npm run lint && npm test && npm run check:licenses`. Expected: all pass.
- [ ] **Step 5: Commit** `feat(spike): native foreground service for the background test`.

### Task 3: Test screen

**Files:**
- Create: `src/app/background-test.tsx`, `src/spike/useBackgroundTest.ts`
- Modify: `src/app/index.tsx` (add a "Background test" link below the existing text), `package.json` (react-native-webview via `npx expo install react-native-webview`)
- Test: `src/__tests__/background-test.test.tsx`

**Interfaces:**
- Consumes: Task 1 `parseLog`, `classifyPage`, `fingerprint`, `summarize`; Task 2 module API.
- Produces: route `/background-test`.
- Behaviour:
  - Choose stage: a link field (accepts only URLs starting `https://secure.meetcontrol.com/divemeets/`) plus **Open**; a visible WebView starting at `https://secure.meetcontrol.com/divemeets/system/`; **Use this page** stores the WebView's current URL. **Start test** is disabled until a page is chosen.
  - Start: request `POST_NOTIFICATIONS` with React Native's `PermissionsAndroid`; `clearLog()`; write the `start` line using `phoneState()`; `start(30, 30)`. The WebView stays mounted at 1×1 with opacity 0.
  - On `onTick`: write the `tick` line; if a read is in progress write a `busy` read and do nothing else; otherwise `reload()`. On load end, `injectJavaScript` posts `{ title: document.title, text: document.body.innerText }` back; on message write a `read` line with `classifyPage` and `fingerprint`. On a load error write an `error` read.
  - A changed fingerprint (not the first read) → `notify('The page changed', 'At <time>')`. A `check` → `notify('DiveMeets wants a check', 'Open DiveData to see it.')`, `stop()`, show the WebView again.
  - On `onFinished` or when the screen opens with a log present: show the result from `summarize(parseLog(await readLog()))` in plain words, the verdict first, and **Share log** (`Share.share` with the summary followed by the log).
- [ ] **Step 1: Write the failing test** `src/__tests__/background-test.test.tsx`, with `jest.mock` for `react-native-webview` and the module (`modules/background-test`): renders the heading "Background test"; **Start test** has `accessibilityState.disabled === true` before a page is chosen; after pressing **Use this page** it is enabled; given a mocked `readLog` returning a clean 60-read log, the result shows "Passed".
- [ ] **Step 2: Run** `npx jest src/__tests__/background-test.test.tsx` — expected FAIL.
- [ ] **Step 3: Implement** the screen and hook; `npm run check:layers` must still pass.
- [ ] **Step 4: Run** every check in AGENTS.md "Done means". Expected: all pass.
- [ ] **Step 5: Commit** `feat(spike): background test screen`, push, and wait for CI on the draft PR. Expected: `checks` and `android` green.

### Task 4: Put the APK on the phone and run the test

- [ ] **Step 1:** `gh run download <run id> -n divedata-test-apk -R NCHILLC/divedata` into the scratchpad, copy the APK to `C:\Users\aaron\CrossDevice\Pixel 9 Pro XL\storage\Download\DiveData-background-test.apk`. If Android refuses to install it over the old copy (a different test key), uninstall DiveData first.
- [ ] **Step 2 (maintainer):** Run 1, any time, any DiveMeets results page: Home → Background test → open the page → Use this page → Start test → lock the phone for 30 minutes → unlock → Share log (save it to Downloads or paste it in chat).
- [ ] **Step 3 (maintainer):** Run 2, during a live meet, on an event page posting scores. Same steps.
- [ ] **Step 4:** Read each shared log; check its numbers against the summary.

### Task 5: Record the result

**Files:**
- Create (on a new branch from `origin/main`, e.g. `docs/background-test-result`): `docs/decisions/2026-MM-DD-background-test-result.md`, plus copies of the design and this plan.
- Modify, only if the result changes it: "Live meet mode" in `docs/superpowers/specs/2026-11-20-divedata-design.md`.

- [ ] **Step 1:** Write the result note: date, phone and Android version, each run's summary numbers, verdict, and which row of the design's "What each result means" table applies.
- [ ] **Step 2:** Open the PR; it merges once checks pass (docs, not on the "merge it" list).
- [ ] **Step 3:** Close the spike PR unmerged with a comment linking the result PR; delete the spike branch.
