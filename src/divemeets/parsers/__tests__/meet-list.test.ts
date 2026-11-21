import { PageChangedError } from '../common';
import { parseMeetList } from '../meet-list';
import { fixture } from './fixtures';

describe('parseMeetList', () => {
  it('reads the meets on the DiveMeets home page', () => {
    const meets = parseMeetList(fixture('meet-list/upcoming.html'));
    expect(meets).toHaveLength(111);
    expect(meets[0]).toEqual({
      meetNumber: 13501,
      name: '2026 Phil Hansel Invitational @Houston',
      startDate: '2026-11-17',
      endDate: '2026-11-20',
      city: 'Houston',
      state: 'TX',
    });
  });

  it('reads the past meets page', () => {
    const meets = parseMeetList(fixture('meet-list/past.html'));
    expect(meets).toHaveLength(48);
    expect(meets[0]).toEqual({
      meetNumber: 12275,
      name: '2025 EVDC Winter Classic',
      startDate: '2025-12-13',
      endDate: '2025-12-14',
      city: 'Mesa',
      state: 'AZ',
    });
  });

  it('reads a meet that crosses New Year', () => {
    const html = `<table width="100%"><tr><td colspan="2"><a href="meetinfoext.php?meetnum=1">Winter Meet</a></td></tr>
      <tr><td>Boston, Ma</td><td align="right">Dec 30 - Jan 2, 2027</td></tr></table>`;
    expect(parseMeetList(html)).toEqual([
      { meetNumber: 1, name: 'Winter Meet', startDate: '2026-12-30', endDate: '2027-01-02', city: 'Boston', state: 'MA' },
    ]);
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseMeetList(fixture('event-results/final.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'meet-list', name: 'PageChangedError' }));
  });
});
