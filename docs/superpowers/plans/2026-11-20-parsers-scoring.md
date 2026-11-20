# Parsers and Scoring Math Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pure parsers from saved, anonymized DiveMeets pages to typed data, and the scoring math, each tested against those pages.

**Architecture:** One parser file per page type in `src/divemeets/parsers/`, reading HTML with `node-html-parser` and checking every result with a Zod schema; a page that looks different throws `PageChangedError`. Scoring is plain functions in `src/scoring/` using whole-number math so scores are exact to the hundredth. Fixtures are real pages saved in the browser pane after the maintainer passes DiveMeets' check, then run through `scripts/anonymize.mjs`.

**Tech Stack:** TypeScript strict, Jest via `jest-expo`, `zod`, `node-html-parser`.

**Spec:** `docs/superpowers/specs/2026-11-20-parsers-scoring-design.md`, inside `docs/superpowers/specs/2026-11-20-divedata-design.md` (build order step 3).

## Global Constraints

- Tests never call DiveMeets. They read only `fixtures/divemeets/`.
- No real person's name in `fixtures/`: divers, judges, referees, coaches, contacts. Meet, place and club names stay. First line of every fixture is `<!-- anonymized: divedata -->`.
- Saving pages: the maintainer passes the check himself; the agent never solves or skips it, and opens DiveMeets pages no more than once a minute.
- Production dependencies only with licenses on the list in `scripts/check-licenses.mjs`. If one fails, stop and ask.
- Add packages with `npx expo install <package>`.
- Layers: parsers import nothing from the reader or screens; scoring imports nothing from parsers. `npm run check:layers` passes.
- Heavy gates (full `npm test`, `npm run typecheck`, the Android build) run in CI; locally run only the test file in hand (`npx jest <path>`).
- Merge once checks pass (no README, install guide or release change in this PR).

## Review Focus

1. A failed or balked dive (all awards 0, or a penalty DiveMeets marks on the sheet): the dive sheet parses, and the published score is kept as published. Test in Task 7.
2. An event that has not finished (some rounds empty, no places yet): event results and dive sheet parse with the rounds that exist, no throw. Test in Tasks 6 and 7 (a trimmed copy of the fixture built inside the test).
3. DiveMeets changes a page: `PageChangedError` with the page type, never a quiet wrong number. Test in every parser task (feed it the meet list page, or a page with its table removed).
4. Synchronized events or panels of 9 or 11 judges: `keptAwards` returns `undefined`, the dive sheet still parses with the published score. Test in Task 3.
5. Names and text with HTML entities or no-break spaces (`O&#39;Brien`, `&nbsp;`), tied places (`3T` or `T-3`): decoded and trimmed; a tie keeps its place number and sets `tied: true`. Test in Task 6.

---

### Task 1: Save the pages

**Files:** none in the repo. Raw pages go to the scratchpad `divemeets-raw/` folder, which is never committed.

- [ ] **Step 1:** The maintainer opens the browser pane at `https://secure.meetcontrol.com/divemeets/system/` and passes the check. Wait for his "done".
- [ ] **Step 2:** Start a small relay on `127.0.0.1` (a Node script in the scratchpad, outside the repo) that writes a POSTed body to `divemeets-raw/<name>.html` and answers CORS and private-network preflights. In each page, run `fetch('http://127.0.0.1:<port>/<name>', { method: 'POST', body: document.documentElement.outerHTML })`. This saves what the phone's hidden browser will see.
- [ ] **Step 3:** Open and save, at least one minute apart: `meet-list` (home), `meet-search` (results for a name search), then for one finished meet with a 5-judge event: `meet-info`, `event-results-5`, `dive-sheet-5`; a finished 3-judge event: `event-results-3`, `dive-sheet-3`; a 7-judge event (a national championship): `dive-sheet-7`; an event with prelims and finals: `event-results-cut`; `diver-profile` for one diver from those results. Prefer adult (college or senior) events where they cover the case. Note each page's address pattern for `docs/divemeets.md`.
- [ ] **Step 4:** If a page shows the check again, stop and ask the maintainer to pass it. Stop the relay when done.

### Task 2: Anonymizer covers every person, then the fixtures

**Files:**
- Modify: `scripts/anonymize.mjs`, `scripts/__tests__/anonymize.test.mjs`
- Create: `fixtures/divemeets/<page-type>/<name>.html` for each page from Task 1

- [ ] **Step 1:** Run `node scripts/anonymize.mjs` on each raw page into a scratch folder and read every output for names left (judges, referee, coaches, meet contact, diver names in headings or plain text).
- [ ] **Step 2:** For each name pattern found, add a failing test with an invented name in the same HTML shape, e.g. `test('replaces judge names', ...)` asserting the invented name is gone and `Judge 1` is present; run `npx jest scripts/__tests__/anonymize.test.mjs`, see it fail.
- [ ] **Step 3:** Extend `anonymize(html)` for that pattern (fake names `Judge N`, `Coach N`, `Official N`; a diver named in plain text gets the same `Diver N` as their profile link). Run the test, see it pass.
- [ ] **Step 4:** Re-run on every page, read every output again, repeat Steps 2-3 until no real name is left. Copy the outputs into `fixtures/divemeets/<page-type>/`; run `npm run check:fixtures`, expect "All fixtures are anonymized."
- [ ] **Step 5:** Commit: `test: anonymize judges and officials; add DiveMeets fixtures`.

