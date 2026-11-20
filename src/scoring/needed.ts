export type Needed =
  | { kind: 'already-above' }
  | { kind: 'needs'; average: number }
  | { kind: 'out-of-reach' };

// Lowest average award (in half points) that puts the total strictly above the target.
export function averageAwardNeeded(input: {
  total: number;
  remainingDDs: number[];
  target: number;
}): Needed {
  const total = Math.round(input.total * 100);
  const target = Math.round(input.target * 100);
  if (total > target) return { kind: 'already-above' };

  const ddTenths = input.remainingDDs.reduce((sum, dd) => sum + Math.round(dd * 10), 0);
  // Three kept awards per dive: average/2 halves x 3 x tenths/10 x 100 = halves * 15 * tenths.
  for (let halves = 0; halves <= 20; halves++) {
    if (total + halves * 15 * ddTenths > target) {
      return { kind: 'needs', average: halves / 2 };
    }
  }
  return { kind: 'out-of-reach' };
}
