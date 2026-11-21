import { CheckNeededError, NotReachedError } from '../source';
import { createPageCache } from './cache';
import { isBotCheck, pageUrl } from './page';

const TIMEOUT_MS = 30_000;

export type Request = { id: number; path: string; resolve: (html: string) => void; reject: (e: Error) => void };

/**
 * The reader's page queue: one page at a time through the hidden browser view, behind the cache.
 * `show` tells the view which page to open (or none); `check` tells it to show or hide DiveMeets' check.
 */
export function createQueue(show: (r: Request | undefined) => void, check: (on: boolean) => void) {
  const queue: Request[] = [];
  let nextId = 1;
  let status = 200;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const startNext = () => {
    clearTimeout(timer);
    status = 200;
    show(queue[0]);
    if (queue[0]) timer = setTimeout(() => finish(new NotReachedError('DiveMeets did not answer')), TIMEOUT_MS);
  };

  const finish = (result: string | Error) => {
    const done = queue.shift();
    if (typeof result === 'string') done?.resolve(result);
    else done?.reject(result);
    startNext();
  };

  return {
    load: createPageCache(
      (path) =>
        new Promise<string>((resolve, reject) => {
          pageUrl(path); // a bad page name throws here, so it never reaches the queue
          queue.push({ id: nextId++, path, resolve, reject });
          if (queue.length === 1) startNext();
        }),
    ),

    /** The browser view read a page: the check, an error page or the page asked for. */
    read(data: string) {
      let page: { title: string; html: string };
      try {
        page = JSON.parse(data);
      } catch {
        return;
      }
      if (isBotCheck(page)) {
        clearTimeout(timer); // the person may take a while
        status = 200; // the check came back 403; the page after it gets its own status
        check(true);
        return;
      }
      check(false);
      finish(status >= 400 ? new NotReachedError(`DiveMeets answered ${status}`) : page.html);
    },

    httpError(code: number) {
      status = code;
    },

    failed() {
      finish(new NotReachedError('No connection to DiveMeets'));
    },

    /** The person closed the check: every waiting page fails. */
    notNow() {
      check(false);
      queue.splice(0).forEach((r) => r.reject(new CheckNeededError('DiveMeets needs a check first')));
      startNext();
    },
  };
}
