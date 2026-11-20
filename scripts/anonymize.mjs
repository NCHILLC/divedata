// Replaces real people in a saved DiveMeets page before it is committed as a test fixture.
// Usage: node scripts/anonymize.mjs <in.html> <out.html>
//
// It handles divers, judges and coaches (name and DiveMeets number, wherever the number shows up:
// profile links, popups, photos, dive links), the name and home town on a diver profile page,
// emails and North American phone numbers. Team links stay: team, meet and place names are public.
import fs from 'node:fs';
import path from 'node:path';

export const MARKER = '<!-- anonymized: divedata -->';

// profile.php is a diver, profilej.php a judge, profilec.php a coach. profilet.php (a team) is left alone.
const KINDS = { '': 'Diver', j: 'Judge', c: 'Coach' };
// The whole link text is replaced, even when the name sits inside another tag such as <b>.
const PERSON_LINK = /(<a\b[^>]*profile([jc]?)\.php\?number=(\d+)[^>]*>)[\s\S]*?(<\/a>)/gi;
// A diver's number also opens their dive list, dive sheet, judges' scores and photo, and names the
// window a dive sheet opens in. In those window names and live board links it is the last number.
const DIVER_NUMBER =
  /(dvrnum=|profilephotos\/|DiveMeets #: <\/strong>|_divmax|_divdiv|divesheetext\.php\?[^"#]*#|smalldspopup\(this,|divesheet=(?:\d+-){4}|target="_&quot;(?:\d+-){3})(\d+)/gi;
const PROFILE_NAME = /(Name: <\/strong>)[^<]*/i;
const PLAIN_DIVER = /(Diver: <strong>)([^<]*?)((?: - [^<]*)?<\/strong>)/gi;
const HOME_TOWN =/(City\/State: <\/strong>)[^<]*/gi;
// Cloudflare stamps each page with the id and time of the visit that loaded it.
const CF_VISIT = /(__CF\$cv\$params=\{r:')[^']*(',t:')[^']*'/g;
const EMAIL =/[\w.+-]+@[\w-]+(?:\.[\w-]+)+/g;
const PHONE = /(?:\+?1[\s.-]?)?\(?\b\d{3}\)?[\s.-]?\d{3}[\s.-]\d{4}\b/g;

export function anonymize(html) {
  // Real number -> fake number N, per kind, in order of first appearance. Judge N gets number N.
  const fakes = { Diver: new Map(), Judge: new Map(), Coach: new Map() };
  const fake = (kind, number) => {
    const map = fakes[kind];
    if (!map.has(number)) map.set(number, map.size + 1);
    return map.get(number);
  };
  let body = html.replace(/\r\n/g, '\n').replace(new RegExp(`^${MARKER}\n?`), '');
  // A profile page names its diver in plain text; that diver gets the fake for the page's own number.
  const own = body.match(/DiveMeets #: <\/strong>(\d+)/i);
  if (own) body = body.replace(PROFILE_NAME, (_, label) => `${label}Diver ${fake('Diver', own[1])}`);
  // A judges' scores page names its diver in plain text ("Diver: Last, First - Team") and links
  // that diver's sheet by number, so the name gets the fake for that number.
  const sheet = body.match(/dvrnum=(\d+)/i);
  body = body.replace(PLAIN_DIVER, (_, label, name, team) =>
    `${label}Diver ${fake('Diver', sheet ? sheet[1] : `name:${name}`)}${team}`);
  return `${MARKER}\n${body
    .replace(PERSON_LINK, (_, open, letter, number, close) => {
      const kind = KINDS[letter.toLowerCase()];
      const n = fake(kind, number);
      // The real number also sits in the popup call inside the same tag.
      return `${open.replace(new RegExp(`\\b${number}\\b`, 'g'), String(n))}${kind} ${n}${close}`;
    })
    .replace(DIVER_NUMBER, (_, prefix, number) => `${prefix}${fake('Diver', number)}`)
    .replace(HOME_TOWN, (_, label) => `${label}Hometown`)
    .replace(CF_VISIT, "$1$2'")
    .replace(EMAIL, '[email removed]')
    .replace(PHONE, '[phone removed]')}`;
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
