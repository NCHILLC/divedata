import AsyncStorage from '@react-native-async-storage/async-storage';
import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { PermissionsAndroid, Platform } from 'react-native';
import Live from '../app/live';
import { CheckNeededError, NotReachedError, type FollowPage, type LiveUpdate } from '../divemeets/source';
import { fixture, withPages } from './fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

const path = 'livestats.php?event=stats-13172-7160-9-Started';
const finishedPath = 'livestats.php?event=stats-13501-7300-9-Finished';
const pages = { [path]: 'live/in-progress.html', [finishedPath]: 'live/finished.html' };
const board = { html: fixture('live/in-progress.html') };

let send: (u: LiveUpdate) => void;
const unfollow = jest.fn();
const follow = jest.fn<() => void, Parameters<FollowPage>>((_path, onUpdate) => {
  send = onUpdate;
  return unfollow;
});

async function open(at = path) {
  jest.mocked(useLocalSearchParams).mockReturnValue({ path: at });
  await render(withPages(<Live />, pages, follow));
  await screen.findByText('Women 3m Championship (6 Dives)').catch(() => screen.findByText('Women Platform (5 Dives)'));
}

beforeEach(async () => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
  await AsyncStorage.clear();
  await AsyncStorage.setItem('follows', JSON.stringify([{ diverNumber: 5, name: 'Diver 5' }]));
});

test('shows the board, who is up next and how close my diver is', async () => {
  await open();
  expect(screen.getByText('Round 6 of 6')).toBeTruthy();
  expect(screen.getByText('Up next: Diver 2')).toBeTruthy();
  expect(screen.getByLabelText('Open Diver 5')).toBeTruthy();
  expect(screen.getByText('1 diver before them')).toBeTruthy();
  expect(screen.getByText(/Place 3/)).toBeTruthy();
  expect(screen.getByText('Still to dive this round')).toBeTruthy();
  expect(screen.getByText('Standings')).toBeTruthy();
});

test('Follow live follows the board, and Stop following live stops it', async () => {
  await open();
  await fireEvent.press(screen.getByLabelText('Follow live'));
  expect(follow).toHaveBeenCalledWith(path, expect.any(Function));
  await act(async () => send(board));
  await fireEvent.press(screen.getByLabelText('Stop following live'));
  expect(unfollow).toHaveBeenCalled();
  expect(screen.getByLabelText('Follow live')).toBeTruthy();
});

test('chooses how many divers away the alert comes', async () => {
  await open();
  for (const n of [1, 2, 3, 4, 5]) {
    expect(screen.getByLabelText(`Alert me ${n} diver${n === 1 ? '' : 's'} away`)).toBeTruthy();
  }
  await fireEvent.press(screen.getByLabelText('Alert me 2 divers away'));
  expect(await AsyncStorage.getItem('alertAway')).toBe('2');
});

test('follows live without alerts when the phone says no to notifications', async () => {
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.spyOn(Platform, 'Version', 'get').mockReturnValue(34);
  jest.spyOn(PermissionsAndroid, 'request').mockResolvedValue('denied');
  await open();
  await fireEvent.press(screen.getByLabelText('Follow live'));
  expect(PermissionsAndroid.request).toHaveBeenCalledWith(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  expect(follow).toHaveBeenCalledWith(path, expect.any(Function));
  expect(
    screen.getByText("Alerts are off. Turn on notifications for DiveData in your phone's settings."),
  ).toBeTruthy();
});

test('says it is trying again when DiveMeets does not answer while following', async () => {
  await open();
  await fireEvent.press(screen.getByLabelText('Follow live'));
  await act(async () => send(board));
  await act(async () => send({ error: new NotReachedError('no answer') }));
  expect(screen.getByText("Couldn't reach DiveMeets. Trying again.")).toBeTruthy();
  expect(screen.getByText('Up next: Diver 2')).toBeTruthy();
});

test("opens DiveMeets' check on screen, then carries on following", async () => {
  await open();
  await fireEvent.press(screen.getByLabelText('Follow live'));
  await act(async () => send({ error: new CheckNeededError('check') }));
  await fireEvent.press(screen.getByLabelText("Open DiveMeets' check"));
  await screen.findByLabelText('Stop following live');
  expect(follow).toHaveBeenCalledTimes(2);
  expect(follow).toHaveBeenLastCalledWith(path, expect.any(Function));
});

test('a finished event says so and has nothing to follow', async () => {
  await open(finishedPath);
  expect(screen.getByText('This event is over.')).toBeTruthy();
  expect(screen.queryByLabelText('Follow live')).toBeNull();
});
