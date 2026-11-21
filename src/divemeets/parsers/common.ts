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

/** A plain decimal ("321.55", "-14.6"); anything else, blank included, is NaN so the schema fails loudly. */
export function toNumber(text: string): number {
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : NaN;
}

/** The number after `key=` in a link ("meetnum", "eventtype"); NaN when absent so the schema fails loudly. */
export function numberFromHref(href: string | null | undefined, key: string): number {
  return toNumber(new RegExp(`[?&]${key}=(\\d+)`).exec(href ?? '')?.[1] ?? '');
}

/**
 * A place cell. Blank is no place yet; EXHB is an exhibition entry (scored, not ranked); "3", "3T", "T-3" and
 * "T - 3" are place 3 (the T marks a tie). Anything else is NaN, which the schema rejects as a changed page.
 */
export function parsePlace(text: string): { place?: number; tied: boolean; exhibition?: boolean } {
  if (!text) return { tied: false };
  if (text === 'EXHB') return { tied: false, exhibition: true };
  const m = /^(?:(T)\s*-?\s*(\d+)|(\d+)(T)?)$/i.exec(text);
  return m ? { place: Number(m[2] ?? m[3]), tied: Boolean(m[1] ?? m[4]) } : { place: NaN, tied: false };
}

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

/** 1 to 12 from a month name or its first three letters ("Nov", "November"); 0 when it is not a month. */
export function monthNumber(name: string): number {
  return MONTHS.indexOf(name.slice(0, 3).toLowerCase()) + 1;
}

/** YYYY-MM-DD. */
export function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** "Dec 13, 2025" or "Tuesday, Nov 17, 2026" becomes "2025-12-13" / "2026-11-17"; undefined for anything else. */
export function parseDay(text: string): string | undefined {
  const m = /^(?:[A-Za-z]+, )?([A-Za-z]{3})[a-z]* (\d{1,2}), (\d{4})$/.exec(text);
  const month = m ? monthNumber(m[1]) : 0;
  return m && month ? isoDate(Number(m[3]), month, Number(m[2])) : undefined;
}
