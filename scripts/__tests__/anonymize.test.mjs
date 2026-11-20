import fs from 'node:fs';
import path from 'node:path';
import { anonymize } from '../anonymize.mjs';

const sample = fs.readFileSync(path.join(__dirname, 'sample-results.html'), 'utf8');

test('replaces each diver with a stable fake name', () => {
  const out = anonymize(sample); // two links to profile.php?number=111, one to 222
  expect(out).not.toMatch(/Jane Realname|Sam Realname/);
  expect(out.match(/>Diver 1</g)).toHaveLength(2);
  expect(out).toMatch(/>Diver 2</);
});

test('adds the marker as line 1', () => {
  expect(anonymize(sample).split('\n')[0]).toBe('<!-- anonymized: divedata -->');
});

test('adds the marker only once when run twice', () => {
  const twice = anonymize(anonymize(sample));
  expect(twice.match(/anonymized: divedata/g)).toHaveLength(1);
});

test('removes emails and phone numbers', () => {
  expect(anonymize('<p>a@b.com 704-555-0199</p>')).not.toMatch(/@|555/);
  expect(anonymize(sample)).not.toMatch(/referee@|555-0142/);
});

test('keeps scores', () => {
  expect(anonymize(sample)).toMatch(/218\.40/);
});

test('replaces the real diver number, the same way each time', () => {
  const out = anonymize(sample);
  expect(out).not.toMatch(/number=111|number=222/);
  const fakes = [...out.matchAll(/number=(\d+)/g)].map((m) => m[1]);
  expect(fakes).toHaveLength(3);
  expect(fakes[0]).toBe(fakes[2]); // both links to diver 111
  expect(fakes[0]).not.toBe(fakes[1]);
});

test('replaces a name wrapped in another tag inside the link', () => {
  const out = anonymize('<a href="profile.php?number=111"><b>Real Kid</b></a>');
  expect(out).not.toMatch(/Real Kid/);
  expect(out).toMatch(/>Diver 1</);
});

test('replaces judge and coach names with Judge N and Coach N', () => {
  const out = anonymize(
    '<a href="profilej.php?number=82890" onclick="return profpopup(this,82890)">Realjudge, Pat </a>' +
      '<a href="profilej.php?number=11444" onclick="return profpopup(this,11444)">Otherjudge, Lee </a>' +
      'Coach: <a href="profilec.php?number=14096" onclick="return profpopup(this,14096)">Realcoach Sam</a>',
  );
  expect(out).not.toMatch(/Realjudge|Otherjudge|Realcoach|82890|11444|14096/);
  expect(out).toMatch(/profilej\.php\?number=1" onclick="return profpopup\(this,1\)">Judge 1</);
  expect(out).toMatch(/>Judge 2</);
  expect(out).toMatch(/profilec\.php\?number=1" onclick="return profpopup\(this,1\)">Coach 1</);
});

test('replaces the real diver number in the profile popup, photo and dive links', () => {
  const out = anonymize(
    '<a href="profile.php?number=64913" onclick="return profpopup(this,64913)">Real Kid</a>' +
      '<img src="profilephotos/64913.jpg">' +
      '<a href="judgesscoresext.php?meetnum=13501&amp;eventnum=7160&amp;dvrnum=64913">Scores</a>' +
      '<a href="diversdives.php?dvrnum=64913&amp;height=1">103B</a>',
  );
  expect(out).not.toMatch(/64913|Real Kid/);
  expect(out).toMatch(/profpopup\(this,1\)">Diver 1</);
  expect(out).toMatch(/profilephotos\/1\.jpg/);
  expect(out).toMatch(/meetnum=13501&amp;eventnum=7160&amp;dvrnum=1"/);
  expect(out).toMatch(/diversdives\.php\?dvrnum=1&amp;/);
});

test('keeps team links and their numbers', () => {
  const team = '<a href="profilet.php?number=5512" onclick="return profpopup(this,5512)">Rice University</a>';
  expect(anonymize(team)).toContain(team);
});

test('replaces the name, home town and number on a diver profile page', () => {
  const out = anonymize(
    '<strong>Name: </strong>Real Person<br><strong>City/State: </strong>Realtown TX<br>' +
      '<strong>DiveMeets #: </strong>65393<br><a href="diversdives.php?dvrnum=65393&amp;height=1">103B</a>',
  );
  expect(out).not.toMatch(/Real Person|Realtown|65393/);
  expect(out).toMatch(/Name: <\/strong>Diver 1<br>/);
  expect(out).toMatch(/City\/State: <\/strong>Hometown<br>/);
  expect(out).toMatch(/DiveMeets #: <\/strong>1<br>/);
  expect(out).toMatch(/dvrnum=1&amp;/);
});

test('replaces the diver number in dive sheet windows and live board links', () => {
  const out = anonymize(
    '<a href="profile.php?number=64913">Real Kid</a>' +
      '<a href="x.php?dvrnum=64913" target="_&quot;13501-9-7160-64913&quot;">1</a>' +
      '<a href="diversdives.php?dvrnum=64913&amp;type=max" target="_divmax64913">2</a>' +
      '<a href="diversdives.php?dvrnum=64913" target="_divdiv64913">2</a>' +
      '<a href="divesheetext.php?meetnum=13501&amp;eventnum=550&amp;eventtype=1#64913">2</a>' +
      '<a href="livedivesheet.php?divesheet=13172-7160-1-1795215570-64913&amp;format=pc" onclick="return smalldspopup(this,64913)">3</a>',
  );
  expect(out).not.toMatch(/64913/);
  expect(out).toMatch(/target="_&quot;13501-9-7160-1&quot;"/);
  expect(out).toMatch(/target="_divmax1"/);
  expect(out).toMatch(/target="_divdiv1"/);
  expect(out).toMatch(/eventnum=550&amp;eventtype=1#1"/);
  expect(out).toMatch(/divesheet=13172-7160-1-1795215570-1&amp;/);
  expect(out).toMatch(/smalldspopup\(this,1\)/);
});

test('replaces the diver named in plain text on a judges scores page, keeping the team', () => {
  const out = anonymize(
    '<td>Diver: <strong>Realname-Smith, Pat Q - University of Utah (U)</strong></td>' +
      '<a href="divesheetresultsext.php?meetnum=11547&amp;dvrnum=64913">Sheet</a>',
  );
  expect(out).not.toMatch(/Realname|Pat Q/);
  expect(out).toMatch(/Diver: <strong>Diver 1 - University of Utah \(U\)<\/strong>/);
  expect(out).toMatch(/dvrnum=1"/);
});

test('blanks the Cloudflare request id left by the visit that saved the page', () => {
  const out = anonymize("<script>window.__CF$cv$params={r:'a5db216149a3e001',t:'MTc5NTIxNTU3MA=='};</script>");
  expect(out).not.toMatch(/a5db216149a3e001|MTc5NTIxNTU3MA/);
  expect(out).toMatch(/__CF\$cv\$params=\{r:'',t:''\}/);
});
