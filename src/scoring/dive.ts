// Awards are halves of a point, so awards x2, DD x10 and points x100 stay whole numbers.

// How many awards are dropped from each end, by panel size.
const DROPPED_PER_END: Record<number, number> = { 3: 0, 5: 1, 7: 2 };

const isWhole = (x: number) => Math.abs(x - Math.round(x)) < 1e-9;

// The awards that count. Other panel sizes (synchro, 9 or 11 judges) and awards that are not half points give undefined.
export function keptAwards(awards: number[]): number[] | undefined {
  const drop = DROPPED_PER_END[awards.length];
  if (drop === undefined || !awards.every((a) => isWhole(a * 2))) return undefined;
  const sorted = [...awards].sort((a, b) => a - b);
  return sorted.slice(drop, sorted.length - drop);
}

// Dive score: kept awards added up, times the degree of difficulty.
export function diveScore(awards: number[], dd: number): number | undefined {
  const kept = keptAwards(awards);
  if (kept === undefined || !isWhole(dd * 10)) return undefined;
  const halves = kept.reduce((sum, a) => sum + Math.round(a * 2), 0);
  const tenths = Math.round(dd * 10);
  // halves/2 * tenths/10 * 100 = halves * tenths * 5
  return (halves * tenths * 5) / 100;
}

// Total after each dive.
export function runningTotals(scores: number[]): number[] {
  let sum = 0;
  return scores.map((s) => {
    sum += Math.round(s * 100);
    return sum / 100;
  });
}
