import { PageChangedError } from '../common';
import { parseLiveBoard } from '../live-board';
import { fixture } from './fixtures';

describe('parseLiveBoard', () => {
  it('reads a board in progress: round, next diver and who is still to dive', () => {
    const b = parseLiveBoard(fixture('live/in-progress.html'));
    expect(b.eventName).toBe('Women 3m Championship (6 Dives)');
    expect(b.stage).toBe('Final');
    expect(b.round).toEqual({ current: 6, total: 6 });
    expect(b.closed).toBe(false);
    expect(b.next).toEqual({ diverNumber: 2, name: 'Diver 2', order: 7 });
    expect(b.rows).toHaveLength(17);
    expect(b.rows.find((r) => r.diverNumber === 5)).toEqual({
      diverNumber: 5,
      name: 'Diver 5',
      order: 8,
      toDive: true,
      place: 3,
      total: 258.2,
    });
    expect(b.rows.find((r) => r.diverNumber === 3)?.toDive).toBe(false);
  });

  it('puts a space before the team in the next diver box, as the rows have it', () => {
    const html = fixture('live/in-progress.html').replace('profpopup(this,2)">Diver 2', 'profpopup(this,2)">Diver 2(TEAM)');
    expect(parseLiveBoard(html).next?.name).toBe('Diver 2 (TEAM)');
  });

  it('reads a closed board: places and scores, nobody left to dive', () => {
    const b = parseLiveBoard(fixture('live/finished.html'));
    expect(b.eventName).toBe('Women Platform (5 Dives)');
    expect(b.stage).toBe('Prelim / Quarterfinal');
    expect(b.closed).toBe(true);
    expect(b.next).toBeUndefined();
    expect(b.rows).toHaveLength(27);
    expect(b.rows[0]).toEqual({ diverNumber: 1, name: 'Diver 1', toDive: false, place: 1, total: 298.95 });
  });

  it('throws PageChangedError on a page that is not a live board', () => {
    const run = () => parseLiveBoard('<html><body>nothing</body></html>');
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'live-board' }));
  });
});