### Task 3: Dive score, kept awards, running totals

**Files:** Create `src/scoring/dive.ts`, `src/scoring/__tests__/dive.test.ts`; modify `src/scoring/index.ts` (re-exports).

**Interfaces:** Produces `keptAwards(awards: number[]): number[] | undefined`, `diveScore(awards: number[], dd: number): number | undefined`, `runningTotals(scores: number[]): number[]`.

- [ ] **Step 1: Failing tests**

```ts
test('5 judges drop highest and lowest', () => {
  expect(keptAwards([7.5, 7.0, 7.5, 8.0, 7.0]).sort()).toEqual([7.0, 7.5, 7.5]);
  expect(diveScore([7.5, 7.0, 7.5, 8.0, 7.0], 2.9)).toBe(63.8);
});
test('3 judges keep all', () => expect(diveScore([6.5, 7.0, 6.0], 1.9)).toBe(37.05));
test('7 judges drop two of each', () =>
  expect(diveScore([8.0, 8.5, 7.5, 9.0, 8.0, 7.0, 8.5], 3.2)).toBe(78.4));
test('other panel sizes give undefined', () => {
  expect(keptAwards([7, 7, 7, 7, 7, 7, 7, 7, 7])).toBeUndefined();
  expect(diveScore([7, 7], 2.0)).toBeUndefined();
});
test('no floating-point drift', () => expect(diveScore([7.0, 7.0, 7.0], 2.3)).toBe(48.3));
test('running totals', () => expect(runningTotals([63.8, 37.05, 48.3])).toEqual([63.8, 100.85, 149.15]));
```

- [ ] **Step 2:** `npx jest src/scoring` fails (module not found).
- [ ] **Step 3:** Implement in `src/scoring/dive.ts`: work in whole numbers (awards × 2, DD × 10, totals × 100) and divide once at the end.
- [ ] **Step 4:** `npx jest src/scoring` passes.
- [ ] **Step 5:** Commit: `feat(scoring): dive score, kept awards and running totals`.

### Task 4: Average judge score needed

**Files:** Create `src/scoring/needed.ts`, `src/scoring/__tests__/needed.test.ts`; modify `src/scoring/index.ts`.

**Interfaces:** Produces

```ts
type Needed = { kind: 'already-above' } | { kind: 'needs'; average: number } | { kind: 'out-of-reach' };
function averageAwardNeeded(input: { total: number; remainingDDs: number[]; target: number }): Needed;
```

`average` is the lowest half point (0, 0.5 … 10) such that `total + 3 × average × sum(remainingDDs) > target`, using the Task 3 whole-number math. Three kept awards per dive.

- [ ] **Step 1: Failing tests:** already above (`total 300, target 299.95` → `already-above`); needs (`total 200, remainingDDs [2.0, 2.0], target 290` → 90 points over 12 DD-awards → 7.5 is exactly 290, not above, so `{ kind: 'needs', average: 8 }`); exact boundary at 7.5 when target is 289.95; out of reach (`total 0, remainingDDs [2.0], target 61` → 10 gives 60 → `out-of-reach`); a tie is not enough (`total 100, remainingDDs [], target 100` → `out-of-reach`).
- [ ] **Step 2:** Run, see fail. **Step 3:** Implement. **Step 4:** Run, see pass.
- [ ] **Step 5:** Commit: `feat(scoring): average judge score needed to pass a target`.

### Task 5: Parser groundwork and the meet list

**Files:**
- Modify: `package.json`, `package-lock.json` (`npx expo install zod node-html-parser`)
- Create: `src/divemeets/parsers/common.ts`, `src/divemeets/parsers/types.ts`, `src/divemeets/parsers/meet-list.ts`, `src/divemeets/parsers/__tests__/meet-list.test.ts`, `src/divemeets/parsers/__tests__/fixtures.ts` (reads a fixture by path)
- Modify: `src/divemeets/parsers/index.ts` (re-exports)

**Interfaces:** Produces

```ts
class PageChangedError extends Error { constructor(page: PageType, detail: string) }
type PageType = 'meet-list' | 'meet-info' | 'event-results' | 'dive-sheet' | 'diver-profile';
function load(html: string): HTMLElement;            // node-html-parser root
function cleanText(el: HTMLElement | undefined): string; // entities decoded, nbsp to space, trimmed
function checked<T>(page: PageType, schema: z.ZodType<T>, value: unknown): T; // Zod parse or PageChangedError
// types.ts: Zod schemas and inferred types
type DiverRef = { diverNumber: number; name: string };
type MeetSummary = { meetNumber: number; name: string; startDate: string /* YYYY-MM-DD */; endDate: string; city?: string; state?: string };
function parseMeetList(html: string): MeetSummary[];
```

