# DiveData

*Design · draft for review*

A free, open-source Android app that lets diving parents and fans follow their diver at a meet, using what DiveMeets already publishes.

2026-11-20 · repo NCHILLC/divedata (not created yet) · **[yours]** = the maintainer decided it · **[my call]** = the planning agent filled it in

## Why and for whom

Parents at a dive meet sit through long sessions waiting for one diver, then find their scores on a DiveMeets page that is hard to read on a phone. DiveData puts their diver front and centre: where they are in the order, their scores, their place, and what they need to move up. **[yours]**

**Success is diving parents adopting it**: it spreads between families and clubs because it is easier than the website. **[yours]**

Parents and fans come first. Divers, coaches and officials may come later, so the data model must not shut them out. **[yours]**

## Goals and limits

### Version 1 must

1. **Find a meet and see results**: by name search, meet number or a pasted DiveMeets link. Events, dive order and scores in plain view.
2. **Follow my diver**: save favourite divers; the app opens straight to their event, place in the order and scores.
3. **"Up next" alerts**: a notification when a followed diver is close to diving.
4. **What-they-need math**: compare two divers round by round, and show the average judge score needed to make the cut, place or win.

All four **[yours]**

### Not in version 1

- iPhone (planned later; Apple charges $99 a year to publish). **[yours]**
- Google Play or F-Droid. GitHub download only. **[yours]**
- Tools for judges and officials, and score entry. The app only reads; it never sends anything to DiveMeets. **[my call]**

### Never

- The judge bias screen. Dropped for good. **[yours]**
- Any cost to users, or anything that needs a paid account or service. **[yours]**
- AI inside the app. **[yours]**
- Accounts, ads, analytics or crash reporters that send data away. What a person follows stays on their phone. Many divers are minors. **[my call]**
- Getting around DiveMeets' bot check, or loading its pages faster than a person would. **[my call]**
- A setup step before first use. An earlier prototype needed a server address; DiveData must work the moment it opens. **[my call]**

## Constraints

- **DiveMeets blocks automated readers.** Its pages sit behind a Cloudflare "verify you are human" check that returned a 403 when I visited. So each phone reads DiveMeets itself through a hidden in-app browser, the way a person's browser would. **[yours]** If the check appears, the app shows it to the person, who passes it themselves. The app never solves it. **[my call]**
- **Open source and free.** Public repo, GPL-3.0 license. Every library must be free and GPL-compatible. Builds and tests run on GitHub Actions, which is free for public repos, not on Expo's paid build service. **[yours]** / **[my call]**
- **Average users.** Plain words on screen ("Up next", not "telemetry"). Taps at least 48 px. Text scales with the phone's font setting. Screen readers get labels for every control. **[my call]**
- **Installing from GitHub** takes a phone setting ("install unknown apps"). The release page gets a plain install guide with screenshots, and the app shows a notice when a newer version is out. **[my call]**
- **Release signing key.** Android only installs updates signed with the same key. Lose it and every user must uninstall and reinstall. The key lives as a GitHub secret. The maintainer keeps a backup of the signing key somewhere safe and private. **[my call]**

## Approaches

| Option | Good | Costs |
|---|---|---|
| **React Native + Expo, TypeScript** (picked) | AI coding agents write it most reliably. Same code makes the iPhone app later. Large free library ecosystem. | "Up next" alerts need one small Android-only module for background checking. |
| Native Android, Kotlin | Best control over background work. | iPhone later is close to a second app. Agents are weaker at the shared-code tooling. |
| Flutter, Dart | One code base for both phones. | Background work no easier. Agents have seen less of it. Smaller community. |

The maintainer picked React Native with Expo on 2026-11-20. **[yours]** An earlier prototype is used only for reference. Its source is not carried over. **[yours]**

## How the app works

Four layers. Each is pure where possible, so agents can test it without a phone or a network. **[my call]**

```
DiveMeets page ──► Reader ──► Parsers ──► Scoring math ──► Screens
 (live website)    hidden       HTML to      dive totals,      meets, my diver,
                   browser      typed data   trims, needed     live mode, compare
                   + cache                   scores
```

