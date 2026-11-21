import {
  classifyPage,
  fingerprint,
  parseLog,
  summarize,
  type LogEntry,
} from '../spike/log';

const T0 = 1_700_000_000_000;
const STEP = 30_000;

type ReadResult = 'page' | 'check' | 'error' | 'busy';

function run(
  results: ReadResult[],
  opts: { alertsOn?: boolean; stop?: 'done' | 'stopped' | 'check' | null; gapAt?: number } = {},
): LogEntry[] {
  const entries: LogEntry[] = [
    {
      kind: 'start',
      at: T0,
      url: 'https://secure.meetcontrol.com/divemeets/system/x',
      alertsOn: opts.alertsOn ?? true,
      batteryOptimized: true,
      powerSave: false,
    },
  ];
  let at = T0;
  results.forEach((result, i) => {
    at += i === opts.gapAt ? 61_000 : STEP;
    const seq = i + 1;
    entries.push({ kind: 'tick', seq, nativeAt: at });
    entries.push({
      kind: 'read',
      seq,
      startedAt: at + 5,
      endedAt: at + 900,
      result,
      ...(result === 'page' ? { fingerprint: i < 30 ? 'aaa' : 'bbb' } : {}),
    });
  });
  if (opts.stop !== null) entries.push({ kind: 'stop', at: at + 1000, reason: opts.stop ?? 'done' });
  return entries;
}

const pages = (n: number): ReadResult[] => Array.from({ length: n }, () => 'page');

test('parseLog skips lines that are not JSON', () => {
  const text = [
    JSON.stringify({ kind: 'stop', at: 1, reason: 'done' }),
    'not json',
    JSON.stringify({ kind: 'tick', seq: 1, nativeAt: 1 }),
    '',
  ].join('\n');
  expect(parseLog(text)).toHaveLength(2);
});

test('classifyPage spots the bot check', () => {
  expect(classifyPage({ title: 'Just a moment...', text: '' })).toBe('check');
  expect(classifyPage({ title: 'x', text: 'Please verify you are human' })).toBe('check');
  expect(classifyPage({ title: 'x', text: 'CHECKING YOUR BROWSER before accessing' })).toBe('check');
  expect(classifyPage({ title: 'Event Results', text: 'Round 1' })).toBe('page');
});

test('fingerprint is stable and tells pages apart', () => {
  expect(fingerprint('Round 1 7.5')).toBe(fingerprint('Round 1 7.5'));
  expect(fingerprint('Round 1 7.5')).not.toBe(fingerprint('Round 1 8.0'));
});

test('clean run passes', () => {
  const s = summarize(run(pages(60)));
  expect(s).toMatchObject({
    planned: 60,
    ticks: 60,
    pages: 60,
    pageChanges: 1,
    longestGapSeconds: 30,
    stoppedEarlyAt: null,
    pass: true,
    reasons: [],
  });
});

test('a log that ends without a stop line says when it stopped', () => {
  const s = summarize(run(pages(20), { stop: null }));
  expect(s.pass).toBe(false);
  expect(s.stoppedEarlyAt).toBe('10:00');
  expect(s.reasons).toContain('Stopped early at 10:00');
});

test('check stops the run and fails it', () => {
  const s = summarize(run([...pages(10), 'check'], { stop: 'check' }));
  expect(s.checks).toBe(1);
  expect(s.pass).toBe(false);
  expect(s.reasons).toContain('DiveMeets asked for a check');
});

test('one busy read is counted and the run still passes', () => {
  const s = summarize(run([...pages(30), 'busy', ...pages(29)]));
  expect(s.busy).toBe(1);
  expect(s.pages).toBe(59);
  expect(s.pass).toBe(true);
});

test('seven errors fail the run', () => {
  const errors: ReadResult[] = Array.from({ length: 7 }, () => 'error');
  const s = summarize(run([...pages(30), ...errors, ...pages(23)]));
  expect(s.errors).toBe(7);
  expect(s.pages).toBe(53);
  expect(s.pass).toBe(false);
});

test('alerts off is reported but does not fail the run', () => {
  const s = summarize(run(pages(60), { alertsOn: false }));
  expect(s.reasons).toContain('Alerts were off');
  expect(s.pass).toBe(true);
});

test('a late JavaScript reaction shows as delay', () => {
  const entries = run(pages(60));
  const read = entries.find((e) => e.kind === 'read' && e.seq === 5);
  if (read?.kind === 'read') read.startedAt += 12_000;
  expect(summarize(entries).maxJsDelaySeconds).toBe(12);
});

test('step lines show how far each read got', () => {
  const entries = run(['error', 'error', 'page']);
  const step = (seq: number, name: string, detail?: string): LogEntry => ({
    kind: 'step',
    seq,
    at: T0 + seq * STEP + 10,
    step: name as 'reload',
    ...(detail ? { detail } : {}),
  });
  entries.push(
    step(1, 'reload'),
    step(2, 'reload'),
    step(2, 'loadStart'),
    step(2, 'error', 'net::ERR_TIMED_OUT'),
    step(3, 'reload'),
    step(3, 'loadStart'),
    step(3, 'loadStart'),
    step(3, 'loadEnd'),
    step(3, 'message'),
  );
  const s = summarize(entries);
  expect(s.steps).toEqual({ reload: 3, loadStart: 2, loadEnd: 1, message: 1, error: 1 });
  expect(s.lastError).toBe('net::ERR_TIMED_OUT');
});

test('ticks record whether the screen was on', () => {
  const entries = run(pages(4));
  entries.forEach((e) => {
    if (e.kind === 'tick') e.screenOn = e.seq === 1;
  });
  expect(summarize(entries).screenOnTicks).toBe(1);
  expect(summarize(run(pages(4))).screenOnTicks).toBeNull();
});

test('a gap over 45 seconds fails the run', () => {
  const s = summarize(run(pages(60), { gapAt: 20 }));
  expect(s.longestGapSeconds).toBe(61);
  expect(s.pass).toBe(false);
});
