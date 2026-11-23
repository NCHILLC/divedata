// Live board math: how many divers go before a followed diver this round, and which "Up next" alerts are due.
import type { LiveBoard, LiveEvent, ScheduledEvent } from '../divemeets/parsers';

/**
 * The boards to show under "Live now": still marked Started, and not on another day's schedule. DiveMeets can leave
 * a board that stopped mid-event marked Started (UChicago's Saturday boards on Sunday), so the meet's schedule
 * decides. A board the schedule cannot place (no schedule, event not on it, no day) stays: better a frozen board than
 * a hidden running one. `today` is the phone's date, `YYYY-MM-DD`. The board's address carries the event's number
 * and type: `livestats.php?event=stats-<meet>-<event>-<type>-Started`.
 */
export function liveNow(live: LiveEvent[], schedule: ScheduledEvent[] | undefined, today: string): LiveEvent[] {
  return live.filter((board) => {
    if (!board.running) return false;
    const m = /stats-\d+-(\d+)-(\d+)-/.exec(board.path);
    if (!m) return true;
    const [eventNumber, eventType] = [Number(m[1]), Number(m[2])];
    const day = schedule?.find(
      (e) => e.eventNumber === eventNumber && (e.eventType === undefined || e.eventType === eventType),
    )?.date;
    return !day || day === today;
  });
}

/**
 * Divers still to dive this round from DiveMeets' Next Diver up to mine; 0 means up next. `'dived'`: dived
 * this round (no star). Undefined when they are not on the board or the board shows no next diver. Counting
 * from the next diver skips the one who just dived, whose star stays until the score posts.
 */
export function diversBefore(board: LiveBoard, diverNumber: number): number | 'dived' | undefined {
  const mine = board.rows.find((r) => r.diverNumber === diverNumber);
  if (!mine || !board.next || board.closed) return undefined;
  if (!mine.toDive || mine.order === undefined || mine.order < board.next.order) return 'dived';
  const from = board.next.order;
  const to = mine.order;
  return board.rows.filter((r) => r.toDive && r.order !== undefined && r.order >= from && r.order < to).length;
}

export type Alert = { diverNumber: number; kind: 'soon' | 'next'; title: string; text: string };
/** Alerts already sent, as `${diverNumber}:${round}:${kind}`. */
export type Sent = string[];

/** The alerts to send for this board: "dives soon" once at `away` or fewer, "up next" once at 0, per round. */
export function alertsDue(
  sent: Sent,
  board: LiveBoard,
  followed: { diverNumber: number; name: string }[],
  away: number,
): { alerts: Alert[]; sent: Sent } {
  const round = board.round?.current ?? 0;
  const alerts: Alert[] = [];
  const next = [...sent];
  for (const { diverNumber, name } of followed) {
    const k = diversBefore(board, diverNumber);
    if (typeof k !== 'number' || k > away) continue;
    const soon = `${diverNumber}:${round}:soon`;
    const up = `${diverNumber}:${round}:next`;
    if (k === 0 && !next.includes(up)) {
      if (!next.includes(soon)) next.push(soon);
      next.push(up);
      alerts.push({ diverNumber, kind: 'next', title: `${name} is up next`, text: board.eventName });
    } else if (k > 0 && !next.includes(soon)) {
      next.push(soon);
      const divers = `${k} diver${k === 1 ? '' : 's'}`;
      alerts.push({ diverNumber, kind: 'soon', title: `${name} dives soon`, text: `${divers} before them · ${board.eventName}` });
    }
  }
  return { alerts, sent: next };
}
