import type { HTMLElement } from 'node-html-parser';
import { checked, cleanText, load, numberFromHref, PageChangedError, toNumber } from './common';
import { type EventResults, EventResultsSchema } from './types';

/** "3", "3T" and "T-3" are all place 3; the T marks a tie. Blank (unfinished) is no place; anything else is NaN, which the schema rejects. */
function parsePlace(text: string): { place?: number; tied: boolean } {
  if (!text) return { tied: false };
  const m = /^(T-?)?(\d+)(T)?$/i.exec(text);
  return { place: m ? Number(m[2]) : NaN, tied: Boolean(m?.[1] || m?.[3]) };
}

function row(tr: HTMLElement): unknown {
  const cells = tr.querySelectorAll('td');
  const diver = cells[0].querySelector('a[href*="profile.php?number="]');
  const sheet = cells[3].querySelector('a[href*="divesheetresultsext.php?"]');
  const team = cleanText(cells[1]);
  const score = cleanText(cells[3]);
  return {
    ...parsePlace(cleanText(cells[2])),
    diver: {
      diverNumber: numberFromHref(diver?.getAttribute('href'), 'number'),
      name: cleanText(diver),
    },
    ...(team ? { team } : {}),
    ...(score ? { total: toNumber(score) } : {}),
    ...(sheet ? { diveSheetPath: sheet.getAttribute('href') } : {}),
  };
}

/**
 * Event results page: an event title row (bold name, then the stage in brackets if any), a header row
 * (Diver, Team, Place, Score, Diff), then one row per diver. A table with no diver rows is a valid, empty result.
 */
export function parseEventResults(html: string): EventResults {
  const root = load(html);
  const meetLink = root.querySelector('a[href*="meetresultsext.php?meetnum="]');
  const title = root.querySelector('strong[style*="font-size:14px"]');
  const header = root.querySelectorAll('tr').find((tr) => {
    const cells = tr.querySelectorAll('td').map((td) => cleanText(td));
    return cells.length === 5 && cells[0] === 'Diver' && cells[2] === 'Place' && cells[3] === 'Score';
  });
  if (!meetLink || !title || !header) throw new PageChangedError('event-results', 'title or results header not found');

  const stage = cleanText(title.parentNode).slice(cleanText(title).length).replace(/^\s*\(|\)\s*$/g, '').trim();
  const rows = root
    .querySelectorAll('tr')
    .filter((tr) => tr.querySelectorAll('td').length === 5 && tr.querySelector('a[href*="profile.php?number="]'))
    .map(row);

  return checked('event-results', EventResultsSchema, {
    meetNumber: numberFromHref(meetLink.getAttribute('href'), 'meetnum'),
    eventName: cleanText(title),
    ...(stage ? { stage } : {}),
    rows,
  });
}
