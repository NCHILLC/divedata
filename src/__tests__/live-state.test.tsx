import AsyncStorage from "@react-native-async-storage/async-storage";
import { act, renderHook } from "@testing-library/react-native";
import { createElement, type ReactNode } from "react";
import {
  CheckNeededError,
  LiveSourceContext,
  LiveStoppedError,
  NotifyContext,
  NotReachedError,
  type FollowPage,
  type LiveUpdate,
} from "../divemeets/source";
import { FollowsProvider } from "../follows";
import { LiveProvider, useLive } from "../live";
import { fixture } from "./fixtures";

let send: (u: LiveUpdate) => void;
const unfollow = jest.fn();
const follow = jest.fn<() => void, Parameters<FollowPage>>(
  (_path, onUpdate) => {
    send = onUpdate;
    return unfollow;
  },
);
const notify = { alert: jest.fn(), status: jest.fn() };

const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(
    LiveSourceContext.Provider,
    { value: follow },
    createElement(
      NotifyContext.Provider,
      { value: notify },
      createElement(
        FollowsProvider,
        null,
        createElement(LiveProvider, null, children),
      ),
    ),
  );

const board = { html: fixture("live/in-progress.html") };
const path = "livestats.php?event=stats-13172-7160-9-Started";

async function following() {
  const hook = await renderHook(() => useLive(), { wrapper });
  await act(async () => {}); // followed divers and the alert setting load from the phone
  await act(async () => hook.result.current.start(path));
  return hook;
}

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem(
    "follows",
    JSON.stringify([{ diverNumber: 5, name: "Diver 5" }]),
  );
});

test("follows the board and alerts when a followed diver is close", async () => {
  const { result } = await following();
  expect(follow).toHaveBeenCalledWith(path, expect.any(Function));
  await act(async () => send(board));
  expect(result.current.board?.eventName).toBe(
    "Women 3m Championship (6 Dives)",
  );
  expect(notify.alert).toHaveBeenCalledWith(
    "Diver 5 dives soon",
    "1 diver before them · Women 3m Championship (6 Dives)",
  );
  expect(notify.status).toHaveBeenCalledWith(
    "Following Diver 5",
    "1 diver before them",
  );
});

test("names the followed diver closest to diving on the ongoing notification", async () => {
  await AsyncStorage.setItem(
    "follows",
    JSON.stringify([
      { diverNumber: 6, name: "Diver 6" },
      { diverNumber: 5, name: "Diver 5" },
    ]),
  );
  await following();
  await act(async () => send(board));
  expect(notify.status).toHaveBeenLastCalledWith(
    "Following Diver 5",
    "1 diver before them",
  );
});

test("does not alert twice for the same board", async () => {
  await following();
  await act(async () => send(board));
  await act(async () => send(board));
  expect(notify.alert).toHaveBeenCalledTimes(1);
});

test("keeps the last board and keeps following when DiveMeets does not answer", async () => {
  const { result } = await following();
  await act(async () => send(board));
  await act(async () => send({ error: new NotReachedError("no answer") }));
  expect(result.current.board).toBeDefined();
  expect(result.current.error?.name).toBe("NotReachedError");
  expect(unfollow).not.toHaveBeenCalled();
});

test("stops with a last alert when the event is over", async () => {
  const { result } = await following();
  await act(async () => send({ html: fixture("live/finished.html") }));
  expect(notify.alert).toHaveBeenCalledWith(
    "Women Platform (5 Dives) is over",
    "Diver 5 finished in place 5.",
  );
  expect(result.current.path).toBeUndefined();
  expect(unfollow).toHaveBeenCalled();
});

test("points to DiveMeets when no followed diver was in the event", async () => {
  await AsyncStorage.setItem(
    "follows",
    JSON.stringify([{ diverNumber: 999, name: "Someone" }]),
  );
  await following();
  await act(async () => send({ html: fixture("live/finished.html") }));
  expect(notify.alert).toHaveBeenCalledWith(
    "Women Platform (5 Dives) is over",
    "Final results are on DiveMeets.",
  );
});

test("asks for the check once, however often DiveMeets shows it", async () => {
  await following();
  await act(async () => send({ error: new CheckNeededError("check") }));
  await act(async () => send({ error: new CheckNeededError("check") }));
  expect(notify.alert).toHaveBeenCalledTimes(1);
  expect(notify.alert).toHaveBeenCalledWith(
    "DiveMeets wants a check",
    "Open DiveData to carry on.",
  );
});

test("stopping from the notification ends the follow", async () => {
  const { result } = await following();
  await act(async () => send({ error: new LiveStoppedError("stopped") }));
  expect(result.current.path).toBeUndefined();
});

test("keeps the alert distance between 1 and 5, on the phone", async () => {
  const { result } = await renderHook(() => useLive(), { wrapper });
  expect(result.current.away).toBe(3);
  await act(async () => result.current.setAway(9));
  expect(result.current.away).toBe(5);
  expect(await AsyncStorage.getItem("alertAway")).toBe("5");
});

test("following the same board again (after DiveMeets' check) does not repeat alerts", async () => {
  const { result } = await following();
  await act(async () => send(board));
  await act(async () => result.current.stop());
  await act(async () => result.current.start(path));
  await act(async () => send(board));
  expect(notify.alert).toHaveBeenCalledTimes(1);
});
