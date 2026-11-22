# Live meet mode and "Up next" alerts (milestone 5)

*Design · 2026-11-21* · **[yours]** = the maintainer decided it · **[my call]** = the planning agent filled it in

## Why

A parent sits through a long session waiting for one diver. Live mode lets them put the phone away and
get a buzz before their diver dives, then glance at the place and score. It is version 1 goal 3 in
`docs/product.md` and build step 5 in `2026-11-20-divedata-design.md`.

## Goals

- From a meet in progress, open an event's live board: who dives next, my divers' place and score,
  how many divers are before them this round, and the standings. **[yours: start from the meet page]**
- "Follow live" keeps the board up to date every 30 seconds with the screen off, through the
  foreground service merged in PR 11.
- Alerts: one when a followed diver is N divers away, one when they are up next, once per round each.
  **[yours]** N is 3 by default, set 1 to 5 on the live screen, kept on the phone. **[yours]**
- Every diver the person follows who is on that board gets alerts (one page, no extra loads). **[my call]**
- Live mode keeps going while the person moves around the app; it stops on Stop (in the app or the
  notification), when the board says the event is closed, at the service's 4-hour limit, or when the
  app is swiped away.

## Not now

- Finding a followed diver's live event from Home (more page loads). **[yours: no]**
- A Settings screen. **[yours: no]**
- Counting divers across a round break (see "Divers away"). Comparing two divers and "what they need"
  are milestone 6.
- Following more than one event at a time (live mode follows one page; PR 11).

## Never (from AGENTS.md, as it applies here)

- No faster than every 30 seconds; the service refuses less. The board page itself refreshes every 22
  seconds while a person has it open, so this is lighter than a person.
- The app never answers DiveMeets' check. If it appears during live mode, the notification and the
  screen tell the person, who passes it on screen.
- Nothing leaves the phone. No new library: alerts use our own `modules/live-reader`.

## DiveMeets pages (from the saved pages in `fixtures/divemeets/live/`)

- The meet results page of a meet in progress links each running event as
  `livestats.php?event=stats-<meet>-<id>-<n>-Started` with the text "Unofficial Live Statistics!",
  under a bold event name with the stage in brackets: "Women 3m Championship (6 Dives) (Final)".
- The live board `livestats.php?event=…`: title "Unofficial Statistics" and the event name. A
  "Last Diver" box and a "Next Diver" box (name as a `profile.php?number=` link, "Diver Order: 7").
  "Current Round: 6 / 6". One table row per diver: a `*` in "Divers Left to Dive" when they have not
  dived this round, Diver Order, last round place and score, current place, current score, name link.
- The finished board says "This event is now closed." and has one row per diver: place, score, name.
  Its address ends in `-Finished`. Whether a `-Started` address still answers after the event closes is
  not known yet.
- The board's table is filled by the page's own script after it loads. The saved pages are the filled
  page, so the reader must wait for the table (see "Reading").
- The table lags: the diver who just dived can still carry a `*` until their score is posted.

## Approaches (how the service reads the board)

| | Good | Costs |
|---|---|---|
| **A. Reload the board page every 30 s, read it once its table is filled** (picked) | The page a person opens; the read path the background test proved (10 of 10, screen off). | The page also fetches its table once per load, so two requests per 30 s. Needs a short wait for the table. |
| B. Re-read only the table's own address (`livestats_results.php`) | One request per 30 s, no wait. | An address a person never opens; untested whether it answers without the page and its cookie. |
| C. Load once and let the page refresh itself; read every 30 s | Exactly what a person's browser does. | Untested whether the page's timers run in a browser with no screen; nothing notices a stuck page. |

A is picked because it is the only one already proven on the phone. **[my call]** B is the fallback if
the first phone run shows A is a problem.

## Design

### Parsers (`src/divemeets/parsers/`)

