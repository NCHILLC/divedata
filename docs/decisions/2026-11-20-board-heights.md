# Board heights are matched

2026-11-20: DiveMeets writes one board two ways: `3M` on the dive sheet and `3 Meter` on the judge page.
The maintainer chose to treat them as the same board. The parsers turn both into `3 m` (`boardHeight` in
`src/divemeets/parsers/common.ts`), so the app shows one label everywhere. A height in any other form is
kept as written.
