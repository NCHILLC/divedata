// A pretend DiveMeets on this computer, for testing live mode on the Android emulator without a real meet.
// One made-up event: its live board moves one dive every few seconds through 3 rounds, then the event closes.
// The meet page, diver pages and home page are saved fixtures. Steps: docs/testing-live-mode.md.
// Usage: node scripts/pretend-meet.mjs [seconds per dive, default 40]
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';

export const ROUNDS = 3;
export const DIVERS = ['A', 'B', 'C', 'D', 'E', 'F'].map((letter, i) => ({
  number: 900001 + i,
  name: `Pretend Diver ${letter} (TST)`,
}));
export const BOARD = 'livestats.php?event=stats-999001-1-9-Started';

// A fixed, made-up score for each dive, so a run is the same every time.
const score = (diver, round) => 40 + ((diver * 7 + round * 5) % 16);

/** The live board after `step` dives: the same shapes the real page has, as far as the app reads them. */
export function boardHtml(step) {
  const closed = step >= DIVERS.length * ROUNDS;
  const round = closed ? ROUNDS : Math.floor(step / DIVERS.length) + 1;
  const dived = closed ? DIVERS.length : step % DIVERS.length;
  const totals = DIVERS.map((_, d) => {
    let t = 0;
    for (let r = 1; r <= round; r++) if (r < round || d < dived) t += score(d, r);
    return t;
  });
  const places = totals.map((t, d) => 1 + totals.filter((u, e) => u > t || (u === t && e < d)).length);
  const link = (d, text) => `<a href="profile.php?number=${DIVERS[d].number}">${text}</a>`;
  const next = closed
    ? ''
    : `<td valign="top"><strong>Next Diver:</strong> ${link(dived, DIVERS[dived].name.replace(' (', '('))}<br>` +
      `<strong>Diver Order:</strong> ${dived + 1}<br></td>`;
  const rows = DIVERS.map(
    (diver, d) =>
      `<tr><td>${!closed && d >= dived ? '*' : ''}</td><td>${d + 1}</td><td>${places[d]}</td>` +
      `<td>${totals[d].toFixed(2)}</td><td>${link(d, diver.name)}</td></tr>`,
  ).join('\n');
  return `<!doctype html><html><head><title>MeetControl / DiveMeets</title></head><body>
<div id="Results">
<strong>Unofficial Statistics<br>Pretend Women 1m (Final)</strong>
<table><tbody><tr>${next}</tr></tbody></table>
<p>Current Round: ${round} / ${ROUNDS}</p>
${closed ? '<p>This event is now closed.</p>' : ''}
<table><tbody>
<tr><td class="titlebar">Divers<br>Left to<br>Dive</td><td class="titlebar">Diver<br>Order</td><td class="titlebar">Current<br>Place</td><td class="titlebar">Current<br>Score</td><td class="titlebar">Diver Name</td></tr>
${rows}
</tbody></table>
</div></body></html>`;
}

const fixture = (name) => fs.readFileSync(path.join('fixtures', 'divemeets', name), 'utf8');

/** A saved diver page made into this pretend diver's, since Follow takes the number and name from it. */
export function profileHtml(number) {
  const diver = DIVERS.find((d) => d.number === number);
  return fixture('diver-profile/adult.html')
    .replace(/(DiveMeets #: <\/strong>)\d+/, `$1${number}`)
    .replace(/(Name: <\/strong>)[^<]*/, `$1${diver ? diver.name.replace(/ \(.*/, '') : 'Not a pretend diver'}`);
}

if (path.basename(process.argv[1] ?? '') === 'pretend-meet.mjs') {
  const seconds = Number(process.argv[2] ?? 40);
  const started = Date.now();
  // The meet page links this event's board in place of the saved meet's boards.
  const meet = fixture('meet-results/in-progress.html').replace(/livestats\.php\?event=[\w-]+/g, BOARD);
  const pages = {
    'index.php': () => fixture('meet-list/upcoming.html'),
    'meetresultsext.php': () => meet,
    'profile.php': (q) => profileHtml(Number(q.get('number'))),
    'livestats.php': () => boardHtml(Math.floor((Date.now() - started) / 1000 / seconds)),
  };
  http
    .createServer((req, res) => {
      const url = new URL(req.url, 'http://x');
      const page = pages[path.basename(url.pathname)];
      console.log(`${new Date().toLocaleTimeString()} ${page ? 200 : 404} ${req.url}`);
      res.writeHead(page ? 200 : 404, { 'content-type': 'text/html; charset=utf-8' });
      res.end(page ? page(url.searchParams) : 'Not part of the pretend meet');
    })
    // Only this computer can reach it; the emulator reaches this computer as 10.0.2.2.
    .listen(8080, '127.0.0.1', () =>
      console.log(`Pretend meet on http://127.0.0.1:8080/divemeets/system/, one dive every ${seconds} s`),
    );
}
