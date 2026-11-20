---
name: add-screen
description: Use when adding or changing a screen in src/app. Covers design tokens, plain words, accessibility and the render test.
---

# Add a screen

Screens live in `src/app/` (Expo Router: every file there is a route). Screens get data from parsers
and scoring, never from the reader (`npm run check:layers`). Tests go in `src/__tests__/`, never under
`src/app/`.

1. **Write a render test first** in `src/__tests__/`, using `@testing-library/react-native`
   (`await render(...)`). Check the words a parent sees. Watch it fail.
2. **Build the screen** with the colors, type, spacing and corner sizes in `docs/design.md`. Don't
   invent new colors.
3. **Plain-words checklist** for every word on screen:
   - Would a parent at a meet say it? "Up next", not "on deck queue"; "Total", not "aggregate".
   - No engineering terms: no "telemetry", "scrape", "buffer", "stream", "sync".
   - Errors say what happened and what to do: "DiveMeets wants to check you're a person. Tap to
     continue."
   - See the word table in `docs/design.md`.
4. **Accessibility checklist:**
   - Every tappable thing is at least 48 × 48, with at least 8 between targets.
   - Every control has an `accessibilityLabel` in plain words.
   - Text scales with the phone's font setting: never set `allowFontScaling={false}`, never fix a
     text box's height.
   - Color is never the only signal.
5. Run every check in AGENTS.md "Commands", then open a pull request.
