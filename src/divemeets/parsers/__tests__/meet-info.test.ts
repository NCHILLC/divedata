import { PageChangedError } from '../common';
import { parseMeetInfo } from '../meet-info';
import { parseMeetResults } from '../meet-results';
import { fixture } from './fixtures';

describe('parseMeetInfo', () => {
  const meet = parseMeetInfo(fixture('meet-info/finished.html'));

  it('reads the meet', () => {
    expect(meet).toMatchObject({
      meetNumber: 13501,
      name: '2026 Phil Hansel Invitational @Houston',
      startDate: '2026-11-17',
      endDate: '2026-11-20',
      city: 'Houston',
      state: 'TX',
    });
  });

  it('reads the events with their dates', () => {
    expect(meet.events).toHaveLength(10);
    expect(meet.events[0]).toEqual({ eventNumber: 7345, eventType: 9, name: 'Women Team Event', date: '2026-11-17' });
    expect(meet.events[1]).toEqual({
      eventNumber: 7140,
      eventType: 1,
      name: 'Women 1m Championship (6 Dives)',
      stage: 'Prelim/Quarterfinal',
      date: '2026-11-18',
    });
    expect(meet.events[2].name).toBe('Women 1m Champ.(6 Dives) CONSOL.');
    expect(meet.events[9]).toEqual({ eventNumber: 7175, eventType: 9, name: 'Women Platform (5 Dives)', stage: 'Final', date: '2026-11-20' });
  });

  it('gives the same name for prelim and final as the meet results page', () => {
    const results = parseMeetResults(fixture('meet-results/finished.html'));
    const names = new Set(results.events.map((e) => e.name));
    expect(meet.events.filter((e) => e.eventNumber === 7140).map((e) => e.name)).toEqual([
      'Women 1m Championship (6 Dives)',
      'Women 1m Championship (6 Dives)',
    ]);
    expect(names.has('Women 1m Championship (6 Dives)')).toBe(true);
  });

  it('leaves resultsPath out when the page does not link results', () => {
    expect(meet.events.every((e) => e.resultsPath === undefined)).toBe(true);
  });

  it('reads a schedule whose events link a rule set, which has no event type', () => {
    // UChicago's NCAA meet links eventrule.php?ruleset=1&event=7315 where others link qualrule.php.
    const twoDays = parseMeetInfo(fixture('meet-info/two-days.html'));
    expect(twoDays.events).toEqual([
      { eventNumber: 7315, name: 'Women 1m Championship (11Div Vol 1st.)', date: '2026-11-21' },
      { eventNumber: 7330, name: 'Men 3m Championship (11Div Vol 1st.)', date: '2026-11-21' },
      { eventNumber: 7320, name: 'Women 3m Championship (11Div Vol 1st.)', date: '2026-11-22' },
      { eventNumber: 7325, name: 'Men 1m Championship (11Div Vol 1st.)', date: '2026-11-22' },
    ]);
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseMeetInfo(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'meet-info' }));
  });
});
