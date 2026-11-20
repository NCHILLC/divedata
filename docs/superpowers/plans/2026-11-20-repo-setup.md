# DiveData Repo Setup Implementation Plan

> Copied from the approved plan. Names and paths from the maintainer's private setup are replaced with neutral words, since this repo is public.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A public GitHub repo, `NCHILLC/divedata`, holding an empty Expo app that builds an Android APK, the shared agent rulebook and skills, and CI checks that all pass. No app features yet.

**Architecture:** Expo with continuous native generation: the `android/` folder is generated in CI and never committed. `AGENTS.md` is the only rulebook, and every other agent file points to it. Repo checks are small Node scripts (`.mjs`, no extra tooling) so they run the same on a Windows PC and on Linux CI.

**Tech Stack:** Node 22 LTS, Expo (latest stable SDK on the day, recorded in a decision note), React Native, TypeScript (strict), Expo Router, Jest via `jest-expo`, ESLint via `expo lint`, dependency-cruiser, license-checker-rseidelsohn, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-20-divedata-design.md` (approved 2026-11-20)

## Global Constraints

- License GPL-3.0-only. Production dependencies are limited to: MIT, ISC, BSD-2-Clause, BSD-3-Clause, Apache-2.0, 0BSD, CC0-1.0, Unlicense, BlueOak-1.0.0, Python-2.0, LGPL-3.0, GPL-3.0, CC-BY-4.0, MPL-2.0, GPL-3.0-only, GPL-3.0-or-later, LGPL-3.0-only, LGPL-3.0-or-later (CC-BY-4.0 and MPL-2.0 added 2026-11-20, and the four SPDX -only / -or-later names for GPL-3.0 and LGPL-3.0 the same day; see `docs/decisions/2026-11-20-license-list.md`).
- $0: nothing that needs a paid account or service. No Expo EAS. Builds run only on GitHub Actions.
- No analytics, crash reporting, ads or accounts. No dependency whose purpose is tracking.
- Tests never touch the network. DiveMeets is read only from `fixtures/divemeets/`.
- No real person's name in `fixtures/`. Every fixture's first line is `<!-- anonymized: divedata -->`.
- Nothing about the maintainer, their business or their private setup goes in this public repo.
- Every repo script runs with `node scripts/<name>.mjs` on Windows and Linux. No bash-only scripts.
- Plain words in anything a parent reads.
- Merge rule: pull requests merge once checks pass, except README, `docs/install.md`, release notes and releases, which wait for the maintainer's "merge it".

## Review Focus

1. A fixture saved in a subfolder (`fixtures/divemeets/meet-123/results.html`) without the marker must still fail the check. The check walks folders recursively.
2. The same DiveMeets diver number appearing twice in one page must become the same fake name both times (`Diver 1`), so totals and comparisons in tests still line up.
3. Someone edits `.claude/skills/...` directly instead of `.agents/skills/...`. The skills check must fail and say which file differs.
4. A dependency licensed as an SPDX expression (`(MIT OR Apache-2.0)`) must pass the license check, not fail it.
5. A Windows checkout with CRLF line endings must not make the skills or fixture checks fail. Compare after normalising `\r\n` to `\n`, and set `.gitattributes` `* text=auto eol=lf`.

---

### Task 1: Local repo, license and design docs

**Needs the maintainer's yes first:** this task creates the local repo folder and, in Task 7, a public GitHub repo.

**Files:**
- Create: `LICENSE` (GPL-3.0 text from `gh api /licenses/gpl-3.0 --jq .body`), `.gitignore`, `.gitattributes`, `.nvmrc` (`22`), `README.md`
- Create: `docs/superpowers/specs/2026-11-20-divedata-design.md` (the approved design page, converted to Markdown, word for word)
- Create: `docs/superpowers/plans/2026-11-20-repo-setup.md` (this plan)

- [ ] **Step 1:** `git init -b main` in the repo folder.
- [ ] **Step 2:** Write the files. `.gitignore` covers `node_modules/`, `.expo/`, `android/`, `ios/`, `dist/`, `coverage/`, `*.keystore`, `*.jks`, `.env*`. README: one paragraph on what DiveData is, "Install" pointing to `docs/install.md`, "Contribute" pointing to `CONTRIBUTING.md`, and the license.
- [ ] **Step 3:** Verify: `git status` lists exactly these files. `LICENSE` starts with `GNU GENERAL PUBLIC LICENSE` and `Version 3`.
- [ ] **Step 4:** Commit `chore: start DiveData repo with license and approved design`.

### Task 2: Empty Expo app with typecheck, lint and test

**Files:**
- Create: the Expo app (`package.json`, `app.json`, `tsconfig.json`, `src/app/_layout.tsx`, `src/app/index.tsx`), `eslint.config.js`
- Test: `src/app/__tests__/index.test.tsx`

**Interfaces:**
- Produces: npm scripts `typecheck` (`tsc --noEmit`), `lint` (`expo lint`), `test` (`jest`). Later tasks add `check:*` scripts beside them. `app.json` sets `name: "DiveData"`, `slug: "divedata"`, `android.package: "org.divedata.app"`, `userInterfaceStyle: "dark"`, `experiments.typedRoutes: true`, and `plugins: ["expo-router"]` with the routes root at `src/app`.

- [ ] **Step 1:** `npx create-expo-app@latest . --template blank-typescript`, then `npx expo install expo-router react-native-safe-area-context react-native-screens expo-linking expo-constants expo-status-bar` and `npm i -D jest-expo jest @testing-library/react-native @types/jest`. Set `"main": "expo-router/entry"` and `"compilerOptions.strict": true`. Delete the template's `App.tsx`.
- [ ] **Step 2: Write the failing test**

```tsx
// src/app/__tests__/index.test.tsx
import { render, screen } from '@testing-library/react-native';
import Home from '../index';

