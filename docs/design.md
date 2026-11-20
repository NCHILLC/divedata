# Design

Adapted from the "Poolside Athletic Monitor" design guide made in Google Stitch (mockups in
`mockups/`). The dark, high-contrast look stays. The guide's officiating and "telemetry" wording is
replaced with words a parent uses, and its judge and score-entry parts are left out: DiveData only
reads.

## Feel

Built for a parent on a pool deck or in the stands: bright light, glare, a phone held at arm's length,
and a few seconds to look between dives. Dark surfaces, one bright mint accent, amber for warnings.
Clear order of importance on every screen: my diver first, then their place and score, then the rest.

## Colors

| Token | Hex | Use |
|---|---|---|
| background | `#0e1417` | Screen background |
| surface-container-low | `#161c20` | Cards, table rows |
| surface-container | `#1a2024` | Headers, bars that stay on screen |
| surface-container-high | `#252b2e` | Raised cards, sheets |
| outline-variant | `#3c4a46` | Borders and grid lines |
| outline | `#859490` | Stronger borders, dividers that must show |
| on-surface | `#dde3e7` | Main text |
| on-surface-variant | `#bacac5` | Secondary text: team, round, DD |
| primary | `#57f1db` | Primary action, focus ring |
| primary-container | `#2dd4bf` | My diver's highlight, "Up next", diving now |
| secondary | `#45dfa4` | Good news: made the cut, moved up, podium |
| tertiary-container | `#ffad3a` | Warnings: failed dive, page out of date, check needed |
| error | `#ffb4ab` | Errors |
| dropped award | `#4b5563` | Judge awards that don't count, struck through |

Text on the mint accents uses `#003731` (on-primary). Check every new pair of text and background
colors for at least 4.5:1 contrast.

## Type

| Style | Font | Size / line height | Weight | Use |
|---|---|---|---|---|
| headline-xl-mobile | Space Grotesk | 30 / 36 | 700 | Screen titles |
| headline-lg | Space Grotesk | 28 / 34 | 700 | Diver name on their card |
| headline-sm | Space Grotesk | 20 / 26 | 600 | Section titles |
| body-lg | Inter | 16 / 24 | 500 | Main body text |
| body-md | Inter | 14 / 20 | 400 | Details, meet and event info |
| score-display-mobile | JetBrains Mono | 26 / 30 | 700 | Big total score |
| score-cell | JetBrains Mono | 18 / 22 | 600 | Dive scores, judge awards |
| label-md | JetBrains Mono | 12 / 16 | 600 | Small labels, letter spacing 0.05em |

Numbers (dive numbers like `107B`, DD, awards, totals) always use JetBrains Mono so columns line up
and nothing shifts as scores come in. Sizes are starting points: text must scale with the phone's
font setting, so never turn off font scaling and never fix a text box's height.

## Spacing and shape

- Spacing steps: 4, 8, 16, 24, 40. Screen side margin 16; gap between cards 16; padding inside table
  rows 4 to 8.
- Corners: 4 for buttons, chips and score cells; 8 for cards, sheets and tables; fully round only for
  small status pills.
- Depth comes from stepping surface colors and a 1px border, not from blurry shadows.

## Touch and accessibility

- Every tappable thing is at least 48 × 48, with at least 8 between targets.
- Every control has an `accessibilityLabel` that says what it does in plain words.
- Don't rely on color alone: pair it with a word or icon ("Made the cut", not only green).

## Words

Plain words a parent uses. Examples:

| Mockup said | DiveData says |
|---|---|
| Live telemetry | Live |
| Tracked athlete / pinned | My diver |
| On deck / in hole | Up next / after that |
| Stale 42s, degraded connection | Last updated 42 seconds ago |
| Board rotation flight, live queue | Dive order |
| Aggregate, running total | Total |
| Trim: high and low | Highest and lowest awards don't count |
| Net differential | Points behind / ahead |
| "What it takes" simulator | What they need |
