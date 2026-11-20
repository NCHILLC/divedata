// Fails when a saved page under fixtures/ does not start with the anonymized marker.
// Usage: npm run check:fixtures
import fs from 'node:fs';
import path from 'node:path';

const MARKER = '<!-- anonymized: divedata -->';

// Returns the paths of files (in any subfolder) whose first line is not the marker.
export function checkFixtures(dir) {
  return fs.readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name !== '.gitkeep')
    .map((entry) => path.join(entry.parentPath, entry.name))
    .filter((file) => {
      const firstLine = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').split(/\r?\n/)[0];
      return firstLine !== MARKER;
    })
    .sort();
}

if (path.basename(process.argv[1] ?? '') === 'check-fixtures.mjs') {
  const missing = checkFixtures('fixtures');
  if (missing.length) {
    console.error('These fixtures are missing the anonymized marker. Run node scripts/anonymize.mjs on them:');
    missing.forEach((file) => console.error(`  ${file}`));
    process.exit(1);
  }
  console.log('All fixtures are anonymized.');
}