- `parseLiveBoard(html)` → `LiveBoard`: `{ eventName, stage?, round?: {current, total}, closed,
  next?: {diverNumber, name, order}, rows: [{diverNumber, name, order?, toDive, place?, total?}] }`.
  The in-progress and finished saved pages are its tests. A page with no board table and no "closed"
  text throws `PageChangedError`.
- `parseMeetResults` also returns `live: [{name, stage?, path}]` from the livestats links (empty when
  none). The in-progress saved meet page has two.

### Divers away (pure, `src/scoring/live.ts`) **[my call]**

- Divers before mine this round = rows with `*` whose order is at least the Next Diver's order and less
  than mine. 0 means up next. This skips the lagging row of the diver who just dived.
- A diver without `*` has dived this round: "Dived this round", no count, until the next round stars
  everyone again. So a diver early in the order gets less warning at a round break. Checked on the
  first phone run; counting across the break waits until a saved page shows how the order carries over.
- `alertsDue(sent, board, followedNumbers, n)` → the alerts to send now and the updated `sent` record,
  keyed by diver, round and kind. "N away" fires once when the count is N or fewer and more than 0;
  "up next" fires once at 0; if both are due in one read, only "up next" goes.

### Live state (`src/live.tsx`, like `src/follows.tsx`, provided in `_layout.tsx`) **[my call]**

Holds the followed board's path and runs `useLivePage` above the screens, so leaving the live screen
does not stop it. It runs `alertsDue` on every new board inside the update callback (not in a render
effect), sends alerts through a new `notify` from `source.ts`, keeps the ongoing notification's text
current ("Following Diver 5 · 2 divers before them"), and stops on a closed board with a last
notification ("Women 3m Championship is over. Diver 5 placed 3rd."). N is saved in AsyncStorage
(`alertAway`).

### Reader and native module

- `useLivePage` gains an optional `onData` callback, called inside the update, so alerts run even when
  React holds the screen.
- `source.ts` gets a `Notify` context: `alert(title, text)` and `status(title, text)`. The reader
  provides it from the native module (null-safe, like live mode), so screens still never import the reader.
- `live.ts` tells the service to wait for the board's table before reading a `livestats.php` page (up
  to 10 seconds, then it reads what is there).
- `modules/live-reader`: `notify(title, text)` posts an alert on a new high-importance channel
  "Up next alerts"; `setStatus(title, text)` updates the ongoing notification; `start` takes the
  wait-for selector. Manifest adds `POST_NOTIFICATIONS`. The screen asks for it with React Native's own
  `PermissionsAndroid` on the first Follow live; if refused, live mode still runs and the screen says
  alerts are off.
- `pageUrl` accepts the board's address (it does today; `livestats.php` fits its pattern).

### Screens

- Meet: a "Live now" section above the results, one card per live event, opening `/live`.
- Live (`src/app/live.tsx`): event name, round, "updated N s ago"; "Follow live" (becomes "Following
  live · Stop"); "Alert me when ___ divers away" chooser 1 to 5; "Up next: <name>"; a card per followed
  diver on the board (place, total, divers before them or "Dived this round"); "Still to dive this
  round" in order; "Standings". Before Follow live it shows the board once through `usePage` with a
  "Check again" button. Problems in plain words: "Couldn't reach DiveMeets, trying again", "DiveMeets
  wants to check you're a person" with a button that opens the check on screen and then carries on.
- Home: while following, a card "Following live: <event>" that opens the live screen, with Stop.
- All of it: plain words, 48 touch targets, `accessibilityLabel` on every control, scaling text
  (AGENTS.md "Done means"), render tests in `src/__tests__/`.

## Left to the builder

Exact wording beyond the lines above; the layout inside the design tokens; how the "updated N s ago"
clock ticks; test shapes.

## First phone run (after merge, planned with the maintainer)

Install the PR's test APK on the Pixel over USB, open a meet in progress, Follow live, lock the
phone, and check: the board updates, the ongoing notification text changes, the N-away and up-next
alerts arrive, the round break, the Referer after `reload()` (no 403), and the closed-event stop.
Needs a live meet on DiveMeets.
