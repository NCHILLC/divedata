import { diveScore, keptAwards, runningTotals } from '../dive';

const sorted = (a: number[] | undefined) => [...(a ?? [])].sort((x, y) => x - y);

test('5 judges drop highest and lowest', () => {
  expect(sorted(keptAwards([7.5, 7.0, 7.5, 8.0, 7.0]))).toEqual([7.0, 7.5, 7.5]);
  expect(diveScore([7.5, 7.0, 7.5, 8.0, 7.0], 2.9)).toBe(63.8);
});

test('3 judges keep all', () => expect(diveScore([6.5, 7.0, 6.0], 1.9)).toBe(37.05));

test('7 judges drop two of each', () =>
  expect(diveScore([8.0, 8.5, 7.5, 9.0, 8.0, 7.0, 8.5], 3.2)).toBe(78.4));

test('other panel sizes give undefined', () => {
  expect(keptAwards([7, 7, 7, 7, 7, 7, 7, 7, 7])).toBeUndefined();
  expect(diveScore([7, 7], 2.0)).toBeUndefined();
});

test('no floating-point drift', () => expect(diveScore([7.0, 7.0, 7.0], 2.3)).toBe(48.3));

test('keptAwards does not change its input', () => {
  const awards = [8.0, 7.0, 7.5, 6.5, 9.0];
  keptAwards(awards);
  expect(awards).toEqual([8.0, 7.0, 7.5, 6.5, 9.0]);
});

test('running totals', () =>
  expect(runningTotals([63.8, 37.05, 48.3])).toEqual([63.8, 100.85, 149.15]));
