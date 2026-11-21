/** A meet number typed on its own, or the `meetnum=` in a pasted DiveMeets link; undefined for anything else. */
export function parseMeetLink(text: string): number | undefined {
  const t = text.trim();
  const m = /^\d+$/.test(t)
    ? t
    : /^https:\/\/secure\.meetcontrol\.com\/divemeets\/[^\s]*[?&]meetnum=(\d+)/.exec(t)?.[1];
  const n = Number(m);
  return m && n > 0 ? n : undefined;
}
