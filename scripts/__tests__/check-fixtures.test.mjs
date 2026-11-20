import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkFixtures } from '../check-fixtures.mjs';

const MARKER = '<!-- anonymized: divedata -->';

function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'divedata-fixtures-'));
}

test('finds a marker-less file in a subfolder', () => {
  const dir = tmpDir();
  fs.mkdirSync(path.join(dir, 'meet-123'));
  fs.writeFileSync(path.join(dir, 'ok.html'), `${MARKER}\n<p>ok</p>\n`);
  const nestedPath = path.join(dir, 'meet-123', 'results.html');
  fs.writeFileSync(nestedPath, '<p>Real Name</p>\n');
  expect(checkFixtures(dir)).toEqual([nestedPath]);
});

test('accepts a marked file with CRLF endings', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, 'crlf.html'), `${MARKER}\r\n<p>ok</p>\r\n`);
  expect(checkFixtures(dir)).toEqual([]);
});

test('ignores .gitkeep', () => {
  const dir = tmpDir();
  fs.writeFileSync(path.join(dir, '.gitkeep'), '');
  expect(checkFixtures(dir)).toEqual([]);
});
