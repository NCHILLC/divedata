import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { syncSkills, checkSkills } from '../sync-skills.mjs';

function setup() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'divedata-skills-'));
  const src = path.join(root, '.agents', 'skills');
  const dest = path.join(root, '.claude', 'skills');
  fs.mkdirSync(path.join(src, 'add-parser'), { recursive: true });
  fs.writeFileSync(path.join(src, 'add-parser', 'SKILL.md'), '---\nname: add-parser\n---\nSteps\n');
  return { src, dest };
}

test('after a sync, the check passes', () => {
  const { src, dest } = setup();
  syncSkills(src, dest);
  expect(checkSkills(src, dest)).toEqual([]);
});

test('editing the copy under .claude/skills fails the check and names the file', () => {
  const { src, dest } = setup();
  syncSkills(src, dest);
  fs.appendFileSync(path.join(dest, 'add-parser', 'SKILL.md'), 'edited here by mistake\n');
  expect(checkSkills(src, dest)).toEqual(['add-parser/SKILL.md']);
});

test('a missing copy and an extra file both fail the check', () => {
  const { src, dest } = setup();
  syncSkills(src, dest);
  fs.mkdirSync(path.join(src, 'release'));
  fs.writeFileSync(path.join(src, 'release', 'SKILL.md'), 'new\n');
  fs.writeFileSync(path.join(dest, 'add-parser', 'notes.md'), 'stray\n');
  expect(checkSkills(src, dest)).toEqual(['add-parser/notes.md', 'release/SKILL.md']);
});

test('a CRLF-only difference passes', () => {
  const { src, dest } = setup();
  syncSkills(src, dest);
  const copy = path.join(dest, 'add-parser', 'SKILL.md');
  fs.writeFileSync(copy, fs.readFileSync(copy, 'utf8').replace(/\n/g, '\r\n'));
  expect(checkSkills(src, dest)).toEqual([]);
});

test('the check never writes', () => {
  const { src, dest } = setup();
  checkSkills(src, dest);
  expect(fs.existsSync(dest)).toBe(false);
});