test('home screen names the app and says what to do first', () => {
  render(<Home />);
  expect(screen.getByText('DiveData')).toBeTruthy();
  expect(screen.getByText('Find a meet to get started.')).toBeTruthy();
});
```

- [ ] **Step 3:** Run `npm test`. Expected: FAIL, because `../index` does not exist.
- [ ] **Step 4:** Write `src/app/index.tsx` as a default-exported `Home()` that shows those two lines of text on the dark background `#0e1417`, and `src/app/_layout.tsx` as a `Stack`.
- [ ] **Step 5:** Run `npm test`, `npm run typecheck`, `npm run lint`. Expected: all pass with 0 errors.
- [ ] **Step 6:** Record the Expo SDK version in `docs/decisions/2026-11-20-expo-sdk.md` (one line: version and why: latest stable on setup day).
- [ ] **Step 7:** Commit `feat: empty Expo app with typecheck, lint and test`.

### Task 3: Layer and license checks

**Files:**
- Create: `.dependency-cruiser.cjs`, `src/divemeets/reader/index.ts` (`export {}` placeholder), `src/divemeets/parsers/index.ts`, `src/scoring/index.ts`, `scripts/check-licenses.mjs`
- Modify: `package.json` (scripts `check:layers`, `check:licenses`)

**Interfaces:**
- Produces: `npm run check:layers` and `npm run check:licenses`, each exiting non-zero on a violation.

- [ ] **Step 1:** dependency-cruiser rule `screens-never-call-reader`: `from: { path: '^src/app' }`, `to: { path: '^src/divemeets/reader' }`, severity `error`. Script: `depcruise src --config .dependency-cruiser.cjs`.
- [ ] **Step 2:** Verify it bites: add `import '../divemeets/reader';` to `src/app/index.tsx` and run `npm run check:layers`. Expected: FAIL naming `screens-never-call-reader`. Remove the import and run it again. Expected: PASS.
- [ ] **Step 3:** `scripts/check-licenses.mjs` runs `license-checker-rseidelsohn --production --json`. It passes a package when its license, or any one choice in an `OR` expression, is in the Global Constraints list (Review Focus 4). It prints each failing package as `name@version: license` and exits 1.
- [ ] **Step 4:** Run `npm run check:licenses`. Expected: PASS. If an Expo package fails, stop and report it; don't widen the list.
- [ ] **Step 5:** Commit `chore: add layer and license checks`.

### Task 4: Fixture anonymizer and fixture check

