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

The reader (`src/divemeets/reader/`) keeps these rules: one page at a time, each page cached for a minute.

- Load a page no more than once a minute normally, and no more than every 30 seconds in live mode.
- Only load pages the person asked for (a meet they opened, an event they follow live).
- Cache every page, and serve the cache when it is fresh enough.
- Tests never call DiveMeets. They read saved pages from `fixtures/divemeets/`.

## Page layouts

Read off saved and anonymized pages (see `.agents/skills/add-parser/`). Each parser lives in
`src/divemeets/parsers/` and throws `PageChangedError` when the page is not the shape described here,
so a changed page gives an error instead of a wrong number. Addresses are relative to the host above.

Two facts to remember across pages:

- `eventnum` is not unique. An event's prelim and final share it, so `eventtype` is needed too. The
  pair (`eventnum`, `eventtype`) names one event.
- Links on one page lead to the next page the parsers read: meet list, then meet info or meet results,
  then event results, then dive sheet, then judge scores.

### Meet list: `index.php` and `meets.php?show=past...`

`parseMeetList` reads both. Home page: each meet is a small table with a link to
`meetinfoext.php?meetnum=`. The link text is the name, and the table's last row holds "City, ST" and a
date range ("Nov 17 - Nov 20, 2026"; the year belongs to the end date). Past page: one row of 7 cells
per meet with a link to `meetresultsext.php?meetnum=`: name, start date, end date, city, state, country.

### Meet info: `meetinfoext.php?meetnum=`

`parseMeetInfo`. A details table with label cells ("Name:", "Start Date:", "End date:", "Pool:"), each
followed by its value. The pool address gives city and state. The schedule is a flat run of cells: a
date cell, then one cell per event with a link to `qualrule.php?` that carries `event=` and
`eventtype=`. The page links to entries (`divesheetext.php`), never to results.

### Meet results: `meetresultsext.php?meetnum=`

Event names never carry the stage. `parseMeetResults` reads it from the bracketed text after each link ("(Final)") and `parseMeetInfo` splits it off the front of the schedule name ("Final Women Platform"); both give `stage` separately, so prelim and final of one event share a name.

`parseMeetResults`. The meet number and name, then one link per event to `eventresultsext.php?`
(the `eventnum=all` link is skipped). The event's date sits in the cell two over from the link. While a
meet is in progress the page may list no events yet; that is an empty list, not an error.

### Event results: `eventresultsext.php?meetnum=&eventnum=&eventtype=`

`parseEventResults`. The event name is the large bold text; a stage such as "Prelim/Quarterfinal"
follows it in brackets (finals have none). The table header is Diver, Team, Place, Score, Diff, and
each result row has 5 cells: a diver link to `profile.php?number=`, the team, the place, the score (a link to the dive sheet,
`divesheetresultsext.php?`) and the gap. Places read `3`, `3T`, `T-3` or `T - 3`; the T marks a tie. `EXHB` is an exhibition entry (scored, not ranked). One reader (`parsePlace` in `common.ts`) serves event results, the dive sheet's Round Place and the diver profile. A blank
place or score (an unfinished event) reads as nothing, not zero.

### Dive sheet: `divesheetresultsext.php?meetnum=&eventnum=&dvrnum=&eventtype=`

`parseDiveSheet`. One diver in one event. The table header is Dive, Number, Height, Description, Net
Score, DD, Score, Round Place; each dive row has those 8 cells, and a "Totals" row ends the table. The
sheet has no judge awards. They sit on one judge-scores page per dive, linked from the score cell. Dives
not yet scored (net, DD and score all blank) are skipped. A row that is only partly filled is an error.

### Judge scores: `judgesscoresext.php?...&divord=`

`parseJudgeScores`. One dive. Rows labelled "Diver:" (name and team) and "Dive:" (description and
height in brackets), then one 3-cell row per judge with the award in the last cell (judge names are
never read), then a "Total" row. The Total is the kept awards added up, with the highest and lowest
dropped (two of each on a 7-judge panel), not the sum of all awards. The page shows no dive number, DD or dive score; take those from the
dive sheet.

### Diver profile: `profile.php?number=`

`parseDiverProfile`. The name and DiveMeets number sit next to bold labels at the top. Two tables follow:
"Upcoming Meets" (not read) and "DIVEMEETS.COM History" (read). In History, a one-cell row is a meet
name; the 3-cell rows below it are the events: name and stage, place, and the score as a link to the
dive sheet. The meet row has no meet number and no date; the meet number comes from `meetnum=` in its
event links. Exhibition events show `EXHB` for the place and read as no place, with the score kept.

### Diver search: `memberlist.php`

`parseDiverSearch`. A "N Record(s) Found" line, then one `div.showresults` entry per match, each with a
link to `profile.php?number=`. The count must match the rows read, so a layout change that drops rows
is an error. Zero found is an empty list.

### Live board: `livestats.php`, `livedivesheet.php`

Saved in `fixtures/divemeets/live/`, but not parsed yet. Milestone 5 does that.

## Known gaps

- DiveMeets has no meet-search-by-name page; the app filters the home page's meets instead
  (docs/decisions/2026-11-20-meet-name-search.md).
- No 3-judge dive sheet. The only 3-judge page seen is the live board.
- No failed-dive or penalty example in any saved page.
- Only one diver profile layout (an adult diver) is saved.
- Exhibition (`EXHB`) places read as no place, flagged `exhibition`.
- Synchronized events: the dive sheet and event results read only the first diver's profile link, so the
  partner is not read.
- Heights are written `3M` on the dive sheet and `3 Meter` on the judge page; the parsers turn both into
  `3 m` (docs/decisions/2026-11-20-board-heights.md).
- An upcoming meet's results page is not saved. The meet screen expects it to read like a meet in progress
  (no events yet).
- A past meet without a results link is left out of the past meets list.
