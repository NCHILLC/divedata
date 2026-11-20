# Diving terms and scoring

Agents use this page so they never guess. Nothing here has been checked against a saved DiveMeets
page yet: every section says "unverified, check against a real page" until a fixture confirms it
(milestone 3).

## Dive numbers (unverified, check against a real page)

A dive number is digits plus a position letter, for example `107B` or `5253B`.

- First digit, the group: 1 forward, 2 back, 3 reverse, 4 inward, 5 twisting, 6 armstand.
- Groups 1 to 4 (`107B`): the second digit is 1 for a flying dive, otherwise 0. The third digit is the
  number of half somersaults (`107` = 3½ somersaults).
- Twisting dives, 5xxx (`5253B`): the second digit is the direction group (1 to 4), the third is the
  number of half somersaults, the fourth is the number of half twists.
- Armstand dives, 6xx or 6xxx: the second digit is the direction, the third the half somersaults, and
  a fourth digit the half twists.
- Position letter: A straight, B pike, C tuck, D free.

## Degree of difficulty (DD)

Each dive and height has a fixed DD, for example `3.0`. DiveMeets prints the DD next to each dive. The
app uses the DD DiveMeets publishes; it does not look DDs up itself. (Unverified, check against a real
page.)

## Judge panels and dive score (unverified, check against a real page)

- 3 judges: keep all three awards.
- 5 judges: drop the highest and the lowest, keep three.
- 7 judges: drop the two highest and the two lowest, keep three.
- Dive score = sum of kept awards × DD. Example: awards 7.5, 7.0, 7.5, 8.0, 7.0 with DD 2.9 → drop 8.0
  and one 7.0 → 22.0 × 2.9 = 63.80.

Meets vary in how they normalise panels (and synchronized diving uses larger panels), so the app shows
the score DiveMeets publishes. The scoring tests check the math against those published scores.

## Rounds, prelims, semis, finals, cut lines (unverified, check against a real page)

- An event has a set number of rounds; each round is one dive per diver. The count varies by event and
  level (for example 6 or 11).
- Large events run prelims, then semifinals, then finals. After prelims or semis, only the top
  divers move on; the cut line is the score of the last diver who moves on.
- Whether scores carry over from one stage to the next varies by meet.
- The running total is the sum of a diver's dive scores so far in the stage.
