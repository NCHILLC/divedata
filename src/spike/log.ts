// Throwaway: milestone 2 background test. See docs/superpowers/specs/2026-11-20-background-test-design.md.
// The native module and the test screen write one JSON object per line; these helpers read it back.

export type ReadResult = 'page' | 'check' | 'error' | 'busy';

/** The browser's steps inside one read, in order. A read that stalls shows where. */
export type Step = 'reload' | 'loadStart' | 'loadEnd' | 'message' | 'error';
const STEPS: Step[] = ['reload', 'loadStart', 'loadEnd', 'message', 'error'];

export type LogEntry =
  | { kind: 'tick'; seq: number; nativeAt: number; screenOn?: boolean }
  | { kind: 'step'; seq: number; at: number; step: Step; detail?: string }
  | {
      kind: 'read';
      seq: number;
      startedAt: number;
      endedAt: number;
      result: ReadResult;
      fingerprint?: string;
    }
  | {
      kind: 'start';
      at: number;
      url: string;
      alertsOn: boolean;
      batteryOptimized: boolean;
      powerSave: boolean;
      /** How long the run was set for; older logs leave it out (30). */
      minutes?: number;
    }
  | { kind: 'stop'; at: number; reason: 'done' | 'stopped' | 'check' };

export type Summary = {
  planned: number;
  ticks: number;
  pages: number;
  checks: number;
  errors: number;
  busy: number;
  longestGapSeconds: number;
  maxJsDelaySeconds: number;
  pageChanges: number;
  /** How many reads reached each browser step. */
  steps: Record<Step, number>;
  lastError: string | null;
  /** Ticks with the screen on; null when the log does not record it. */
  screenOnTicks: number | null;
  stoppedEarlyAt: string | null;
  alertsOn: boolean;
  batteryOptimized: boolean;
  powerSave: boolean;
  pass: boolean;
  reasons: string[];
};

const KINDS = new Set(['tick', 'step', 'read', 'start', 'stop']);

export function parseLog(text: string): LogEntry[] {
  const entries: LogEntry[] = [];
  for (const line of text.split('\n')) {
    try {
      const value = JSON.parse(line);
      if (value && KINDS.has(value.kind)) entries.push(value as LogEntry);
    } catch {
      // A half-written last line or noise: skip it.
    }
  }
  return entries;
}

const CHECK_TEXT = ['verify you are human', 'checking your browser'];

export function classifyPage(page: { title: string; text: string }): 'page' | 'check' {
  if (page.title.trim().toLowerCase() === 'just a moment...') return 'check';
  const text = page.text.toLowerCase();
  return CHECK_TEXT.some((marker) => text.includes(marker)) ? 'check' : 'page';
}

/** djb2, as unsigned hex. Only used to see whether the page changed. */
export function fingerprint(text: string): string {
  let hash = 5381;
  for (let i = 0; i < text.length; i++) hash = ((hash << 5) + hash + text.charCodeAt(i)) | 0;
  return (hash >>> 0).toString(16);
}

const clock = (ms: number) => {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

export function summarize(
  entries: LogEntry[],
  plan?: { intervalSeconds: number; minutes: number },
): Summary {
  const start = entries.find((e) => e.kind === 'start');
  const minutes = plan?.minutes ?? start?.minutes ?? 30;
  const planned = Math.round((minutes * 60) / (plan?.intervalSeconds ?? 30));
  const stop = entries.find((e) => e.kind === 'stop');
  const ticks = entries.filter((e) => e.kind === 'tick');
  const reads = entries.filter((e) => e.kind === 'read');
  const count = (result: ReadResult) => reads.filter((r) => r.result === result).length;

  // Gaps between timer ticks show whether the phone kept time with the screen off.
  let longestGap = 0;
  let previous = start?.at ?? ticks[0]?.nativeAt ?? 0;
  for (const tick of ticks) {
    longestGap = Math.max(longestGap, tick.nativeAt - previous);
    previous = tick.nativeAt;
  }
  // How long the JavaScript side took to act on a tick; a frozen JavaScript thread shows up here.
  const tickAt = new Map(ticks.map((t) => [t.seq, t.nativeAt]));
  const maxJsDelay = reads.reduce((max, r) => {
    const at = tickAt.get(r.seq);
    return at === undefined ? max : Math.max(max, r.startedAt - at);
  }, 0);

  let pageChanges = 0;
  let lastPrint: string | undefined;
  for (const read of reads) {
    if (read.result !== 'page') continue;
    if (lastPrint !== undefined && read.fingerprint !== lastPrint) pageChanges++;
    lastPrint = read.fingerprint;
  }

  const stepLines = entries.filter((e) => e.kind === 'step');
  const steps = Object.fromEntries(
    STEPS.map((name) => [name, new Set(stepLines.filter((e) => e.step === name).map((e) => e.seq)).size]),
  ) as Record<Step, number>;
  const lastError = stepLines.filter((e) => e.step === 'error' && e.detail).at(-1)?.detail ?? null;
  const screenOnTicks = ticks.some((t) => t.screenOn !== undefined)
    ? ticks.filter((t) => t.screenOn).length
    : null;

  let stoppedEarlyAt: string | null = null;
  if (start && (!stop || stop.reason === 'stopped')) {
    const times = entries.map((e) =>
      e.kind === 'tick' ? e.nativeAt : e.kind === 'read' ? e.endedAt : e.at,
    );
    stoppedEarlyAt = clock(Math.max(...times) - start.at);
  }

  const pages = count('page');
  const checks = count('check');
  const minPages = Math.ceil(planned * 0.9);
  const longestGapSeconds = Math.round(longestGap / 1000);
  const alertsOn = start?.alertsOn ?? false;

  const reasons: string[] = [];
  if (pages < minPages) reasons.push(`Only ${pages} of ${planned} reads came back (needed ${minPages})`);
  if (longestGapSeconds > 45) reasons.push(`Longest wait between reads was ${longestGapSeconds} seconds`);
  if (checks > 0) reasons.push('DiveMeets asked for a check');
  if (stoppedEarlyAt) reasons.push(`Stopped early at ${stoppedEarlyAt}`);
  if (!alertsOn) reasons.push('Alerts were off');

  return {
    planned,
    ticks: ticks.length,
    pages,
    checks,
    errors: count('error'),
    busy: count('busy'),
    longestGapSeconds,
    maxJsDelaySeconds: Math.round(maxJsDelay / 1000),
    pageChanges,
    steps,
    lastError,
    screenOnTicks,
    stoppedEarlyAt,
    alertsOn,
    batteryOptimized: start?.batteryOptimized ?? false,
    powerSave: start?.powerSave ?? false,
    pass: pages >= minPages && longestGapSeconds <= 45 && checks === 0,
    reasons,
  };
}