- **Reader** (`src/divemeets/reader`): loads a page in a hidden browser view and hands back its HTML. It caches every page, never loads the same page more than once a minute (30 seconds in live mode), and only loads pages the person asked for.
- **Parsers** (`src/divemeets/parsers`): pure functions from saved HTML to typed data (meet, event, diver, dive, judge awards), checked with Zod. When DiveMeets changes its pages, these break, and the tests catch it.
- **Scoring math** (`src/scoring`): pure functions for dive score (middle judges' sum × DD; 3 judges keep all, 5 drop high and low, 7 drop two of each), running totals, and "average judge score needed" for the cut, a place or a win.
- **Screens** (`src/app`, Expo Router): Home (my divers and today's meets), Meet, Event results, Diver, Compare. Built from the colors, type and spacing in the Stitch design guide. The mockups' engineering wording becomes plain language.
- **Live meet mode**: started by the person ("Follow live"). Android shows an ongoing notification ("Following Liam · Zone D") while the app re-reads the event page. When the followed diver is 3 divers away (a setting), it sends an alert. Stops when the event ends or the person taps Stop.
- **Storage**: on the phone only. Followed divers, settings and cached pages.
- **Network**: DiveMeets pages, plus one daily check of GitHub Releases for a newer version. Nothing else.

## Repo and agent setup

This is the part the maintainer said matters most. The rule is **one rulebook, many agents**: every agent reads the same `AGENTS.md`, and each agent's own file only points to it. Copilot's suggestion of seven rule folders is dropped, because copies drift apart and agents then follow old rules. **[my call]**

```
divedata/
├── AGENTS.md                  the rulebook (Codex, OpenCode, Aider and Copilot read it directly)
├── CLAUDE.md                  one line: @AGENTS.md
├── GEMINI.md                  one line pointing to AGENTS.md
├── .github/
│   ├── copilot-instructions.md  points to AGENTS.md
│   ├── workflows/ci.yml       checks on every pull request
│   ├── workflows/release.yml  builds and signs the APK when a version is tagged
│   └── ISSUE_TEMPLATE/        bug report, feature request (plain-language forms)
├── .agents/skills/            step-by-step guides every agent uses (one copy)
│   ├── add-parser/            save a page, anonymise it, write parser and test
│   ├── add-screen/            design tokens, plain-words and accessibility checklist
│   └── release/               version, changelog, tag, install page
├── .claude/                   Claude Code settings and hooks; skills mirrored from .agents/skills
├── docs/
│   ├── product.md             who it's for, version 1, the never list
│   ├── domain.md              diving terms and scoring rules, so agents never guess
│   ├── divemeets.md           page addresses, page layouts, the bot check, polite-use rules
│   ├── design.md              the Stitch design guide, adapted
│   ├── decisions/             one short dated note per decision (this page seeds them)
│   ├── specs/  plans/         designs and build plans before code
│   └── install.md             the parent-friendly install guide
├── fixtures/divemeets/        saved DiveMeets pages with names replaced by fake ones
├── mockups/                   Stitch screens and HTML, for reference (judge screen removed)
├── scripts/anonymize          replaces real names in a saved page before it is committed
├── src/                       the app (layers above)
├── LICENSE                    GPL-3.0
└── README.md, CONTRIBUTING.md
```

### What AGENTS.md holds

- What DiveData is, who it is for, and the never list, short enough to read every session.
- The exact commands: install, run, test, lint, typecheck, build.
- Where things live and which layer may call which (screens never call the reader directly).
- When work is done: tests written first and passing, checks green, plain-language text, a decision note when a rule changed.
- How work flows: GitHub issue, then branch, pull request, checks, merge.
- Hard rules: no live DiveMeets calls in tests, no real names in fixtures, no paid or non-GPL libraries, no tracking.

### Checks on every pull request (free on GitHub)

- Typecheck, lint, unit tests (parsers against saved pages, scoring math against worked examples).
- Layer check: screens must not import the reader.
- License check: fails if a library is not GPL-compatible.
- Fixture check: fails if a saved page lacks the anonymised marker.
- Android test build (a release build signed with the debug key), so a broken build never merges and the APK can be tried on a phone.
- Skills copy check: `.claude` skills match `.agents/skills`.

### Agents that need no subscription

Because the rulebook is plain `AGENTS.md`, outside contributors can use free open-source agents (OpenCode, Aider) on the same rules. The repo ships a small `.aider.conf.yml` that loads it. No local AI models are required. **[my call]**

### Personal setup stays out

The repo is public, so the maintainer's personal agent rules, notes and progress notes stay out of it. **[my call]**

## Build order

1. **Repo and agent setup**: everything in the tree above, an empty Expo app that builds, all checks running and green. No features yet.
2. **Background test (throwaway)**: follow a real live meet with the screen off for 30 minutes. Does DiveMeets let it read? Does Android let it run? This decides whether "up next" alerts work as designed.
3. **Parsers and scoring math** from saved pages.
4. **Find a meet, results, follow my diver.**
5. **Live meet mode and alerts.**
6. **What-they-need math and compare.**
7. **First release**: signed APK on GitHub, install guide, update notice.

Each step is its own design-then-plan pass and pull request, so a session ends at each milestone.

## Calls I made

Please check these while reading. Each is marked **[my call]** above.

- No accounts, analytics or crash reporting; data stays on the phone.
- The app shows DiveMeets' check to the person instead of failing silently, and never solves it itself.
- Refresh no faster than every 30 seconds in live mode, and only for the followed event.
- Alert when the diver is 3 away, changeable in settings.
- Builds on GitHub Actions, not Expo's paid service.
- Signing key in a GitHub secret; the maintainer keeps a backup of the signing key somewhere safe and private.
- One rulebook (`AGENTS.md`) instead of Copilot's seven folders.
- Saved test pages have real names replaced before commit, since many divers are minors.
- Plain-language wording replaces the mockups' "telemetry" vocabulary; the dark design stays.

## Answered questions

- **What waits for the maintainer's "merge it":** only the install guide, release notes, README and releases. Screen text merges once checks pass; the maintainer sees it in each release. **[yours]**
- **Saved DiveMeets pages for tests:** the maintainer passes DiveMeets' check in a browser; the agent saves the pages from there and replace the names before anything is committed. **[yours]**
