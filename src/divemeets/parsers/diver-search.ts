import { checked, cleanText, load, numberFromHref, PageChangedError } from './common';
import { type DiverRef, DiverRefSchema } from './types';
import { z } from 'zod';

/**
 * Diver search results: a "N Record(s) Found" cell, then one `div.showresults` per match holding a
 * `profile.php?number=` link. Only those result cells count (the page's menus are ignored). The count must equal the
 * rows read, so a changed layout cannot drop divers quietly. "0 Record(s) Found" with no rows is a valid, empty result.
 */
export function parseDiverSearch(html: string): DiverRef[] {
  const root = load(html);
  const cells = root.querySelectorAll('div.showresults');
  const found = cells.map((c) => /^([\d,]+) Record\(s\) Found$/.exec(cleanText(c))).find(Boolean);
  if (!found) throw new PageChangedError('diver-search', 'record count not found');

  const rows = cells.flatMap((c) => {
    const link = c.querySelector('a[href*="profile.php?number="]');
    return link ? [{ diverNumber: numberFromHref(link.getAttribute('href'), 'number'), name: cleanText(link) }] : [];
  });
  const expected = Number(found[1].replace(/,/g, ''));
  if (rows.length !== expected) throw new PageChangedError('diver-search', `page says ${expected} records, found ${rows.length}`);
  return checked('diver-search', z.array(DiverRefSchema), rows);
}
