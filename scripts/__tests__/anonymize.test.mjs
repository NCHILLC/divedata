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
