import { PageChangedError } from '../common';
import { parseDiverSearch } from '../diver-search';
import { fixture } from './fixtures';

const page = () => fixture('diver-search/results.html');

describe('parseDiverSearch', () => {
  it('reads every result', () => {
    const r = parseDiverSearch(page());
    expect(r).toHaveLength(489);
    expect(r[0]).toEqual({ diverNumber: 1, name: 'Diver 1' });
    expect(r[488]).toEqual({ diverNumber: 489, name: 'Diver 489' });
  });

  it('returns an empty list for a search with no matches', () => {
    const html = page()
      .replace('489 Record(s) Found', '0 Record(s) Found')
      .replace(/<div class="showresults"><a href="profile\.php[\s\S]*?(?=<img src="images\/spacer)/, '</div>');
    expect(html).not.toContain('profile.php?number=');
    expect(parseDiverSearch(html)).toEqual([]);
  });

  it('ignores profile links outside the results', () => {
    const html = page().replace('<div id="dm_top_bar">', '<a href="profile.php?number=777">Menu Person</a><div id="dm_top_bar">');
    expect(parseDiverSearch(html)).toHaveLength(489);
  });

  it('throws PageChangedError when the count disagrees with the rows', () => {
    const html = page().replace('489 Record(s) Found', '490 Record(s) Found');
    expect(() => parseDiverSearch(html)).toThrow(expect.objectContaining({ page: 'diver-search', name: 'PageChangedError' }));
  });

  it('throws PageChangedError on a result with no number', () => {
    const html = page().replace('profile.php?number=5"', 'profile.php?number=x"');
    expect(() => parseDiverSearch(html)).toThrow(PageChangedError);
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseDiverSearch(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'diver-search' }));
  });
});
