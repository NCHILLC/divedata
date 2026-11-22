// Live mode above the screens: the live board being followed, its "Up next" alerts and the words on the ongoing
// notification. It sits in the root layout, so moving between screens does not stop it. The alert distance is
// kept on the phone only (AGENTS.md "Never").
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { parseLiveBoard, type LiveBoard } from "./divemeets/parsers";
import { NotifyContext, useLivePage } from "./divemeets/source";
import { useFollows } from "./follows";
import { alertsDue, diversBefore, type Sent } from "./scoring";

const AWAY_KEY = "alertAway";
const clampAway = (n: number) => Math.min(5, Math.max(1, Math.round(n) || 3));

type Live = {
  /** The live board being followed, or undefined when live mode is off. */
  path?: string;
  board?: LiveBoard;
  error?: Error;
  /** When the last good board came, in milliseconds. */
  updatedAt?: number;
  /** Alert when a followed diver is this many divers away (1 to 5). */
  away: number;
  start(path: string): void;
  stop(): void;
  setAway(n: number): Promise<void>;
};

const LiveContext = createContext<Live | null>(null);

/** How soon a followed diver dives, for picking the closest: divers before them, then dived, then waiting. */
function soonness(board: LiveBoard, diverNumber: number): number {
  const k = diversBefore(board, diverNumber);
  return typeof k === "number" ? k : k === "dived" ? 1000 : 2000;
}

/** The ongoing notification's words: the followed diver closest to diving and how close they are. */
function statusFor(
  board: LiveBoard,
  followed: { diverNumber: number; name: string }[],
): [string, string] {
  const mine = followed
    .filter((d) => board.rows.some((r) => r.diverNumber === d.diverNumber))
    .reduce<{ diverNumber: number; name: string } | undefined>(
      (best, d) =>
        best &&
        soonness(board, best.diverNumber) <= soonness(board, d.diverNumber)
          ? best
          : d,
      undefined,
    );
  const round = board.round
    ? `Round ${board.round.current} of ${board.round.total}`
    : board.eventName;
  if (!mine) return [`Following ${board.eventName}`, round];
  const k = diversBefore(board, mine.diverNumber);
  const text =
    k === 0
      ? "Up next"
      : typeof k === "number"
        ? `${k} diver${k === 1 ? "" : "s"} before them`
        : k === "dived"
          ? "Dived this round"
          : round;
  return [`Following ${mine.name}`, text];
}

/** The last alert of a closed board: each followed diver's final place. */
function endText(
  board: LiveBoard,
  followed: { diverNumber: number; name: string }[],
): string {
  const places = followed.flatMap((d) => {
    const row = board.rows.find((r) => r.diverNumber === d.diverNumber);
    return row?.place ? [`${d.name} finished in place ${row.place}.`] : [];
  });
  return places.length ? places.join(" ") : "Final results are on DiveMeets.";
}

export function LiveProvider({ children }: { children: React.ReactNode }) {
  const notify = useContext(NotifyContext);
  const { divers } = useFollows();
  const [path, setPath] = useState<string>();
  const [away, setAwayState] = useState(3);
  const [updatedAt, setUpdatedAt] = useState<number>();

  // The update handlers run outside rendering (the screen may be off), so they read the latest values here.
  const latest = useRef({
    notify,
    divers,
    away,
    sent: [] as Sent,
    checkSent: false,
    /** The board the alerts in `sent` belong to; following it again keeps them, so nothing repeats. */
    sentFor: undefined as string | undefined,
  });
  useEffect(() => {
    latest.current.notify = notify;
    latest.current.divers = divers;
    latest.current.away = away;
  }, [notify, divers, away]);

  useEffect(() => {
    AsyncStorage.getItem(AWAY_KEY)
      .then((saved) => saved && setAwayState(clampAway(Number(saved))))
      .catch(() => {}); // unreadable storage keeps the default
  }, []);

  const on = useMemo(
    () => ({
      onData(board: LiveBoard) {
        const l = latest.current;
        l.checkSent = false;
        setUpdatedAt(Date.now());
        if (board.closed) {
          l.notify?.alert(
            `${board.eventName} is over`,
            endText(board, l.divers),
          );
          setPath(undefined);
          return;
        }
        const due = alertsDue(l.sent, board, l.divers, l.away);
        l.sent = due.sent;
        due.alerts.forEach((a) => l.notify?.alert(a.title, a.text));
        l.notify?.status(...statusFor(board, l.divers));
      },
      onError(error: Error) {
        const l = latest.current;
        if (error.name === "LiveStoppedError") setPath(undefined);
        else if (error.name === "CheckNeededError" && !l.checkSent) {
          l.checkSent = true;
          l.notify?.alert(
            "DiveMeets wants a check",
            "Open DiveData to carry on.",
          );
        }
      },
    }),
    [],
  );

  const { data: board, error } = useLivePage(path, parseLiveBoard, on);

  const start = useCallback((next: string) => {
    if (latest.current.sentFor !== next) latest.current.sent = [];
    latest.current.sentFor = next;
    latest.current.checkSent = false;
    setUpdatedAt(undefined);
    setPath(next);
  }, []);
  const stop = useCallback(() => setPath(undefined), []);
  const setAway = useCallback(async (n: number) => {
    const value = clampAway(n);
    setAwayState(value);
    await AsyncStorage.setItem(AWAY_KEY, String(value));
  }, []);

  const value = useMemo(
    () => ({
      path,
      board: path ? board : undefined,
      error: path ? error : undefined,
      updatedAt,
      away,
      start,
      stop,
      setAway,
    }),
    [path, board, error, updatedAt, away, start, stop, setAway],
  );
  return <LiveContext.Provider value={value}>{children}</LiveContext.Provider>;
}

export function useLive(): Live {
  const live = useContext(LiveContext);
  if (!live) throw new Error("useLive needs a LiveProvider");
  return live;
}
