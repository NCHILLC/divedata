import { averageAwardNeeded } from '../needed';

test('already above the target', () =>
  expect(averageAwardNeeded({ total: 300, remainingDDs: [], target: 299.95 })).toEqual({
    kind: 'already-above',
  }));

test('needs a whole step above an exact tie', () =>
  expect(averageAwardNeeded({ total: 200, remainingDDs: [2.0, 2.0], target: 290 })).toEqual({
    kind: 'needs',
    average: 8,
  }));

test('exact boundary at 7.5', () =>
  expect(averageAwardNeeded({ total: 200, remainingDDs: [2.0, 2.0], target: 289.95 })).toEqual({
    kind: 'needs',
    average: 7.5,
  }));

test('out of reach even with all 10s', () =>
  expect(averageAwardNeeded({ total: 0, remainingDDs: [2.0], target: 61 })).toEqual({
    kind: 'out-of-reach',
  }));

test('a tie is not enough', () =>
  expect(averageAwardNeeded({ total: 100, remainingDDs: [], target: 100 })).toEqual({
    kind: 'out-of-reach',
  }));