- [ ] **Step 1:** `npx expo install zod node-html-parser`; `npm run check:licenses` passes (stop and ask if not).
- [ ] **Step 2: Failing test:** `parseMeetList` on `fixtures/divemeets/meet-list/meet-list.html` returns the count and the first row's values read off the page; on `meet-search.html` likewise (if its table differs, give search its own function and fixture test); on the event results fixture it throws `PageChangedError` with `page: 'meet-list'`.
- [ ] **Step 3:** Run, see fail. **Step 4:** Implement `common.ts`, `types.ts`, `meet-list.ts`. **Step 5:** Run, see pass; `npm run check:layers` passes.
- [ ] **Step 6:** Commit: `feat(parsers): meet list with Zod checks`.

### Task 6: Meet info and event results

**Files:** Create `src/divemeets/parsers/meet-info.ts`, `event-results.ts` and their tests.

**Interfaces:** Produces

```ts
type EventSummary = { eventNumber: number; name: string; date?: string; resultsPath?: string };
type Meet = MeetSummary & { events: EventSummary[] };
type ResultRow = { place: number; tied: boolean; diver: DiverRef; team?: string; total: number; diveSheetPath?: string };
type EventResults = { meetNumber: number; eventName: string; stage?: string; rows: ResultRow[] };
function parseMeetInfo(html: string): Meet;
function parseEventResults(html: string): EventResults;
```

Paths are DiveMeets-relative (`divesheetresultsext.php?...`, exact pattern from Task 1), so milestone 4's reader can open them.

- [ ] **Step 1: Failing tests** with values read off the fixtures: event count and one event's name and number; result row count, place 1 (`Diver N`, total), the cut fixture's stage name; Review Focus 5 (entity and nbsp text, a tied place) using a row from the fixture or a small row built in the test; Review Focus 2 (results table with no rows parses to `rows: []`); wrong page throws `PageChangedError`.
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Run, pass.
- [ ] **Step 5:** Commit: `feat(parsers): meet info and event results`.

### Task 7: Dive sheet, checked against the scoring math

**Files:** Create `src/divemeets/parsers/dive-sheet.ts`, `__tests__/dive-sheet.test.ts`.

**Interfaces:** Consumes `diveScore`, `runningTotals` (tests only). Produces

```ts
type Dive = { round: number; diveNumber: string /* e.g. 5253B */; height?: string; description?: string; dd: number; awards: number[]; score: number; penalty?: string };
type DiveSheet = { diver: DiverRef; eventName: string; dives: Dive[]; total: number };
function parseDiveSheet(html: string): DiveSheet;
```

- [ ] **Step 1: Failing tests:** for `dive-sheet-3`, `-5` and `-7`: dive count, first dive's number, DD and awards read off the page; for every dive, `diveScore(awards, dd)` equals the published `score` (skip a dive with `penalty` set and say why in the test); the last running total equals `total`. Review Focus 1 (a failed dive keeps its published score) and 2 (a sheet with later rounds blank parses the dives done).
- [ ] **Step 2:** Run, fail. **Step 3:** Implement. **Step 4:** Run, pass.
- [ ] **Step 5:** Commit: `feat(parsers): dive sheet, checked against published scores`.

### Task 8: Diver profile

**Files:** Create `src/divemeets/parsers/diver-profile.ts`, `__tests__/diver-profile.test.ts`.

**Interfaces:** Produces `type DiverProfile = { diver: DiverRef; meets: { meetNumber: number; name: string; startDate?: string; events: { name: string; place?: number; total?: number; diveSheetPath?: string }[] }[] }` and `parseDiverProfile(html: string): DiverProfile`. Personal details on the page (city, school, coach) are not read.

- [ ] **Step 1:** Failing test with values read off the fixture, plus wrong page throws. **Steps 2-4:** fail, implement, pass.
- [ ] **Step 5:** Commit: `feat(parsers): diver profile`.

### Task 9: Docs, checks, pull request

**Files:** Modify `docs/divemeets.md` ("Page layouts": each page's address pattern and the tables and columns the parsers rely on), `docs/domain.md` (remove "unverified" only where a fixture confirmed it; note what the pages showed about penalties and panels), `.agents/skills/add-parser/SKILL.md` (the relay saving step) then `npm run sync:skills`. Create `docs/decisions/2026-11-20-html-parser.md` (node-html-parser and Zod), `docs/decisions/2026-11-20-fixture-people.md` (every person replaced; meet, place and club names kept), `docs/decisions/2026-11-20-needed-means-pass.md` ("needed" means finishing above the target; a tie is not a pass; what to assume about rivals is decided in milestone 6).

- [ ] **Step 1:** `npm run lint`, `npm run check:layers`, `npm run check:licenses`, `npm run check:fixtures`, `npm run check:skills` pass locally.
- [ ] **Step 2:** Commit, push, open the PR from `main` with the `pr` skill. CI `checks` and `android` green.
- [ ] **Step 3:** A fresh reviewer on the whole branch; fix what it finds.
- [ ] **Step 4:** Merge with `gh pr merge --squash` once checks pass. Update STATE and the log in `claude-memory/projects/divedata/`.
