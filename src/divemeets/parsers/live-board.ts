import type { HTMLElement } from 'node-html-parser';
import { checked, cleanText, load, numberFromHref, PageChangedError, parsePlace, toNumber } from './common';
import { type LiveBoard, LiveBoardSchema } from './types';

/** "Women 3m Championship (6 Dives) (Final)" → the name and the stage in the last brackets. */
export function splitStage(text: string): { name: string; stage?: string } {
  const m = /^(.*\S)\s*\(([^()]+)\)$/.exec(text);
  return m && !/\bdives?$/i.test(m[2]) ?{ name: m[1], stage: m[2].trim() } : { name: text };
}

/** Header text without spaces: "Divers<br>Left to<br>Dive" reads "DiversLefttoDive". */
const key = (td: HTMLElement) => cleanText(td).replace(/\s/g, '');

/**
 * The live board (`livestats.php?event=`): the event name, the round, the Next Diver box and one row per diver.
 * In progress, a `*` in the first cell marks a diver still to dive this round; closed, the rows are the final places.
 */
export function parseLiveBoard(html: string): LiveBoard {
  const root = load(html);
  const title = root.querySelectorAll('strong').find((s) => /^Unofficial Statistics/.test(cleanText(s)));
  const header = root.querySelectorAll('tr').find((tr) => tr.querySelectorAll(':scope > td.titlebar').some((td) => key(td) === 'DiverName'));
  if (!title || !header) throw new PageChangedError('live-board', 'title or table header not found');

  const lines = title.childNodes.map((n) => n.text.replace(/\s+/g, ' ').trim()).filter(Boolean);
  const { name: eventName, stage } = splitStage(lines.at(-1) ?? '');
  const text = cleanText(root);
  const round = /Current Round:\s*(\d+)\s*\/\s*(\d+)/.exec(text);

  const nextBox = root.querySelectorAll('td').find((td) => /^Next Diver:/.test(cleanText(td)) && !td.querySelector('td'));
  const nextLink = nextBox?.querySelector('a[href*="profile.php?number="]');
  const next =
    nextBox && nextLink
      ? {
          diverNumber: numberFromHref(nextLink.getAttribute('href'), 'number'),
          // The box writes "Name(TEAM)"; the rows write "Name (TEAM)".
          name: cleanText(nextLink).replace(/(\S)\(/, '$1 ('),
          order: toNumber(/Diver Order:\s*(\d+)/.exec(cleanText(nextBox))?.[1] ?? ''),
        }
      : undefined;

  const columns = header.querySelectorAll(':scope > td').map(key);
  const col = (...names: string[]) => columns.findIndex((c) => names.includes(c));
  const at = { toDive: col('DiversLefttoDive'), order: col('DiverOrder'), place: col('CurrentPlace', 'Place'), total: col('CurrentScore', 'Score'), name: col('DiverName') };

  const rows: unknown[] = [];
  for (let tr = header.nextElementSibling; tr; tr = tr.nextElementSibling) {
    const cells = tr.querySelectorAll(':scope > td');
    const link = cells[at.name]?.querySelector('a[href*="profile.php?number="]');
    if (cells.length !== columns.length || !link) continue;
    const cell = (i: number) => (i < 0 ? '' : cleanText(cells[i]));
    const place = parsePlace(cell(at.place)).place;
    const total = cell(at.total);
    rows.push({
      diverNumber: numberFromHref(link.getAttribute('href'), 'number'),
      name: cleanText(link),
      ...(at.order >= 0 ? { order: toNumber(cell(at.order)) } : {}),
      toDive: cell(at.toDive) === '*',
      ...(place !== undefined ? { place } : {}),
      ...(total ? { total: toNumber(total) } : {}),
    });
  }

  return checked('live-board', LiveBoardSchema, {
    eventName,
    ...(stage ? { stage } : {}),
    ...(round ? { round: { current: Number(round[1]), total: Number(round[2]) } } : {}),
    closed: /This event is now closed/i.test(text),
    ...(next ? { next } : {}),
    rows,
  });
}
