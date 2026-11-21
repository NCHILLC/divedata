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
