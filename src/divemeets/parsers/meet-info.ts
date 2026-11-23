import type { HTMLElement } from 'node-html-parser';
import { checked, cleanText, load, numberFromHref, PageChangedError, parseDay } from './common';
import { type Meet, MeetSchema } from './types';

/** "Prelim/Quarterfinal Women 1m ..." becomes the name without the stage and the stage; names with no stage prefix pass through. */
function splitStage(text: string): { name: string; stage?: string } {
  const m = /^(Prelim\/Quarterfinal|Prelim|Quarterfinal|Semifinal|Final)\s+(.+)$/i.exec(text);
  return m ? { name: m[2], stage: m[1] } : { name: text };
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
    const day = parseDay(cleanText(td.querySelector('strong')));
    if (day && cleanText(td) === cleanText(td.querySelector('strong'))) date = day;
    // Every event row has a qualifying-rule link (`qualrule.php?meet=&event=&eventtype=`) or, on some meets, only a
    // rule-set link (`eventrule.php?ruleset=&event=`, no event type). The entries link is missing until someone signs up.
    const rule = td.querySelector('a[href*="qualrule.php?"]') ?? td.querySelector('a[href*="eventrule.php?"]');
    if (rule) {
      const href = rule.getAttribute('href') ?? '';
      events.push({
        eventNumber: numberFromHref(href, 'event'),
        ...(/[?&]eventtype=/.test(href) ? { eventType: numberFromHref(href, 'eventtype') } : {}),
        ...splitStage(cleanText(td.childNodes[0] as HTMLElement)),
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
