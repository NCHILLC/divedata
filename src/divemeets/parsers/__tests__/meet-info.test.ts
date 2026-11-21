import { PageChangedError } from '../common';
import { parseMeetInfo } from '../meet-info';
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
      name: 'Prelim/Quarterfinal Women 1m Championship (6 Dives)',
      date: '2026-11-18',
    });
    expect(meet.events[2].name).toBe('Women 1m Champ.(6 Dives) CONSOL.');
    expect(meet.events[9]).toEqual({ eventNumber: 7175, eventType: 9, name: 'Final Women Platform (5 Dives)', date: '2026-11-20' });
  });

  it('leaves resultsPath out when the page does not link results', () => {
    expect(meet.events.every((e) => e.resultsPath === undefined)).toBe(true);
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseMeetInfo(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'meet-info' }));
  });
});
