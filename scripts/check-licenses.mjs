// Fails when a production dependency's license is not on DiveData's GPL-compatible list.
// Usage: npm run check:licenses
import path from 'node:path';

export const ALLOWED = [
  'MIT', 'ISC', 'BSD-2-Clause', 'BSD-3-Clause', 'Apache-2.0', '0BSD', 'CC0-1.0',
  'Unlicense', 'BlueOak-1.0.0', 'Python-2.0', 'LGPL-3.0', 'GPL-3.0',
  // Added 2026-11-20 for Expo's build tools; see docs/decisions/2026-11-20-license-list.md
  'CC-BY-4.0', 'MPL-2.0',
];

// A plain license must be listed. An SPDX "OR" expression passes when any one choice is listed,
// since the user of the package picks which license applies.
export function isAllowed(license) {
  const choices = license.replace(/[()]/g, '').split(/\s+OR\s+/);
  return choices.some((choice) => ALLOWED.includes(choice.trim()));
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
