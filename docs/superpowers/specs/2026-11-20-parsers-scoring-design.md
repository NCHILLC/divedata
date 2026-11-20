# Parsers and scoring math (milestone 3)

*Design · draft for review*

Build order step 3 of `2026-11-20-divedata-design.md`. **[yours]** = the maintainer decided it,
**[my call]** = the planning agent filled it in.

## What it delivers

Pure code that turns saved DiveMeets pages into typed data, and the scoring math, all tested against
saved, anonymized pages. No screens and no reader yet: those are milestone 4. When this is merged, the
app can understand every DiveMeets page that milestone 4 needs, and the math can check DiveMeets'
own published scores.

## Pages read in this milestone

| Page | Used for (milestone) | Parser |
|---|---|---|
| Meet list (DiveMeets home: today's and upcoming meets) | Home, today's meets (4) | `parseMeetList` |
| Meet search results by name | Find a meet (4) | `parseMeetList` (same table, to confirm) |
| Meet info (events, dates, links) | Meet screen (4) | `parseMeetInfo` |
| Event results (places, totals) | Event results (4) | `parseEventResults` |
| Dive sheet (one diver in one event: dives, DD, judge awards, score) | Diver screen (4), what-they-need (6) | `parseDiveSheet` |
| Diver profile (the diver's meets and results) | Follow my diver (4) | `parseDiverProfile` |

The live event page (who is diving now, the order) moves to milestone 5: it needs a meet that is
running, and live mode is milestone 5's job. **[my call]**

Fixtures cover a 3-judge, a 5-judge and a 7-judge event, and one event with a cut (prelims then finals),
so the scoring tests check the math against DiveMeets' published numbers for every panel size. **[my call]**

## How the parsers work

- One file per page type in `src/divemeets/parsers/`. Each is `parseX(html: string): X`.
- HTML is read with `node-html-parser` (MIT, pure JavaScript, runs the same on the phone and in Jest).
  Every result is checked with a Zod schema (`zod`, MIT). **[my call]**
- When a page does not look the way the parser expects (a missing table, a score that is not a
  number), the parser throws `PageChangedError` naming the page type. It never returns a wrong number
  quietly. Milestone 4 turns that error into plain words on screen.
- Data shapes describe meets, events, divers, dives and awards, not parents, so divers, coaches and
  officials can use them later. **[yours]** (keep the data model open)

## Scoring math

In `src/scoring/`, pure functions:

- `keptAwards(awards)`: 3 judges keep all, 5 drop the highest and lowest, 7 drop two of each. **[yours]**
  Any other panel size (synchronized diving uses 9 or 11) returns nothing, and the app shows the score
  DiveMeets publishes. **[my call]**
- `diveScore(awards, dd)`: kept awards' sum × DD, exact to the hundredth (no floating-point drift).
- `runningTotals(scores)`: the total after each dive.
- `averageAwardNeeded({ total, remainingDDs, target })`: the lowest judge score, in half points, that a
  diver would need from every judge on every remaining dive to finish **above** the target score.
  Answers "already above it", "needs an average of 7.5", or "can't reach it". **[my call]**: "above",
  because moving up means passing someone; a tie is not a pass.

The caller picks the target (the cut line, a place, the leader). What to assume about the other diver's
remaining dives is a milestone 6 question and is parked until then.

## Saved pages and names

- The maintainer passes DiveMeets' check once in the browser pane; the agent then opens the pages, one
  a minute at most, and saves each page's HTML outside the repo. **[yours]** The agent never solves or
  skips the check.
- `scripts/anonymize.mjs` replaces every person: divers, judges, referees, coaches and contacts. Meet
  names, places and club names stay, because they are organizations, not people. **[my call]** Each new
  name pattern gets a test in `scripts/__tests__/anonymize.test.mjs` first. The agent reads every output
  before it is committed. Many divers are minors.
- Older, finished meets are used where they cover the case.

## Checks

Every check in AGENTS.md "Done means". Tests read only `fixtures/divemeets/`.
