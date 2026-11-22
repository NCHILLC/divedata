import { parse } from 'node-html-parser';
import { parseDiverProfile } from '../../src/divemeets/parsers/diver-profile';
import { parseLiveBoard } from '../../src/divemeets/parsers/live-board';
import { boardHtml, DIVERS, profileHtml, ROUNDS } from '../pretend-meet.mjs';

test('the board starts at round 1 with the first diver up next and everyone still to dive', () => {
  const board = parseLiveBoard(boardHtml(0));
  expect(board.round).toEqual({ current: 1, total: ROUNDS });
  expect(board.closed).toBe(false);
  expect(board.next).toMatchObject({ order: 1, diverNumber: DIVERS[0].number });
  expect(board.rows).toHaveLength(DIVERS.length);
  expect(board.rows.every((r) => r.toDive)).toBe(true);
});

test('each step is one dive, and the round moves on once everyone has dived', () => {
  const board = parseLiveBoard(boardHtml(DIVERS.length + 2));
  expect(board.round?.current).toBe(2);
  expect(board.next?.order).toBe(3);
  expect(board.rows.filter((r) => r.toDive)).toHaveLength(DIVERS.length - 2);
});

test('after the last dive the event is closed with final places', () => {
  const board = parseLiveBoard(boardHtml(DIVERS.length * ROUNDS));
  expect(board.closed).toBe(true);
  expect(board.next).toBeUndefined();
  expect(board.rows.map((r) => r.place).sort()).toEqual(DIVERS.map((_, i) => i + 1));
});

test("a pretend diver's page carries their own number and name, so Follow follows them", () => {
  const { diver } = parseDiverProfile(profileHtml(DIVERS[2].number));
  expect(diver).toEqual({ diverNumber: DIVERS[2].number, name: 'Pretend Diver C' });
});

test('the board sits in the element the readers wait for', () => {
  expect(parse(boardHtml(0)).querySelector('#Results table')).not.toBeNull();
});
