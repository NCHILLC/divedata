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
