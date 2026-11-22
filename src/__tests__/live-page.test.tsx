import { act, renderHook } from '@testing-library/react-native';
import { createElement, type ReactNode } from 'react';
import { CheckNeededError, LiveSourceContext, useLivePage, type FollowPage, type LiveUpdate } from '../divemeets/source';

let send: (u: LiveUpdate) => void;
const unfollow = jest.fn();
const follow: FollowPage = jest.fn((_path, onUpdate) => {
  send = onUpdate;
  return unfollow;
});
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(LiveSourceContext.Provider, { value: follow }, children);
const parse = (html: string) => {
  if (!html.startsWith('<p>')) throw new Error('page changed');
  return html.slice(3);
};

test('keeps the latest good page and shows the latest problem with it', async () => {
  const { result, unmount } = await renderHook(() => useLivePage('index.php', parse), { wrapper });
  expect(result.current).toEqual({});

  await act(async () => send({ html: '<p>round 1' }));
  expect(result.current).toEqual({ data: 'round 1' });

  await act(async () => send({ error: new CheckNeededError('check') }));
  expect(result.current.data).toBe('round 1');
  expect(result.current.error?.name).toBe('CheckNeededError');

  await act(async () => send({ html: 'not a results page' }));
  expect(result.current.data).toBe('round 1');
  expect(result.current.error?.message).toBe('page changed');

  await act(async () => send({ html: '<p>round 2' }));
  expect(result.current).toEqual({ data: 'round 2' });

  await unmount();
  expect(unfollow).toHaveBeenCalled();
});

test('waits without following when there is no page yet', async () => {
  (follow as jest.Mock).mockClear();
  await renderHook(() => useLivePage(undefined, parse), { wrapper });
  expect(follow).not.toHaveBeenCalled();
});

test('hands each good page to onData as it comes, not errors', async () => {
  const onData = jest.fn();
  await renderHook(() => useLivePage('index.php', parse, onData), { wrapper });
  await act(async () => send({ html: '<p>round 1' }));
  await act(async () => send({ error: new CheckNeededError('check') }));
  expect(onData).toHaveBeenCalledTimes(1);
  expect(onData).toHaveBeenCalledWith('round 1');
});
