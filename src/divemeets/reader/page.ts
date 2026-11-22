import { NotReachedError, RefusedError } from '../source';

export const DIVEMEETS = 'https://secure.meetcontrol.com/divemeets/system/';

/** The error for a page DiveMeets answered with `status` (400 or more). `from` is the page the link came from. */
export function answered(status: number, from: string | undefined): Error {
  const message = `DiveMeets answered ${status}`;
  return status < 500 ? new RefusedError(message, from ?? pageUrl('index.php')) : new NotReachedError(message);
}

/** The full address of a DiveMeets page name such as `profile.php?number=1`. Refuses anything else. */
export function pageUrl(path: string): string {
  if (!/^[a-z]+\.php(\?[^\s/]*)?$/i.test(path)) throw new Error(`Not a DiveMeets page: ${path}`);
  return DIVEMEETS + path;
}

/** True when the page is Cloudflare's "verify you are human" check instead of a DiveMeets page. */
export function isBotCheck(page: { title: string; html: string }): boolean {
  return (
    /just a moment/i.test(page.title) ||
    /performing security verification|verify you are human|checking your browser/i.test(page.html)
  );
}

/**
 * Pages whose content comes from their own script after loading: both readers wait (up to 10 seconds) until
 * this element is there before reading. The live board fills its table that way (docs/divemeets.md).
 */
const READY_WHEN: Record<string, string> = { 'livestats.php': '#Results table' };

/** The CSS selector to wait for before reading this page, or '' to read it as soon as it has loaded. */
export function readyWhen(path: string): string {
  return READY_WHEN[path.split('?')[0]] ?? '';
}

/**
 * The script the hidden browser view runs once a page has loaded: it sends the page's title and HTML back to
 * the app. Read only; it changes nothing on the page. With `ready`, it first waits up to 10 seconds for that
 * element, unless DiveMeets' check is showing, which goes to the person at once.
 */
export function readPageScript(ready: string): string {
  return `(function () {
  var ready = ${JSON.stringify(ready)}, tries = 40;
  function send() {
    window.ReactNativeWebView.postMessage(JSON.stringify({
      title: document.title || '',
      html: document.documentElement.outerHTML
    }));
  }
  function check() {
    if (!ready || tries-- <= 0 || /just a moment/i.test(document.title || '') || document.querySelector(ready)) send();
    else setTimeout(check, 250);
  }
  check();
})(); true;`;
}
