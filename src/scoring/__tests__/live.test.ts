import { readFileSync } from 'fs';
import { join } from 'path';
import { parseLiveBoard } from '../../divemeets/parsers';
import { alertsDue, diversBefore } from '../live';

const board = parseLiveBoard(
  readFileSync(join(__dirname, '..', '..', '..', 'fixtures', 'divemeets', 'live', 'in-progress.html'), 'utf8'),
);
const finished = parseLiveBoard(
  readFileSync(join(__dirname, '..', '..', '..', 'fixtures', 'divemeets', 'live', 'finished.html'), 'utf8'),
);
const event = 'Women 3m Championship (6 Dives)';

describe('diversBefore', () => {
  it('counts the divers still to dive from the next diver up to mine', () => {
    expect(diversBefore(board, 5)).toBe(1); // order 8; only order 7 goes first
    expect(diversBefore(board, 2)).toBe(0); // the next diver
    expect(diversBefore(board, 6)).toBe(6); // order 13: 7, 8, 9, 10, 11, 12
  });

  it('skips the diver who just dived though the board still stars them', () => {
    // Diver 1 (order 6) just dived and still has a star; it must not count for diver 5.
    expect(board.rows.find((r) => r.diverNumber === 1)?.toDive).toBe(true);
    expect(diversBefore(board, 5)).toBe(1);
  });

  it('says dived for a diver with no star, and nothing for one not on the board', () => {
    expect(diversBefore(board, 3)).toBe('dived');
    expect(diversBefore(board, 999)).toBeUndefined();
  });

  it('gives nothing when the board has no next diver', () => {
    expect(diversBefore({ ...board, next: undefined }, 5)).toBeUndefined();
  });
});

describe('alertsDue', () => {
  const diver5 = [{ diverNumber: 5, name: 'Diver 5' }];

  it('sends one "dives soon" alert when N or fewer divers are before them', () => {
    expect(alertsDue([], board, diver5, 3)).toEqual({
      alerts: [{ diverNumber: 5, kind: 'soon', title: 'Diver 5 dives soon', text: `1 diver before them · ${event}` }],
      sent: ['5:6:soon'],
    });
  });

  it('does not repeat an alert when the same board is read again', () => {
    const { sent } = alertsDue([], board, diver5, 3);
    expect(alertsDue(sent, board, diver5, 3)).toEqual({ alerts: [], sent });
  });

  it('sends only "up next" when both are due in one read', () => {
    expect(alertsDue([], board, [{ diverNumber: 2, name: 'Diver 2' }], 3)).toEqual({
      alerts: [{ diverNumber: 2, kind: 'next', title: 'Diver 2 is up next', text: event }],
      sent: ['2:6:soon', '2:6:next'],
    });
  });

  it('waits while more than N divers are before them', () => {
    expect(alertsDue([], board, [{ diverNumber: 6, name: 'Diver 6' }], 3).alerts).toEqual([]);
  });

  it('says "divers" for more than one', () => {
    expect(alertsDue([], board, [{ diverNumber: 6, name: 'Diver 6' }], 6).alerts[0].text).toBe(
      `6 divers before them · ${event}`,
    );
  });

  it('sends nothing for a closed board or a diver not on it', () => {
    expect(alertsDue([], finished, [{ diverNumber: 1, name: 'Diver 1' }], 3).alerts).toEqual([]);
    expect(alertsDue([], board, [{ diverNumber: 999, name: 'Someone' }], 3).alerts).toEqual([]);
  });
});
