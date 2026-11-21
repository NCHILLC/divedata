import { PageChangedError } from '../common';
import { parseMeetResults } from '../meet-results';
import { fixture } from './fixtures';

describe('parseMeetResults', () => {
  it('reads a finished meet with its results links', () => {
    const r = parseMeetResults(fixture('meet-results/finished.html'));
    expect(r.meetNumber).toBe(13501);
    expect(r.name).toBe('2026 Phil Hansel Invitational @Houston');
    expect(r.events).toHaveLength(7);
    expect(r.events[0]).toEqual({
      eventNumber: 7345,
      eventType: 9,
      name: 'Women Team Event',
      stage: 'Final',
      date: '2026-11-17',
      resultsPath: 'eventresultsext.php?meetnum=13501&eventnum=7345&eventtype=9',
    });
  });

  it('keeps prelim and final of one event apart by stage, with the same name', () => {
    const r = parseMeetResults(fixture('meet-results/finished.html'));
    const [prelim, final] = r.events.filter((e) => e.eventNumber === 7140);
    expect(prelim.stage).toBe('Prelim/Quarterfinal');
    expect(final.stage).toBe('Final');
    expect(prelim.name).toBe('Women 1m Championship (6 Dives)');
    expect(final.name).toBe(prelim.name);
  });

  it('parses a meet in progress with no results yet', () => {
    const r = parseMeetResults(fixture('meet-results/in-progress.html'));
    expect(r).toEqual({ meetNumber: 13172, name: 'BUFF vs CORU vs ICB vs CAN', events: [] });
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseMeetResults(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'meet-results' }));
  });
});
