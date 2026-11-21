import type { HTMLElement } from 'node-html-parser';
import { checked, cleanText, load, numberFromHref, PageChangedError, parsePlace, toNumber } from './common';
import { type DiverProfile, DiverProfileSchema } from './types';

/** The text right after a bold label such as "Name:" in the profile header. */
function labelled(root: HTMLElement, label: string): string {
  const strong = root.querySelectorAll('strong').find((s) => cleanText(s) === label);
  return strong?.nextSibling ? cleanText(strong.nextSibling as HTMLElement) : '';
}

function event(tr: HTMLElement): { event: unknown; meetNumber?: number } {
  const cells = tr.querySelectorAll('td');
  const sheet = cells[2].querySelector('a[href*="divesheetresultsext.php?"]');
  const href = sheet?.getAttribute('href');
  const score = cleanText(cells[2]);
  const p = parsePlace(cleanText(cells[1]));
  return {
    meetNumber: href ? numberFromHref(href, 'meetnum') : undefined,
    event: {
      name: cleanText(cells[0]),
      ...(p.place !== undefined ? { place: p.place, tied: p.tied } : {}),
      ...(p.exhibition ? { exhibition: true } : {}),
      ...(score ? { total: toNumber(score) } : {}),
      ...(href ? { diveSheetPath: href } : {}),
    },
  };
}

/**
 * Diver profile page. The header gives "Name:" and "DiveMeets #:" (the rest of it, city, school, coach, age, is never read).
 * The "DIVEMEETS.COM History" table lists, per meet, a row with one bold cell (the meet name) and then one 3-cell row per
 * event: name and stage, place, score linking to the dive sheet. The meet number is read from those links. The
 * "Upcoming Meets" table above it has no results and is left out.
 */
export function parseDiverProfile(html: string): DiverProfile {
  const root = load(html);
  const heading = root.querySelectorAll('strong').find((s) => cleanText(s).endsWith('History'));
  const diverNumber = toNumber(labelled(root, 'DiveMeets #:'));
  const name = labelled(root, 'Name:');
  if (!heading || !name || Number.isNaN(diverNumber)) throw new PageChangedError('diver-profile', 'name, number or history not found');

  let table: HTMLElement | null = heading;
  while (table && table.tagName !== 'TABLE') table = table.parentNode;
  if (!table) throw new PageChangedError('diver-profile', 'history table not found');

  const meets: { meetNumber: number; name: string; events: unknown[] }[] = [];
  for (const tr of table.querySelectorAll('tr')) {
    const cells = tr.querySelectorAll('td');
    const meetName = cells.length === 1 ? tr.querySelector('strong') : null;
    if (meetName && cells[0].getAttribute('colspan') === '3' && cleanText(cells[0]) === cleanText(meetName) && meetName !== heading) {
      meets.push({ meetNumber: NaN, name: cleanText(meetName), events: [] });
    } else if (cells.length === 3 && meets.length > 0) {
      const current = meets[meets.length - 1];
      const e = event(tr);
      if (e.meetNumber !== undefined) {
        // Every event of a meet must point at the same meet.
        if (Number.isNaN(current.meetNumber)) current.meetNumber = e.meetNumber;
        else if (current.meetNumber !== e.meetNumber) throw new PageChangedError('diver-profile', `meet "${current.name}" links to two meets`);
      }
      current.events.push(e.event);
    }
  }

  return checked('diver-profile', DiverProfileSchema, { diver: { diverNumber, name }, meets });
}
