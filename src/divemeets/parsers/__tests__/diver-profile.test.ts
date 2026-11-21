import { PageChangedError } from '../common';
import { parseDiverProfile } from '../diver-profile';
import { fixture } from './fixtures';

const page = () => fixture('diver-profile/adult.html');

describe('parseDiverProfile', () => {
  it('reads the diver and the results history', () => {
    const p = parseDiverProfile(page());
    expect(p.diver).toEqual({ diverNumber: 1, name: 'Diver 1' });
    expect(p.meets).toHaveLength(58);
    expect(p.meets.reduce((n, m) => n + m.events.length, 0)).toBe(182);
    expect(p.meets[0]).toEqual({
      meetNumber: 13353,
      name: 'University of Texas Diving Invitational',
      events: [
        {
          name: 'Women 1m Championship (5 Dives) - (Prelim/Quarterfinal)',
          place: 1,
          total: 231.75,
          diveSheetPath: 'divesheetresultsext.php?meetnum=13353&eventnum=7143&dvrnum=1&eventtype=1&sts=1794363265',
        },
        expect.objectContaining({ name: 'Women 1m Championship (5 Dives) - (Final)', place: 1, total: 262.55 }),
        expect.objectContaining({ place: 1, total: 278.15 }),
        expect.objectContaining({ place: 1, total: 295.5 }),
      ],
    });
    expect(p.meets[1].meetNumber).toBe(12925);
    expect(p.meets[1].events[2]).toMatchObject({ place: 5, total: 543.45 });
  });

  it('leaves out the upcoming meets, which have no results yet', () => {
    const p = parseDiverProfile(page());
    expect(p.meets.some((m) => m.meetNumber === 13208)).toBe(false);
  });

  it('reads an exhibition entry as scored but unplaced', () => {
    const e = parseDiverProfile(page())
      .meets.flatMap((m) => m.events)
      .find((ev) => ev.name.includes('EXHIBITION'));
    expect(e).toMatchObject({ total: 247.73 });
    expect(e?.place).toBeUndefined();
  });

  it('never reads personal details', () => {
    const json = JSON.stringify(parseDiverProfile(page()));
    for (const word of ['Hometown', 'Longhorn', 'Coach', 'United States']) expect(json).not.toContain(word);
  });

  it('keeps entity text in a meet name', () => {
    const html = page().replace('University of Texas Diving Invitational', 'Zo&euml; &amp; Co&nbsp;Open');
    expect(parseDiverProfile(html).meets[0].name).toBe('Zoë & Co Open');
  });

  it('reads a blank place and score as unfinished', () => {
    const html = page().replace(
      /<td align="right">1&nbsp;<\/td><td align="right"><a href="(divesheetresultsext\.php\?meetnum=13353&amp;eventnum=7143&amp;dvrnum=1&amp;eventtype=1[^"]*)"[^>]*>231\.75<\/a>/,
      '<td align="right">&nbsp;</td><td align="right"><a href="$1">&nbsp;</a>',
    );
    const e = parseDiverProfile(html).meets[0].events[0];
    expect(e.place).toBeUndefined();
    expect(e.total).toBeUndefined();
    expect(e.diveSheetPath).toContain('divesheetresultsext.php?meetnum=13353');
  });

  it('throws PageChangedError on a garbage place', () => {
    const html = page().replace('<td align="right">18&nbsp;</td>', '<td align="right">abc&nbsp;</td>');
    expect(() => parseDiverProfile(html)).toThrow(expect.objectContaining({ page: 'diver-profile', name: 'PageChangedError' }));
  });

  it('throws PageChangedError on a garbage score', () => {
    const html = page().replace('>231.75<', '>abc<');
    expect(() => parseDiverProfile(html)).toThrow(expect.objectContaining({ page: 'diver-profile', name: 'PageChangedError' }));
  });

  it('throws PageChangedError when a meet mixes meet numbers', () => {
    const html = page().replace('meetnum=13353&amp;eventnum=7143&amp;dvrnum=1&amp;eventtype=9', 'meetnum=99999&amp;eventnum=7143&amp;dvrnum=1&amp;eventtype=9');
    expect(() => parseDiverProfile(html)).toThrow(PageChangedError);
  });

  it('throws PageChangedError when the diver number is missing', () => {
    const html = page().replace('DiveMeets #: ', 'Member: ');
    expect(() => parseDiverProfile(html)).toThrow(PageChangedError);
  });

  it('throws PageChangedError when the history table is missing', () => {
    const html = page().replace('History</strong>', 'Nothing</strong>');
    expect(() => parseDiverProfile(html)).toThrow(PageChangedError);
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseDiverProfile(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'diver-profile' }));
  });
});
