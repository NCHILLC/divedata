/**
 * Wraps a page loader so a page is loaded at most once per `freshMs` (docs/divemeets.md "Polite use"), and two
 * screens asking at once share one load. Failed loads are not kept.
 * shortcut: the cache lives in memory only, so it starts empty each time the app opens; keep it on the phone if
 * reopening the app turns out to load pages too often.
 */
export function createPageCache(
  fetchPage: (path: string) => Promise<string>,
  { now = Date.now, freshMs = 60_000 }: { now?: () => number; freshMs?: number } = {},
): (path: string) => Promise<string> {
  const pages = new Map<string, { at: number; html: Promise<string> }>();
  return (path) => {
    const hit = pages.get(path);
    if (hit && now() - hit.at < freshMs) return hit.html;
    const html = fetchPage(path);
    pages.set(path, { at: now(), html });
    html.catch(() => pages.get(path)?.html === html && pages.delete(path));
    return html;
  };
}
