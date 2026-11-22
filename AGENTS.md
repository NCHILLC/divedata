# DiveData rulebook

Every agent (Claude Code, Codex, Gemini, Copilot, OpenCode, Aider) follows this file. The other agent
files only point here. Change rules here, never in a copy.

## What DiveData is

A free, open-source (GPL-3.0) Android app that lets diving parents and fans follow their diver at a
meet: place in the dive order, scores, rank, and what they need to move up. It reads what DiveMeets
already publishes. Each phone reads DiveMeets itself through a hidden in-app browser, because
DiveMeets sits behind a Cloudflare bot check. Parents and fans come first; keep the data model open to
divers, coaches and officials later. Details: `docs/product.md`. Full design:
`docs/superpowers/specs/2026-11-20-divedata-design.md`.

## Never

- A judge bias screen. Dropped for good.
- Any cost to users, or anything that needs a paid account or service (no Expo EAS; builds run only
  on GitHub Actions).
- AI inside the app.
- Accounts, ads, analytics or crash reporters that send data away. What a person follows stays on
  their phone. Many divers are minors.
- Getting around DiveMeets' bot check, or loading its pages faster than a person would. If the check
  appears, show it to the person; the app never solves it.
- A setup step before first use. The app works the moment it opens.
- Live DiveMeets calls in tests. Tests read saved pages from `fixtures/divemeets/` only.
- A real person's name in `fixtures/`. Run `node scripts/anonymize.mjs` on every saved page.
- A production dependency whose license is not on the list in `scripts/check-licenses.mjs`. If one
  fails, stop and ask; don't widen the list on your own.
- Anything about the maintainer's private setup in this public repo.

## Commands

Node 22 (`.nvmrc`). Install with `npm ci`. Add packages with `npx expo install <package>`, which picks
versions that match the Expo SDK (see `docs/decisions/2026-11-20-expo-sdk.md`). Expo changes between
SDK releases: check the versioned docs at `https://docs.expo.dev/versions/` before using an Expo API.

| Command | What it does |
|---|---|
| `npm start` | Start the Expo dev server |
| `npm run android` | Start the dev server and open the app on an Android device or emulator |
| `npm run typecheck` | TypeScript, strict |
| `npm run lint` | ESLint through `expo lint`, over `src/` and `scripts/` |
| `npm test` | Jest: app tests and script tests |
| `npm run check:layers` | Fails when a screen imports the reader |
| `npm run check:licenses` | Fails on a production dependency with a license not on the list |
| `npm run check:fixtures` | Fails when a file under `fixtures/` lacks the anonymized marker |
| `npm run sync:skills` | Copies `.agents/skills` to `.claude/skills` |
| `npm run check:skills` | Fails when `.claude/skills` differs from `.agents/skills` |

The Android test build runs in CI (`.github/workflows/ci.yml`): `npx expo prebuild --platform android`,
then Gradle `assembleRelease` for arm64 phones only, uploaded as artifact `divedata-test-apk`. A release build carries the app's
JavaScript, so it opens on a phone with no dev server; a debug build shows "Unable to load script". Expo's
template signs it with the debug keystore, so it is for testing only. The `android/` folder is generated
and never committed.

## Where things live

```
AGENTS.md              this rulebook (CLAUDE.md, GEMINI.md, .github/copilot-instructions.md, .aider.conf.yml point here)
.agents/skills/        step-by-step guides every agent uses; .claude/skills is a copy
.github/               CI workflow, issue forms, pull request template
docs/product.md        who it's for, version 1, the never list
docs/domain.md         diving terms and scoring rules
docs/divemeets.md      DiveMeets pages, the bot check, polite-use rules
docs/design.md         colors, type, spacing, touch targets
docs/decisions/        one short dated note per decision
docs/superpowers/      approved designs (specs/) and build plans (plans/)
docs/install.md        the parent-friendly install guide
fixtures/divemeets/    saved DiveMeets pages, names replaced
mockups/               design mockups, for reference only
scripts/               repo checks and the anonymizer (run with node on Windows and Linux)
index.js, src/root.tsx the app's entry: Expo Router's app with the reader around it
src/app/               screens (Expo Router); every file here is a route, so tests go in src/__tests__/
src/divemeets/source.ts how screens ask for a page (usePage) without importing the reader
src/divemeets/reader/  loads DiveMeets pages in a hidden browser view, with a cache; live.ts is live mode
modules/live-reader/   live mode's Android service: its own browser re-reads a page with the screen off
src/divemeets/parsers/ pure functions from saved HTML to typed data
src/scoring/           pure scoring math
src/follows.tsx        followed divers, kept on the phone
src/live.tsx           live mode above the screens: the board being followed and its "Up next" alerts
src/ui.tsx             shared screen pieces built from docs/design.md
```

## Layers

reader → parsers → scoring → screens. Each layer only uses the ones before it. Screens never import
the reader (`npm run check:layers` enforces it): the reader wraps the app at its entry (`src/root.tsx`)
and screens load pages with `usePage` from `src/divemeets/source.ts`. Parsers and scoring are pure
functions, so they are tested without a phone or a network.

## Done means

- A failing test was written first, then the code that makes it pass.
- Every check passes: typecheck, lint, test, check:layers, check:licenses, check:fixtures,
  check:skills, and the Android build in CI.
- Anything a parent reads uses plain words ("Up next", not "telemetry"), touch targets of at least
  48, an `accessibilityLabel` on every control, and text that scales with the phone's font setting.
- A rule changed? Add a dated note in `docs/decisions/` and update this file.

## Workflow

GitHub issue → branch → pull request → checks → merge. Never commit straight to `main`; it is
protected and needs the `checks` and `android` jobs to pass.

Merge rule: a pull request merges once its checks pass, except changes to `README.md`,
`docs/install.md`, release notes and releases. Those wait for the maintainer's "merge it".

## Skills

Guides live in `.agents/skills/<name>/SKILL.md`: `add-parser`, `add-screen`, `release`. Edit them
there, then run `npm run sync:skills` so Claude Code's copy in `.claude/skills/` matches. Never edit
`.claude/skills/` directly; `npm run check:skills` fails if you do.
