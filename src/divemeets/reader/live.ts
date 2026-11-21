import { CheckNeededError, LiveStoppedError, NotReachedError, type FollowPage } from '../source';
import { answered, isBotCheck, pageUrl } from './page';

/** The fastest live mode reads a page (docs/divemeets.md "Polite use"). The service refuses anything faster. */
const LIVE_SECONDS = 30;

/** What live mode needs from the native module in modules/live-reader (an Android foreground service). */
export type LiveNative = {
  /** `referer` is '' when there is none. */
  start(url: string, intervalSeconds: number, referer: string): void;
  reload(): void;
  stop(): void;
  addListener(event: 'onTick' | 'onStopped', fn: () => void): { remove(): void };
  addListener(event: 'onPage', fn: (page: { title: string; html: string; status: number }) => void): { remove(): void };
  addListener(event: 'onFailed', fn: (e: { reason: string }) => void): { remove(): void };
};

/**
 * Live mode: re-reads one page through a browser the foreground service owns, so it keeps reading with the
 * screen off (docs/decisions/2026-11-21-background-reading.md). The service ticks; this side decides whether to
 * reload. While DiveMeets shows its check it stops reloading and tells the screen, which shows the check to the
 * person; if the check clears itself, the next page carries on. `native` is null where the module is missing.
 * `from` gives the page the link came from, sent as the Referer (DiveMeets refuses results pages without one).
 */
export function createLive(native: LiveNative | null, from: () => string | undefined = () => undefined): FollowPage {
  let current: { end: () => void } | undefined;

  return (path, onUpdate) => {
    const url = pageUrl(path);
    if (!native) {
      onUpdate({ error: new NotReachedError('Live mode needs the Android app') });
      return () => {};
    }
    current?.end(); // the service stays up and opens the new page
    const referer = from();

    let waiting = true; // a read is out and has not come back
    let checking = false;
    const subs = [
      native.addListener('onTick', () => {
        if (checking) return;
        if (waiting) onUpdate({ error: new NotReachedError('DiveMeets did not answer') });
        waiting = true;
        native.reload();
      }),
      native.addListener('onPage', (page) => {
        waiting = false;
        checking = isBotCheck(page);
        if (checking) onUpdate({ error: new CheckNeededError('DiveMeets needs a check first') });
        else if (page.status >= 400) onUpdate({ error: answered(page.status, referer) });
        else onUpdate({ html: page.html });
      }),
      native.addListener('onFailed', () => {
        waiting = false;
        onUpdate({ error: new NotReachedError('No connection to DiveMeets') });
      }),
      native.addListener('onStopped', () => {
        end();
        onUpdate({ error: new LiveStoppedError('Live mode stopped') });
      }),
    ];
    const end = () => {
      subs.forEach((s) => s.remove());
      if (current === me) current = undefined;
    };
    const me = { end };
    current = me;
    const unfollow = () => {
      if (current !== me) return; // already replaced or stopped
      end();
      native.stop();
    };

    try {
      native.start(url, LIVE_SECONDS, referer ?? '');
    } catch {
      // Android refuses to start the service while the app is off screen.
      end();
      onUpdate({ error: new NotReachedError('Live mode could not start') });
    }
    return unfollow;
  };
}
