import type { HTMLElement } from 'node-html-parser';
import { checked, cleanText, load, numberFromHref, PageChangedError } from './common';
import { type MeetResults, MeetResultsSchema } from './types';

/** Meet results page: "Meet: <name>", then one row per finished event: results link, entries, date. */
export function parseMeetResults(html: string): MeetResults {
  const root = load(html);
  const link = root.querySelector('a[href*="meetresultsext.php?meetnum="]');
  const name = cleanText(
    root
      .querySelectorAll('td')
      .find((td) => /^Meet:/.test(cleanText(td)) && !td.querySelector('td'))
      ?.querySelector('strong'),
  );
  if (!link || !name) throw new PageChangedError('meet-results', 'meet number or name not found');

  // The "All Event Results" link uses eventnum=all, so only numeric event numbers count.
  const events = root.querySelectorAll('a[href*="eventresultsext.php?"]').flatMap((a) => {
    const href = a.getAttribute('href') ?? '';
    const eventNumber = /eventnum=(\d+)/.exec(href)?.[1];
    if (!eventNumber) return [];
    // The stage sits in the text right after the link: " (Final)".
    const stage = cleanText(a.nextSibling as HTMLElement | null).replace(/^\(|\)$/g, '').trim();
    const date = cleanText(a.parentNode?.nextElementSibling?.nextElementSibling);
    return [
      {
        eventNumber: Number(eventNumber),
        eventType: numberFromHref(href, 'eventtype'),
        name: cleanText(a),
        ...(stage ? { stage } : {}),
        ...(/^\d{4}-\d{2}-\d{2}$/.test(date) ? { date } : {}),
        resultsPath: href,
      },
    ];
  });

  return checked('meet-results', MeetResultsSchema, {
    meetNumber: numberFromHref(link.getAttribute('href'), 'meetnum'),
    name,
    events,
  });
}
