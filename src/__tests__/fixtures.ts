// Helps the screen tests: saved DiveMeets pages stand in for the reader. Not a test file (see jest.config.js).
import { readFileSync } from 'fs';
import { join } from 'path';
import { createElement, type ReactElement } from 'react';
import { LiveSourceContext, NotReachedError, PageSourceContext, type FollowPage } from '../divemeets/source';
import { FollowsProvider } from '../follows';
import { LiveProvider } from '../live';

export function fixture(path: string): string {
  return readFileSync(join(__dirname, '..', '..', 'fixtures', 'divemeets', path), 'utf8');
}

const neverFollows: FollowPage = () => () => {};

/**
 * Wraps a screen so `pages` (DiveMeets page name to fixture file, or the error it fails with) answer its page loads;
 * others fail. `follow` stands in for live mode (by default it never sends anything).
 */
export function withPages(
  ui: ReactElement,
  pages: Record<string, string | Error>,
  follow: FollowPage = neverFollows,
): ReactElement {
  const load = (path: string) => {
    const page = pages[path] ?? new NotReachedError(path);
    return page instanceof Error ? Promise.reject(page) : Promise.resolve(fixture(page));
  };
  return createElement(
    LiveSourceContext.Provider,
    { value: follow },
    createElement(
      FollowsProvider,
      null,
      createElement(LiveProvider, null, createElement(PageSourceContext.Provider, { value: load }, ui)),
    ),
  );
}
