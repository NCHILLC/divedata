// Throwaway: milestone 2 background test. Never merged.
// Drives one hidden WebView from the native timer and writes one log line per read.
import { useCallback, useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import type { WebViewMessageEvent } from 'react-native-webview';
import BackgroundTestModule, { type ExitReason } from '../../modules/background-test';
import {
  classifyPage,
  fingerprint,
  parseLog,
  summarize,
  type LogEntry,
  type ReadResult,
  type Step,
  type Summary,
} from './log';

export const START_URL = 'https://secure.meetcontrol.com/divemeets/system/index.php';
export const ALLOWED_PREFIX = 'https://secure.meetcontrol.com/divemeets/';
const INTERVAL_SECONDS = 30;
const MINUTES = 30;
const READ_TIMEOUT_MS = 25_000;

// Sends the page's title and text back to the app. Read only; it changes nothing on the page.
export const READ_PAGE_JS = `window.ReactNativeWebView.postMessage(JSON.stringify({
  title: document.title || '',
  text: document.body ? document.body.innerText : ''
})); true;`;

export type Stage = 'choose' | 'running' | 'check' | 'result';

/** The two WebView methods the test uses. */
export type WebHandle = { reload(): void; injectJavaScript(script: string): void };

const write = (entry: LogEntry) => BackgroundTestModule.appendLog(JSON.stringify(entry));
const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

export function useBackgroundTest(webRef: React.RefObject<WebHandle | null>) {
  const [stage, setStage] = useState<Stage>('choose');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [exits, setExits] = useState<ExitReason[]>([]);
  const [url, setUrl] = useState(START_URL);
  const [chosenUrl, setChosenUrl] = useState<string | null>(null);
  const currentUrl = useRef(START_URL);
  const inFlight = useRef<{ seq: number; startedAt: number; httpStatus: number } | null>(null);
  const lastPrint = useRef<string | undefined>(undefined);
  const stageRef = useRef<Stage>('choose');
  useEffect(() => {
    stageRef.current = stage;
  }, [stage]);

  const showResult = useCallback(async () => {
    setSummary(summarize(parseLog(await BackgroundTestModule.readLog())));
    setExits(BackgroundTestModule.exitReasons());
    setStage('result');
  }, []);

  const step = useCallback((name: Step, detail?: string) => {
    const read = inFlight.current;
    if (read) write({ kind: 'step', seq: read.seq, at: Date.now(), step: name, ...(detail ? { detail } : {}) });
  }, []);

  const finishRead = useCallback((result: ReadResult, print?: string) => {
    const read = inFlight.current;
    if (!read) return;
    inFlight.current = null;
    write({
      kind: 'read',
      seq: read.seq,
      startedAt: read.startedAt,
      endedAt: Date.now(),
      result,
      ...(print ? { fingerprint: print } : {}),
    });
  }, []);

  // On open: a run already going, a finished run to show, or a fresh start.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const entries = parseLog(await BackgroundTestModule.readLog());
      if (cancelled) return;
      const start = entries.find((e) => e.kind === 'start');
      if (!start || start.kind !== 'start') return;
      if (BackgroundTestModule.isRunning()) {
        setUrl(start.url);
        setChosenUrl(start.url);
        setStage('running');
      } else {
        setSummary(summarize(entries));
        setExits(BackgroundTestModule.exitReasons());
        setStage('result');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const tick = BackgroundTestModule.addListener('onTick', ({ seq }) => {
      if (stageRef.current !== 'running') return;
      const now = Date.now();
      if (inFlight.current) {
        if (now - inFlight.current.startedAt < READ_TIMEOUT_MS) {
          write({ kind: 'read', seq, startedAt: now, endedAt: now, result: 'busy' });
          return;
        }
        finishRead('error');
      }
      inFlight.current = { seq, startedAt: now, httpStatus: 200 };
      step('reload');
      webRef.current?.reload();
    });
    const finished = BackgroundTestModule.addListener('onFinished', ({ reason }) => {
      inFlight.current = null;
      if (reason === 'check') setStage('check');
      else void showResult();
    });
    return () => {
      tick.remove();
      finished.remove();
    };
  }, [finishRead, showResult, step, webRef]);

  const onLoadStart = useCallback(() => step('loadStart'), [step]);

  const onLoadEnd = useCallback(() => {
    step('loadEnd');
    if (inFlight.current) webRef.current?.injectJavaScript(READ_PAGE_JS);
  }, [step, webRef]);

  const onHttpError = useCallback(
    (status: number) => {
      step('error', `HTTP ${status}`);
      if (inFlight.current) inFlight.current.httpStatus = status;
    },
    [step],
  );

  const onLoadError = useCallback(
    (description: string) => {
      step('error', description);
      finishRead('error');
    },
    [finishRead, step],
  );

  const onMessage = useCallback(
    (event: WebViewMessageEvent) => {
      if (!inFlight.current) return;
      step('message');
      let page: { title: string; text: string };
      try {
        page = JSON.parse(event.nativeEvent.data);
      } catch {
        finishRead('error');
        return;
      }
      const kind = classifyPage(page);
      if (kind === 'check') {
        finishRead('check');
        BackgroundTestModule.notify('DiveMeets wants a check', 'Open DiveData to see it.');
        BackgroundTestModule.stop('check');
        return;
      }
      if (inFlight.current.httpStatus >= 400) {
        finishRead('error');
        return;
      }
      const print = fingerprint(page.text);
      if (lastPrint.current !== undefined && print !== lastPrint.current) {
        BackgroundTestModule.notify('The page changed', `At ${clockTime(Date.now())}`);
      }
      lastPrint.current = print;
      finishRead('page', print);
    },
    [finishRead, step],
  );

  const openLink = useCallback((link: string) => {
    const trimmed = link.trim();
    if (!trimmed.startsWith(ALLOWED_PREFIX)) return false;
    setUrl(trimmed);
    return true;
  }, []);

  const onNavigation = useCallback((navUrl: string) => {
    currentUrl.current = navUrl;
  }, []);

  const usePage = useCallback(() => setChosenUrl(currentUrl.current), []);

  const start = useCallback(async () => {
    if (!chosenUrl) return;
    if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
      await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
    }
    BackgroundTestModule.clearLog();
    const phone = BackgroundTestModule.phoneState();
    write({ kind: 'start', at: Date.now(), url: chosenUrl, ...phone });
    // Logged as its own line (dropped by parseLog, kept in the shared log): the browser's old setting.
    try {
      const before = await BackgroundTestModule.keepBrowserImportant();
      BackgroundTestModule.appendLog(JSON.stringify({ kind: 'browser', at: Date.now(), ...before }));
    } catch (e) {
      BackgroundTestModule.appendLog(JSON.stringify({ kind: 'browser', at: Date.now(), failed: String(e) }));
    }
    lastPrint.current = undefined;
    inFlight.current = null;
    setUrl(chosenUrl);
    setStage('running');
    BackgroundTestModule.start(INTERVAL_SECONDS, MINUTES);
  }, [chosenUrl]);

  const stop = useCallback(() => BackgroundTestModule.stop('stopped'), []);

  const reset = useCallback(() => {
    BackgroundTestModule.clearLog();
    setSummary(null);
    setChosenUrl(null);
    setStage('choose');
  }, []);

  const log = useCallback(() => BackgroundTestModule.readLog(), []);

  return {
    stage,
    summary,
    exits,
    url,
    chosenUrl,
    openLink,
    onNavigation,
    usePage,
    start,
    stop,
    reset,
    showResult,
    log,
    onLoadStart,
    onLoadEnd,
    onHttpError,
    onLoadError,
    onMessage,
  };
}
