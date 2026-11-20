import { HTMLElement, parse } from 'node-html-parser';
import type { z } from 'zod';

export type PageType =
  | 'meet-list'
  | 'meet-info'
  | 'meet-results'
  | 'event-results'
  | 'dive-sheet'
  | 'judge-scores'
  | 'diver-profile'
  | 'diver-search';

/** DiveMeets changed a page so a parser no longer recognises it. */
export class PageChangedError extends Error {
  constructor(
    public readonly page: PageType,
    detail: string,
  ) {
    super(`DiveMeets ${page} page changed: ${detail}`);
    this.name = 'PageChangedError';
  }
}

export function load(html: string): HTMLElement {
  return parse(html);
}

/** Text of an element with entities decoded (node-html-parser does this), non-breaking spaces as spaces, trimmed. */
export function cleanText(el: HTMLElement | undefined | null): string {
  return el ? el.text.replace(/\s+/g, ' ').trim() : '';
}

/** Zod-checks a parsed value; a failure means the page layout changed. */
export function checked<T>(page: PageType, schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new PageChangedError(page, `${issue.path.join('.') || 'value'}: ${issue.message}`);
  }
  return result.data;
}