**Files:**
- Create: `scripts/anonymize.mjs`, `scripts/check-fixtures.mjs`, `fixtures/divemeets/.gitkeep`
- Test: `scripts/__tests__/anonymize.test.mjs`, `scripts/__tests__/check-fixtures.test.mjs`, `scripts/__tests__/sample-results.html` (hand-made, fake names)

**Interfaces:**
- Produces: `anonymize(html: string): string` (exported) and the CLI `node scripts/anonymize.mjs <in.html> <out.html>`. `checkFixtures(dir: string): string[]` (exported; returns paths missing the marker) and the CLI `npm run check:fixtures`.

- [ ] **Step 1: Write the failing tests**

```js
test('replaces each diver with a stable fake name', () => {
  const out = anonymize(sample); // two links to profile.php?number=111, one to 222
  expect(out).not.toMatch(/Jane Realname|Sam Realname/);
  expect(out.match(/>Diver 1</g)).toHaveLength(2);
  expect(out).toMatch(/>Diver 2</);
});
test('adds the marker as line 1', () => {
  expect(anonymize(sample).split('\n')[0]).toBe('<!-- anonymized: divedata -->');
});
test('removes emails and phone numbers', () => {
  expect(anonymize('<p>a@b.com 704-555-0199</p>')).not.toMatch(/@|555/);
});
test('finds a marker-less file in a subfolder', () => {
  expect(checkFixtures(tmpDirWithNestedUnmarkedFile)).toEqual([nestedPath]);
});
test('accepts a marked file with CRLF endings', () => {
  expect(checkFixtures(tmpDirWithCrlfMarkedFile)).toEqual([]);
});
```

- [ ] **Step 2:** Run `npm test -- scripts`. Expected: FAIL, because the modules don't exist.
- [ ] **Step 3:** Implement. `anonymize` maps each distinct `number=` value in a `profile.php` link to `Diver N` in order of first appearance, replaces the link text, strips emails and North American phone numbers, and prepends the marker. Add a comment that judge names and other page types get added in milestone 3, once real pages are saved.
- [ ] **Step 4:** Run `npm test` and `npm run check:fixtures`. Expected: all pass.
- [ ] **Step 5:** Commit `chore: add fixture anonymizer and check`.

### Task 5: The rulebook, agent pointers and docs

