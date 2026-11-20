# DiveMeets

## Host

Pages live under `https://secure.meetcontrol.com/divemeets/system/`. Diver profile links look like
`profile.php?number=<diver number>`.

## The bot check

On 2026-11-20 these pages sat behind a Cloudflare "verify you are human" check that returned 403 to an
automated reader. So each phone reads DiveMeets itself through a hidden in-app browser, the way a
person's browser would. If the check appears, the app shows it to the person, who passes it
themselves. The app never solves it, never works around it, and never uses a server in between.

## Polite use

- Load a page no more than once a minute normally, and no more than every 30 seconds in live mode.
- Only load pages the person asked for (a meet they opened, an event they follow live).
- Cache every page, and serve the cache when it is fresh enough.
- Tests never call DiveMeets. They read saved pages from `fixtures/divemeets/`.

## Page layouts

Filled in at milestone 3, from saved and anonymized pages (see `.agents/skills/add-parser/`).
