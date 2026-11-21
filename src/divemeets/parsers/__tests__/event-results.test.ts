import { PageChangedError } from '../common';
import { parseEventResults } from '../event-results';
import { fixture } from './fixtures';

describe('parseEventResults', () => {
  it('reads a five-judge final', () => {
    const r = parseEventResults(fixture('event-results/final.html'));
    expect(r.meetNumber).toBe(13501);
    expect(r.eventName).toBe('Women 3m Championship (6 Dives)');
    expect(r.stage).toBeUndefined();
    expect(r.rows).toHaveLength(8);
    expect(r.rows[0]).toEqual({
      place: 1,
      tied: false,
      diver: { diverNumber: 1, name: 'Diver 1' },
      team: 'AFA',
      total: 321.55,
      diveSheetPath: 'divesheetresultsext.php?meetnum=13501&eventnum=7160&dvrnum=1&eventtype=9&sts=1794531690',
    });
  });

  it('reads the stage of a prelim', () => {
    const r = parseEventResults(fixture('event-results/prelim.html'));
    expect(r.stage).toBe('Prelim/Quarterfinal');
    expect(r.rows).toHaveLength(28);
    expect(r.rows[0].diver.name).toBe('Diver 1');
    expect(r.rows[0].total).toBe(315.1);
  });

  it('reads a seven-judge event', () => {
    const r = parseEventResults(fixture('event-results/seven-judges.html'));
    expect(r.meetNumber).toBe(11547);
    expect(r.eventName).toBe('Senior Women 1m');
    expect(r.rows).toHaveLength(8);
    expect(r.rows[0]).toMatchObject({ place: 1, total: 534.85, team: 'U' });
  });

  it('keeps entity and non-breaking-space text and reads a tied place', () => {
    const html = fixture('event-results/final.html')
      .replace('>Diver 1</a>', '>Zo&euml;&nbsp;O&#39;Brien &amp; Co</a>')
      .replace(/(<td valign="top">)1(<\/td><td valign="top"><a href="divesheetresultsext)/, '$13T$2')
      .replace(/(<td valign="top">)2(<\/td><td valign="top"><a href="divesheetresultsext)/, '$1T-3$2');
    const r = parseEventResults(html);
    expect(r.rows[0]).toMatchObject({ place: 3, tied: true, diver: { diverNumber: 1, name: "Zoë O'Brien & Co" } });
    expect(r.rows[1]).toMatchObject({ place: 3, tied: true });
    expect(r.rows[2]).toMatchObject({ place: 3, tied: false });
  });

  it('parses a results table with no rows', () => {
    const html = fixture('event-results/final.html').replace(/<tr><td valign="top"><a href="profile\.php.*?<\/tr>/g, '');
    expect(parseEventResults(html).rows).toEqual([]);
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseEventResults(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'event-results' }));
  });
});
