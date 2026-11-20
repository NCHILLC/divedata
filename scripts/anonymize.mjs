// Replaces real people in a saved DiveMeets page before it is committed as a test fixture.
// Usage: node scripts/anonymize.mjs <in.html> <out.html>
//
// Today it handles diver profile links (name and number), emails and North American phone numbers.
// Judge names and other page types get added in milestone 3, once real pages are saved.
import fs from 'node:fs';
import path from 'node:path';

export const MARKER = '<!-- anonymized: divedata -->';

// The whole link text is replaced, even when the name sits inside another tag such as <b>.
const PROFILE_LINK = /(<a\b[^>]*profile\.php\?number=(\d+)[^>]*>)[\s\S]*?(<\/a>)/gi;
// The real diver number opens the real profile, so it is swapped for a fake one too.
const PROFILE_NUMBER = /(profile\.php\?number=)(\d+)/gi;
const EMAIL = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g;

export function anonymize(html) {
  // DiveMeets diver number -> fake number N, in order of first appearance. Diver N gets number N.
  const fakes = new Map();
  const fake = (number) => {
    if (!fakes.has(number)) fakes.set(number, fakes.size + 1);
    return fakes.get(number);
  };
  const body = html
    .replace(/\r\n/g, '\n')
    .replace(new RegExp(`^${MARKER}\n?`), '')
    .replace(PROFILE_LINK, (_, open, number, close) => `${open}Diver ${fake(number)}${close}`)
    .replace(PROFILE_NUMBER, (_, prefix, number) => `${prefix}${fake(number)}`)
    .replace(EMAIL, '[email removed]')
    .replace(PHONE, '[phone removed]');
  return `${MARKER}\n${body}`;
}

if (path.basename(process.argv[1] ?? '') === 'anonymize.mjs') {
  const [input, output] = process.argv.slice(2);
  if (!input || !output) {
    console.error('Usage: node scripts/anonymize.mjs <in.html> <out.html>');
    process.exit(1);
  }
  fs.writeFileSync(output, anonymize(fs.readFileSync(input, 'utf8')));
  console.log(`Wrote ${output}. Open it and check no real name is left before committing.`);
}
