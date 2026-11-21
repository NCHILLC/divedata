import type { HTMLElement } from 'node-html-parser';
import { checked, cleanText, load, numberFromHref, PageChangedError } from './common';
import { type Meet, MeetSchema } from './types';

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** "Tuesday, Nov 17, 2026" becomes "2026-11-17". */
function parseLongDay(text: string): string | undefined {
  const m = /^(?:[A-Za-z]+, )?([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})$/.exec(text);
  const month = m ? MONTHS.indexOf(m[1].toLowerCase()) + 1 : 0;
  return m && month ? `${m[3]}-${String(month).padStart(2, '0')}-${m[2].padStart(2, '0')}` : undefined;
}

/** The bold value beside a label such as "Name:" in the meet details table. */
function field(root: HTMLElement, label: string): HTMLElement | undefined {
  const cell = root.querySelectorAll('td').find((td) => cleanText(td) === label);
  return cell?.nextElementSibling?.querySelector('strong') ?? undefined;
}

/** "Houston, TX" among the pool address lines. */
function cityState(pool: HTMLElement | undefined): { city?: string; state?: string } {
  const lines = (pool?.innerHTML ?? '').split(/<br\s*\/?>/i).map((l) => cleanText(load(l)));
  for (const line of lines) {
    const m = /^(.+),\s*([A-Za-z]{2})$/.exec(line);
    if (m) return { city: m[1].trim(), state: m[2].toUpperCase() };
  }
  return {};
}

/** Meet information page: a details table (Name:, Start Date:, Pool: ...), then the schedule, a date row then one row per event. */
export function parseMeetInfo(html: string): Meet {
  const root = load(html);
  const link = root.querySelector('a[href*="meetinfoext.php?meetnum="]');
  const name = cleanText(field(root, 'Name:'));
  if (!link || !name) throw new PageChangedError('meet-info', 'meet number or name not found');

  const events: unknown[] = [];
  let date: string | undefined;
  for (const td of root.querySelectorAll('td')) {
    if (td.querySelector('table')) continue;
    const day = parseLongDay(cleanText(td.querySelector('strong')));
    if (day && cleanText(td) === cleanText(td.querySelector('strong'))) date = day;
    // Every event row has a qualification-rule link; the entries link is missing until someone signs up.
    const rule = td.querySelector('a[href*="qualrule.php?"]');
    if (rule) {
      const href = rule.getAttribute('href') ?? '';
      events.push({
        eventNumber: numberFromHref(href, 'event'),
        eventType: numberFromHref(href, 'eventtype'),
        name: cleanText(td.childNodes[0] as HTMLElement),
        ...(date ? { date } : {}),
      });
    }
  }

  const pool = field(root, 'Pool:');
  return checked('meet-info', MeetSchema, {
    meetNumber: numberFromHref(link.getAttribute('href'), 'meetnum'),
    name,
    startDate: cleanText(field(root, 'Start Date:')),
    endDate: cleanText(field(root, 'End date:')),
    ...cityState(pool),
    events,
  });
}
