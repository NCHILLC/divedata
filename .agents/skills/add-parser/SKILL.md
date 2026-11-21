---
name: add-parser
description: Use when adding or fixing a parser that turns a saved DiveMeets page into typed data. Covers saving the page, removing real names, the fixture, the test and the docs.
---

# Add a DiveMeets parser

Parsers live in `src/divemeets/parsers/`. They are pure functions from saved HTML to typed data
(meet, event, diver, dive, judge awards), checked with Zod. Tests never call DiveMeets.

1. **Get the page.** The maintainer opens DiveMeets in his own Chrome and passes the Cloudflare check
   himself. (It never passed in the Claude desktop browser pane.) Never try to pass or skip the check.
   Run a small relay on `127.0.0.1`: a Node script kept outside the repo that accepts a POST and writes
   the body to a folder outside the repo. From the page in Chrome, POST
   `document.documentElement.outerHTML` to the relay. Load at most one page a minute. Raw pages stay
   outside the repo.
2. **Remove real names.** Run `node scripts/anonymize.mjs <saved.html> <out.html>`. Open every output and
   read it for names: diver names become `Diver 1`, `Diver 2`, ...; emails and phone numbers are removed. If any
   real name is left (a judge, a coach, a club contact), extend `scripts/anonymize.mjs` with a test
   first, then run it again. Many divers are minors.
3. **Add the fixture.** Put the output in `fixtures/divemeets/<page-type>/`, for example
   `fixtures/divemeets/event-results/`. Its first line must be `<!-- anonymized: divedata -->`; run
   `npm run check:fixtures`.
4. **Write the parser test** against the fixture, with the values you read off the page. Run it and
   watch it fail.
5. **Write the parser** until the test passes. Use the scoring rules in `docs/domain.md`; when the page
   confirms one, remove its "unverified" note.
6. **Update `docs/divemeets.md`** with the page's address pattern and the layout facts the parser
   relies on.
7. Run every check in AGENTS.md "Commands", then open a pull request.
