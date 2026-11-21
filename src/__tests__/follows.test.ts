import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, renderHook } from '@testing-library/react-native';
import { FollowsProvider, useFollows } from '../follows';

const start = () => renderHook(() => useFollows(), { wrapper: FollowsProvider });

beforeEach(() => AsyncStorage.clear());

test('following a diver keeps them on the phone for next time', async () => {
  const first = await start();
  expect(first.result.current.divers).toEqual([]);
  await act(async () => first.result.current.toggle({ diverNumber: 7, name: 'Diver 7' }));
  expect(first.result.current.isFollowed(7)).toBe(true);

  const next = await start();
  await act(async () => {});
  expect(next.result.current.divers).toEqual([{ diverNumber: 7, name: 'Diver 7' }]);

  await act(async () => next.result.current.toggle({ diverNumber: 7, name: 'Diver 7' }));
  expect(next.result.current.isFollowed(7)).toBe(false);
  expect(JSON.parse((await AsyncStorage.getItem('follows')) ?? '')).toEqual([]);
});
