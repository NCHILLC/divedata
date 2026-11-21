# Background test (throwaway)

*Design · short · milestone 2 of the [DiveData design](2026-11-20-divedata-design.md)*

2026-11-20 · **[yours]** = the maintainer decided it · **[my call]** = the planning agent filled it in

## Why

"Up next" alerts only work if the phone can keep re-reading a DiveMeets event page while it sits in a
pocket with the screen off. Two things could stop that: DiveMeets' bot check, and Android pausing the
app. This test answers both before anything else is built on the idea. **[yours]** (build order step 2)

## Goals

- Follow one real DiveMeets page for 30 minutes with the screen off, re-reading it every 30 seconds,
  the way live meet mode will. **[yours]**
- Record every planned read: did it happen on time, did a real page come back, did the bot check
  appear, did it fail. **[my call]**
- Send a phone notification when the page changes (a new score), to prove an alert can reach a locked
  phone. **[my call]**
- End with a plain verdict on one screen, and a log the maintainer can share back. **[my call]**

## Non-goals

- No parsing, scores, divers or "up next" logic. The page is only fingerprinted to see if it changed.
- No design polish. Only the maintainer uses this screen.
- None of this code is kept. **[yours]** ("throwaway")

## Anti-goals (a failure even if it "works")

- Solving or getting around the bot check. If it appears, the test logs it and tells the person; it
  never solves it.
- Reading faster than every 30 seconds, or any page other than the one the person chose.
- Sending anything anywhere. The log stays on the phone until the person shares it.

## Approaches

| Option | Good | Costs |
|---|---|---|
| **A. Hidden in-app browser kept awake by a small Android "foreground service" with a native 30-second timer** (picked) | The same pieces live mode will use, so a pass means the design holds. The native timer keeps ticking even if Android freezes JavaScript, and the log shows which part stalled. | About 150 lines of Kotlin in a local Expo module. |
| B. Same, but the timer in JavaScript (or an off-the-shelf background-task library) | Less native code. | Reports say Android freezes JavaScript timers with the screen off even under a foreground service; a fail would not say whether the timer or the browser stalled. |
| C. Plain web requests reusing the browser's DiveMeets cookie, no browser | Light on battery. | Close to getting around the bot check, which is on the never list. Dropped. |

Android's other background tools (WorkManager, background fetch) run at most every 15 minutes, too slow
for "up next". Notifee, the usual foreground-service library, was archived in April 2026, which is
another reason for a small module of our own. **[my call]**

## Design

- **Where it lives:** branch `spike/background-test`, opened as a draft pull request so CI builds the
  test APK. Never merged. **[my call]**
- **Screen** (`/background-test`, linked from Home on this branch only): a visible in-app browser
  opens DiveMeets, or a pasted DiveMeets link. The person passes the bot check themselves if it shows,
  goes to the page to follow, and taps **Use this page**, then **Start test**.
- **While running:** an ongoing notification ("DiveData background test · reading every 30 seconds").
  The service holds a partial wake lock (the processor stays on, the screen stays off) for at most the
  30 minutes, as live mode would. **[my call]** The browser stays loaded but hidden. Every 30 seconds the native timer ticks; the screen reloads the
  page and logs the result. A changed page sends "The page changed". The bot check sends "DiveMeets
  wants a check. Open DiveData." and the test stops reading. Stops after 30 minutes or on **Stop**.
- **Log:** one line per tick and per read, written by the native module to a file on the phone, so it
  survives if Android closes the app. Tick lines carry the native time and the time JavaScript got the
  tick, so a freeze shows up as a delay.
- **Result screen:** reads planned, reads done on time, real pages, bot checks, failures, longest gap,
  page changes, whether battery saver or battery optimisation was on, and a pass/fail verdict.
  **Share log** opens Android's share sheet with the summary and the full log.
- **Pass** **[my call]**: at least 54 of 60 reads returned a real page, no gap longer than 45 seconds,
  no bot check. With a live meet, also at least one "page changed" notification seen while locked.

## How it is run

1. **Any time (static page):** 30 minutes on any DiveMeets results page. Answers "does reading keep
   going with the screen off".
2. **During a live meet:** 30 minutes on an event page that is posting scores. Answers "do alerts
   reach a locked phone". Any live meet works from home; the person does not need to be at the pool.

Both on the phone's default settings (battery optimisation on), since that is what parents have.

## What each result means

| What the log shows | What it means for "up next" |
|---|---|
| Pass | Live mode can be built as designed. |
| Ticks on time, reads stall | Android pauses the hidden browser. Next try: give the browser to the service itself. |
| Ticks late or missing | Android sleeps the phone despite the wake lock. Next try: exact alarms. |
| Bot check mid-run | Hidden reading cannot last. Alerts need the person to reopen the app at times. |
| Log stops early | Android closed the app. Check battery settings; may need a "don't optimise" prompt. |

## After the test

A short follow-up pull request adds this design, the plan and a dated result note to
`docs/decisions/`, and updates "Live meet mode" in the main design if the result changes it. The spike
pull request is then closed unmerged. **[my call]**

## Left to the builder

Exact wording of the test screen, layout, the fingerprint method, file names inside the module.
