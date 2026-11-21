import type { HTMLElement } from 'node-html-parser';
import { checked, cleanText, load, numberFromHref, PageChangedError, toNumber } from './common';
import { type DiveSheet, DiveSheetSchema } from './types';

/** Blank is no place yet; a number is the place; anything else is NaN, which the schema rejects. */
function place(text: string): number | undefined {
  return text ? toNumber(text) : undefined;
}

/** A dive row has 8 cells: Dive (round), Number, Height, Description, Net Score, DD, Score (linked), Round Place. */
function dive(cells: HTMLElement[]): unknown {
  const link = cells[6].querySelector('a[href*="judgesscoresext.php?"]');
  const height = cleanText(cells[2]);
  const description = cleanText(cells[3]);
  return {
    round: toNumber(cleanText(cells[0])),
    diveNumber: cleanText(cells[1]),
    ...(height ? { height } : {}),
    ...(description ? { description } : {}),
    net: toNumber(cleanText(cells[4])),
    dd: toNumber(cleanText(cells[5])),
    score: toNumber(cleanText(cells[6])),
    ...(cleanText(cells[7]) ? { roundPlace: place(cleanText(cells[7])) } : {}),
    ...(link ? { judgeScoresPath: link.getAttribute('href') } : {}),
  };
}

/**
 * Dive sheet page: title, diver link, a header row (Dive, Number, Height, Description, Net Score, DD, Score,
 * Round Place), one 8-cell row per dive, then a Totals row. A dive row whose net, DD and score are all blank is a
 * round not yet dived and is skipped; a half-blank row fails the schema. The sheet has no awards and no penalty column.
 */
export function parseDiveSheet(html: string): DiveSheet {
  const root = load(html);
  const title = root.querySelector('strong[style*="font-size:14px"]');
  const diver = root.querySelector('a[href*="profile.php?number="]');
  const rows = root.querySelectorAll('tr').map((tr) => tr.querySelectorAll('td'));
  const header = rows.find((c) => c.length === 8 && cleanText(c[0]) === 'Dive' && cleanText(c[6]) === 'Score');
  const totals = rows.find((c) => c.length > 0 && cleanText(c[0]) === 'Totals');
  if (!title || !diver || !header || !totals) throw new PageChangedError('dive-sheet', 'title, diver or table header not found');

  const dives = rows
    .filter((c) => c.length === 8 && c !== header)
    .filter((c) => [4, 5, 6].some((i) => cleanText(c[i]) !== ''))
    .map(dive);
  const total = cleanText(totals[totals.length - 2]);

  return checked('dive-sheet', DiveSheetSchema, {
    diver: { diverNumber: numberFromHref(diver.getAttribute('href'), 'number'), name: cleanText(diver) },
    eventName: cleanText(title),
    dives,
    ...(total ? { total: toNumber(total) } : {}),
  });
}
