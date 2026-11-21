import { CheckNeededError, NotReachedError } from '../source';
import { createPageCache } from './cache';
import { answered, isBotCheck, pageUrl } from './page';

const TIMEOUT_MS = 30_000;

/** `from` is the page the link came from, sent as the Referer: DiveMeets refuses results pages without one. */
export type Request = {
  id: number;
  path: string;
  from?: string;
  resolve: (html: string) => void;
  reject: (e: Error) => void;
};

/**
 * The reader's page queue: one page at a time through the hidden browser view, behind the cache.
 * `show` tells the view which page to open (or none); `check` tells it to show or hide DiveMeets' check.
 */
export function createQueue(show: (r: Request | undefined) => void, check: (on: boolean) => void) {
  const queue: Request[] = [];
  let nextId = 1;
  let status = 200;
  let timer: ReturnType<typeof setTimeout> | undefined;
  // The last page the person got, as a browser tab remembers where you are. Any DiveMeets page passes its rule.
  let lastPage: string | undefined;

  const startNext = () => {
    clearTimeout(timer);
    status = 200;
    if (queue[0]) queue[0].from = lastPage;
    show(queue[0]);
    if (queue[0]) timer = setTimeout(() => finish(new NotReachedError('DiveMeets did not answer')), TIMEOUT_MS);
  };

  const finish = (result: string | Error) => {
    const done = queue.shift();
    if (typeof result === 'string') {
      if (done) lastPage = pageUrl(done.path);
      done?.resolve(result);
    } else done?.reject(result);
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
      finish(status >= 400 ? answered(status, queue[0]?.from) : page.html);
    },

    /** The page this reader got last, for live mode's Referer. */
    lastPage: () => lastPage,

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
