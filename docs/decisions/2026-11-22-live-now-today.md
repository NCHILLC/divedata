# "Live now" shows only today's boards

2026-11-22: DiveMeets left UChicago's Saturday boards (meet 13418) marked `-Started` on Sunday, frozen at
round 6, so the meet screen listed them under "Live now". The maintainer chose: show under "Live now" only
boards whose event the meet's schedule (`meetinfoext.php`) puts on today, the phone's date. If the schedule
can't be read, or doesn't give the board's event a day, the board still shows: better a frozen board than a
hidden running one. The meet screen reads the schedule only when a board is marked `-Started`, one extra page
per visit. A board frozen earlier the same day still shows; nothing on DiveMeets' pages tells it apart.
