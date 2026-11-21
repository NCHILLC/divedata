import type { HTMLElement } from 'node-html-parser';
import { z } from 'zod';
import { checked, cleanText, load, numberFromHref, PageChangedError } from './common';
import { type MeetSummary, MeetSummarySchema } from './types';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function iso(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function monthNumber(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

/** "Nov 17 - Nov 20, 2026" (the year is the end date's; Dec 30 - Jan 2 starts a year earlier). */
function parseRange(text: string): { start: string; end: string } | undefined {
  const m = /^([A-Za-z]{3})[a-z]* (\d{1,2}) - ([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})$/.exec(text);
  if (!m) return undefined;
  const [startMonth, endMonth, endYear] = [monthNumber(m[1]), monthNumber(m[3]), Number(m[5])];
  if (!startMonth || !endMonth) return undefined;
  const startYear = startMonth > endMonth ? endYear - 1 : endYear;
  return { start: iso(startYear, startMonth, Number(m[2])), end: iso(endYear, endMonth, Number(m[4])) };
}

/** "Dec 13, 2025" */
function parseDay(text: string): string | undefined {
  const m = /^([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})$/.exec(text);
  const month = m && monthNumber(m[1]);
  return m && month ? iso(Number(m[3]), month, Number(m[2])) : undefined;
}

function meetNumber(a: HTMLElement | null): number {
  return numberFromHref(a?.getAttribute('href'), 'meetnum');
}

/** Splits "Houston, TX" into city and state; the state is upper-cased ("Ma" becomes "MA"). */
function place(text: string): { city?: string; state?: string } {
  const m = /^(.+),\s*([A-Za-z]{2})$/.exec(text);
  return m ? { city: m[1].trim(), state: m[2].toUpperCase() } : text ? { city: text } : {};
}

/** Home page: one small table per meet, with an info link, optional Results link, "City, ST" and a date range. */
function fromHomePage(root: HTMLElement): unknown[] {
  return root.querySelectorAll('a[href*="meetinfoext.php?meetnum="]').map((link) => {
    let card: HTMLElement | null = link;
    while (card && card.tagName !== 'TABLE') card = card.parentNode;
    const cells = card?.querySelectorAll('tr').at(-1)?.querySelectorAll('td') ?? [];
    const dates = parseRange(cleanText(cells.at(-1)));
    return {
      meetNumber: meetNumber(link),
      name: cleanText(link),
      startDate: dates?.start,
      endDate: dates?.end,
      ...(cells.length === 2 ? place(cleanText(cells[0])) : {}),
    };
  });
}

/** Past meets page: one 7-cell row per meet: logo, name and Results link, start, end, city, state, country. */
function fromPastPage(root: HTMLElement): unknown[] {
  const rows = root
    .querySelectorAll('tr')
    .filter((tr) => tr.querySelectorAll('td').length === 7 && tr.querySelector('a[href*="meetresultsext.php?meetnum="]'));
  return rows.map((tr) => {
    const cells = tr.querySelectorAll('td');
    return {
      meetNumber: meetNumber(tr.querySelector('a[href*="meetresultsext.php?meetnum="]')),
      name: cleanText(cells[1].querySelector('div')),
      startDate: parseDay(cleanText(cells[2])),
      endDate: parseDay(cleanText(cells[3])),
      ...place([cleanText(cells[4]), cleanText(cells[5])].filter(Boolean).join(', ')),
    };
  });
}

/** Reads the meets on the DiveMeets home page or the past meets page. */
export function parseMeetList(html: string): MeetSummary[] {
  const root = load(html);
  const found = root.querySelector('a[href*="meetinfoext.php?meetnum="]') ? fromHomePage(root) : fromPastPage(root);
  if (found.length === 0) throw new PageChangedError('meet-list', 'no meets found');
  return checked('meet-list', z.array(MeetSummarySchema), found);
}
