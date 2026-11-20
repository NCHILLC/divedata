// .agents/skills is the one copy of the skills. Claude Code reads .claude/skills, so this keeps a mirror.
// Usage: npm run sync:skills       copy .agents/skills to .claude/skills
//        npm run check:skills      (--check) list differing files and exit 1; never writes
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.join('.agents', 'skills');
const DEST = path.join('.claude', 'skills');

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name)).split(path.sep).join('/'));
}

const read = (file) => fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

export function syncSkills(src = SRC, dest = DEST) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.cpSync(src, dest, { recursive: true });
}

// Returns the files (relative, forward slashes) that are missing, extra or different in dest.
export function checkSkills(src = SRC, dest = DEST) {
  const all = new Set([...listFiles(src), ...listFiles(dest)]);
  return [...all]
    .filter((file) => {
      const a = path.join(src, file);
      const b = path.join(dest, file);
      return !fs.existsSync(a) || !fs.existsSync(b) || read(a) !== read(b);
    })
    .sort();
}

if (path.basename(process.argv[1] ?? '') === 'sync-skills.mjs') {
  if (process.argv.includes('--check')) {
    const differing = checkSkills();
    if (differing.length) {
      console.error('.claude/skills does not match .agents/skills. Edit .agents/skills, then run npm run sync:skills.');
      differing.forEach((file) => console.error(`  ${file}`));
      process.exit(1);
    }
    console.log('.claude/skills matches .agents/skills.');
  } else {
    syncSkills();
    console.log('Copied .agents/skills to .claude/skills.');
  }
}
