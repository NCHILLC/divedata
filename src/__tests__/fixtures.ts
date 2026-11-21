// Helps the screen tests: saved DiveMeets pages stand in for the reader. Not a test file (see jest.config.js).
import { readFileSync } from 'fs';
import { join } from 'path';
import { createElement, type ReactElement } from 'react';
import { NotReachedError, PageSourceContext } from '../divemeets/source';
import { FollowsProvider } from '../follows';

export function fixture(path: string): string {
  return readFileSync(join(__dirname, '..', '..', 'fixtures', 'divemeets', path), 'utf8');
}

/** Wraps a screen so `pages` (DiveMeets page name to fixture file, or the error it fails with) answer its page loads; others fail. */
export function withPages(ui: ReactElement, pages: Record<string, string | Error>): ReactElement {
  const load = (path: string) => {
    const page = pages[path] ?? new NotReachedError(path);
    return page instanceof Error ? Promise.reject(page) : Promise.resolve(fixture(page));
  };
  return createElement(FollowsProvider, null, createElement(PageSourceContext.Provider, { value: load }, ui));
}
