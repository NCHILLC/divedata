// The meeting point between the reader and the screens. The reader provides a LoadPage at the app's entry
// (src/root.tsx); screens use it through usePage, so they never import the reader (AGENTS.md "Layers").
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

/** Loads one DiveMeets page by its name, e.g. `profile.php?number=1`, and gives back its HTML. */
export type LoadPage = (path: string) => Promise<string>;

export const PageSourceContext = createContext<LoadPage | null>(null);

/** The person closed DiveMeets' check without finishing it. */
export class CheckNeededError extends Error {
  name = 'CheckNeededError';
}

/** DiveMeets did not send the page: no connection, a server error or no answer in time. */
export class NotReachedError extends Error {
  name = 'NotReachedError';
}

/**
 * DiveMeets answered but would not send the page (a 4xx that is not its check). `url` is a DiveMeets page the
 * person can open in their phone's browser and tap through from, since opening the page itself there is refused too.
 */
export class RefusedError extends Error {
  name = 'RefusedError';
  constructor(
    message: string,
    readonly url: string,
  ) {
    super(message);
  }
}

/** Live mode stopped: the person tapped Stop in its notification, or it ran out of time. */
export class LiveStoppedError extends Error {
  name = 'LiveStoppedError';
}

/** One read of a followed page: its HTML, or why it did not come. */
export type LiveUpdate = { html: string } | { error: Error };

/** Follows one DiveMeets page live (re-read every 30 seconds, screen off too). Gives back the unfollow. */
export type FollowPage = (path: string, onUpdate: (u: LiveUpdate) => void) => () => void;

export const LiveSourceContext = createContext<FollowPage | null>(null);

/** Phone notifications from live mode: an "Up next" alert, and the words on its ongoing notification. */
export type Notify = { alert(title: string, text: string): void; status(title: string, text: string): void };

/** Null where the phone has no live mode (tests, iPhone). */
export const NotifyContext = createContext<Notify | null>(null);

/**
 * Follows a page live and reads each copy with a parser. `data` is the latest good page; `error` is the latest
 * problem since it, cleared by the next good page. Only one page is followed at a time. `path` undefined waits.
 * `onData` gets each good page as it arrives, outside rendering, so it runs while React holds the screen.
 * Pass the same `parse` and `onData` every render (module functions or useCallback), or the page is followed again.
 */
export function useLivePage<T>(
  path: string | undefined,
  parse: (html: string) => T,
  onData?: (data: T) => void,
): { data?: T; error?: Error } {
  const follow = useContext(LiveSourceContext);
  if (!follow) throw new Error('useLivePage needs a LiveSourceContext provider');
  const [state, setState] = useState<{ path?: string; data?: T; error?: Error }>({});

  useEffect(() => {
    if (!path) return;
    return follow(path, (u) => {
      let next: { data?: T; error?: Error };
      if ('error' in u) next = { error: u.error };
      else {
        try {
          next = { data: parse(u.html) };
        } catch (error) {
          next = { error: error as Error };
        }
        if ('data' in next) onData?.(next.data as T);
      }
      setState((s) =>
        'data' in next ? { path, data: next.data } : { path, data: s.path === path ? s.data : undefined, error: next.error },
      );
    });
  }, [follow, path, parse, onData]);

  if (state.path !== path) return {};
  return state.error ? { data: state.data, error: state.error } : { data: state.data };
}

export type PageState<T> = { status: 'loading' } | { status: 'ready'; data: T } | { status: 'error'; error: Error };

/** Loads a page and reads it with a parser. `path` undefined waits. `reload` tries again after an error. */
export function usePage<T>(path: string | undefined, parse: (html: string) => T) {
  const load = useContext(PageSourceContext);
  if (!load) throw new Error('usePage needs a PageSourceContext provider');
  const [attempt, setAttempt] = useState(0);
  // Each result is tagged with the load it answers, so a new path or a retry shows loading until its answer.
  const key = `${attempt} ${path}`;
  const [result, setResult] = useState<{ key: string; state: PageState<T> }>();

  useEffect(() => {
    if (!path) return;
    let live = true;
    load(path)
      .then((html) => live && setResult({ key, state: { status: 'ready', data: parse(html) } }))
      .catch((error: Error) => live && setResult({ key, state: { status: 'error', error } }));
    return () => {
      live = false;
    };
  }, [load, path, parse, key]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const state: PageState<T> = result?.key === key ? result.state : { status: 'loading' };
  return { state, reload };
}
