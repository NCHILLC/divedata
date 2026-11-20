// Fails when a production dependency's license is not on DiveData's GPL-compatible list.
// Usage: npm run check:licenses
import path from 'node:path';

export const ALLOWED = [
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'CC0-1.0',
  'Unlicense', 'BlueOak-1.0.0', 'Python-2.0', 'LGPL-3.0', 'GPL-3.0',
  // Added 2026-11-20 for Expo's build tools; see docs/decisions/2026-11-20-license-list.md
  'CC-BY-4.0', 'MPL-2.0',
  // The SPDX -only / -or-later names for GPL-3.0 and LGPL-3.0, added 2026-11-20; same decision note.
  'GPL-3.0-only', 'GPL-3.0-or-later', 'LGPL-3.0-only', 'LGPL-3.0-or-later',
];

// A plain license must be listed. In an SPDX expression, "OR" passes when any one choice passes
// (the user of the package picks which license applies) and "AND" passes only when every part
// passes. "AND" binds tighter than "OR", as SPDX says. A license with an exception ("WITH") is not
// on the list, so it fails, and so does anything that does not parse.
export function isAllowed(license) {
  const tokens = license.match(/\(|\)|[^\s()]+/g) ?? [];
  let i = 0;
  const parseOr = () => {
    let ok = parseAnd();
    while (tokens[i] === 'OR') { i++; ok = parseAnd() || ok; }
    return ok;
  };
  const parseAnd = () => {
    let ok = parseAtom();
    while (tokens[i] === 'AND') { i++; ok = parseAtom() && ok; }
    return ok;
  };
  const parseAtom = () => {
    const token = tokens[i++];
    if (token === '(') {
      const ok = parseOr();
      if (tokens[i++] !== ')') throw new Error('unbalanced');
      return ok;
    }
    if (token === undefined || ['OR', 'AND', 'WITH', ')'].includes(token)) throw new Error('bad');
    if (tokens[i] === 'WITH') { i += 2; return false; }
    return ALLOWED.includes(token);
  };
  try {
    const ok = parseOr();
    return i === tokens.length && ok;
  } catch {
    return false;
  }
}

// report: license-checker's JSON, { "name@version": { licenses: string | string[] } }
export function failures(report) {
  return Object.entries(report)
    .map(([pkg, info]) => [pkg, [].concat(info.licenses ?? 'UNKNOWN')])
    .filter(([, licenses]) => !licenses.every(isAllowed))
    .map(([pkg, licenses]) => `${pkg}: ${licenses.join(', ')}`);
}

async function main() {
  const { init } = await import('license-checker-rseidelsohn');
  const report = await new Promise((resolve, reject) =>
    init({ start: process.cwd(), production: true, excludePrivatePackages: true },
      (err, json) => (err ? reject(err) : resolve(json))),
  );
  const bad = failures(report);
  if (bad.length) {
    console.error(`Licenses not on the allowed list (${bad.length}):`);
    bad.forEach((line) => console.error(`  ${line}`));
    process.exit(1);
  }
  console.log(`All ${Object.keys(report).length} production packages have allowed licenses.`);
}

if (path.basename(process.argv[1] ?? '') === 'check-licenses.mjs') {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
