# 2026-11-22: test live mode on the emulator with a pretend meet

Live mode's alerts only show while a board moves, real boards move a few hours a week, and a phone run needs
the maintainer's phone. So live mode is tested on the Android emulator against a pretend meet on the same
computer (`scripts/pretend-meet.mjs`): one made-up event that moves a dive every 40 seconds, then closes.

- The app reads DiveMeets' address from `EXPO_PUBLIC_DIVEMEETS` when a build sets it, and DiveMeets otherwise.
  Only the emulator build (`.github/workflows/emulator-build.yml`) sets it. That build also allows plain http,
  for the pretend meet, and is for the emulator only.
- The emulator build runs on request and on pull requests that change it, not on every pull request.
- A phone run on a real meet is still needed before a release: the emulator doesn't show what a real phone's
  battery saving or maker rules do, or what DiveMeets itself does. Steps: `docs/testing-live-mode.md`.