**Files:**
- Create: `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`), `GEMINI.md` (`Read and follow AGENTS.md in this folder.`), `.github/copilot-instructions.md` (same line), `.aider.conf.yml` (`read: [AGENTS.md]`), `CONTRIBUTING.md`
- Create: `docs/product.md`, `docs/domain.md`, `docs/divemeets.md`, `docs/design.md`, `docs/install.md` (stub: "Coming with the first release"), `docs/decisions/2026-11-20-*.md` (one per decision on the design page's "yours" list)
- Create: `mockups/` with the live-board and head-to-head screens (PNG and HTML). The judge screen is not copied.
- Create: `.github/ISSUE_TEMPLATE/bug.yml`, `.github/ISSUE_TEMPLATE/idea.yml`, `.github/pull_request_template.md`

- [ ] **Step 1:** Write `AGENTS.md`, under 120 lines, with these sections in this order: What DiveData is; Never (copied from the spec's Never list); Commands (every npm script); Where things live (the spec's tree); Layers (reader → parsers → scoring → screens; screens never import the reader); Done means (failing test first; all checks pass; plain words; a decision note when a rule changes); Workflow (GitHub issue → branch → PR → checks → merge, plus the merge rule from Global Constraints); Skills (`.agents/skills/`; edit there, then run `npm run sync:skills`).
- [ ] **Step 2:** Write `docs/domain.md`: dive number format (group digit, flip-and-half digits, position letter A–D; twisters 5xxx), DD, panel trimming (3 keep all, 5 drop high and low, 7 drop two of each), dive score = sum of kept awards × DD (meets vary in how they normalise panels, so the app shows the score DiveMeets publishes and the scoring tests check the math against those published scores), rounds, prelims, semis, finals, cut lines. Put "unverified, check against a real page" next to anything not confirmed from a fixture.
- [ ] **Step 3:** Write `docs/divemeets.md`: the host (`secure.meetcontrol.com/divemeets/system/`), the Cloudflare check found on 2026-11-20, the polite-use rules from the spec (once a minute normally, every 30 seconds in live mode, only pages the person asked for), and "page layouts: filled in milestone 3".
- [ ] **Step 4:** Write `docs/design.md` from the Stitch design guide, keeping colors, type, spacing and touch-target rules and replacing the officiating language with parent-facing language.
- [ ] **Step 5:** Verify: `wc -l AGENTS.md` is under 120, and every path named in `AGENTS.md` exists (`node -e` one-liner, or check by eye).
- [ ] **Step 6:** Commit `docs: add shared agent rulebook and project docs`.

### Task 6: Shared skills and the skills sync check

**Files:**
- Create: `.agents/skills/add-parser/SKILL.md`, `.agents/skills/add-screen/SKILL.md`, `.agents/skills/release/SKILL.md`, `scripts/sync-skills.mjs`, `.claude/settings.json`
- Test: `scripts/__tests__/sync-skills.test.mjs`

**Interfaces:**
- Produces: `npm run sync:skills` (copies `.agents/skills` to `.claude/skills`) and `npm run check:skills` (the same with `--check`: exits 1 and names each differing file, never writes).

- [ ] **Step 1:** Write the failing tests: after a sync, the check passes; after editing a file under `.claude/skills`, the check fails and names that file (Review Focus 3); a CRLF-only difference passes (Review Focus 5).
- [ ] **Step 2:** Run them. Expected: FAIL.
- [ ] **Step 3:** Implement `sync-skills.mjs`.
- [ ] **Step 4:** Write the three skills, each with `name` and `description` frontmatter. **add-parser**: the maintainer passes the DiveMeets check in the browser pane → save the page → `node scripts/anonymize.mjs` → put it in `fixtures/divemeets/<page-type>/` → write the parser test against it → write the parser → update `docs/divemeets.md`. **add-screen**: tokens from `docs/design.md`; the plain-words checklist; touch targets of at least 48; an `accessibilityLabel` on every control; text scales with the phone's font setting; a test that renders it. **release**: written as "filled in at milestone 7", with the merge rule.
- [ ] **Step 5:** `.claude/settings.json`: allow `npm run *`, `npx expo *`, `node scripts/*`, `git status`, `git diff`. Nothing else.
- [ ] **Step 6:** Run `npm run sync:skills`, then `npm run check:skills` and `npm test`. Expected: all pass.
- [ ] **Step 7:** Commit `chore: add shared skills and sync check`.

### Task 7: CI, GitHub repo and branch protection

**Needs the maintainer's yes first:** this creates a public repo and changes its settings.

**Files:**
- Create: `.github/workflows/ci.yml`

`release.yml` (signed APK on a version tag) is left to milestone 7, the first release.

- [ ] **Step 1:** `ci.yml` runs on `pull_request` and on `push` to `main`. Job `checks` (ubuntu-latest, Node from `.nvmrc`, `npm ci`): `typecheck`, `lint`, `test`, `check:layers`, `check:licenses`, `check:fixtures`, `check:skills`. Job `android` (needs `checks`, Java 17 Temurin): `npx expo prebuild --platform android --no-install`, then `cd android && ./gradlew assembleRelease --no-daemon`; upload `android/app/build/outputs/apk/release/*.apk` as artifact `divedata-test-apk`. (Changed 2026-11-20 from `assembleDebug`: a debug APK has no JavaScript bundle and shows "Unable to load script" on a phone. Expo's template signs release builds with the debug keystore, so no secret is needed.)
- [ ] **Step 2:** Commit `ci: add checks and Android debug build`.
- [ ] **Step 3:** `gh repo create NCHILLC/divedata --public --source . --push --description "Follow your diver at DiveMeets meets. Free and open source."`
- [ ] **Step 4:** Watch the run: `gh run watch`. Expected: both jobs green, with the APK artifact attached.
- [ ] **Step 5:** Protect `main`: require the `checks` and `android` status checks before merging, and no force pushes (`gh api -X PUT repos/NCHILLC/divedata/branches/main/protection ...`).
- [ ] **Step 6:** Download the `divedata-test-apk` artifact and install it on the maintainer's Pixel. Expected: it opens to "DiveData / Find a meet to get started." The maintainer confirms on the phone.
- [ ] **Step 7:** Wrap-up: write the progress notes (STATE and log) in the maintainer's private notes. End the session at this milestone.
