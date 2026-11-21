import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import Home from '../app/index';
import { parseMeetList } from '../divemeets/parsers';
import { fixture, withPages } from './fixtures';

jest.mock('expo-router', () => ({ router: { push: jest.fn() }, Stack: { Screen: () => null } }));

const pages = { 'index.php': 'meet-list/upcoming.html', 'profile.php?number=1': 'diver-profile/adult.html' };
const meets = parseMeetList(fixture('meet-list/upcoming.html'));

beforeEach(async () => {
  jest.clearAllMocks();
  await AsyncStorage.clear();
});

test('lists the meets on DiveMeets and finds one by name', async () => {
  await render(withPages(<Home />, pages));
  expect(await screen.findByText(meets[1].name)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Find a meet'), 'phil HANSEL');
  expect(screen.queryByText(meets[1].name)).toBeNull();
  await fireEvent.press(screen.getByLabelText(`Open ${meets[0].name}`));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/meet/[meetNumber]', params: { meetNumber: '13501' } });
});

test('a meet number or pasted DiveMeets link opens that meet', async () => {
  await render(withPages(<Home />, pages));
  await fireEvent.changeText(
    screen.getByLabelText('Find a meet'),
    'https://secure.meetcontrol.com/divemeets/system/meetresultsext.php?meetnum=12275',
  );
  await fireEvent.press(screen.getByLabelText('Open meet 12275'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/meet/[meetNumber]', params: { meetNumber: '12275' } });
});

test('says how to follow a diver when none is followed yet', async () => {
  await render(withPages(<Home />, pages));
  expect(await screen.findByText('Open a diver from any results list and tap Follow.')).toBeTruthy();
});

test('shows each followed diver with their latest result', async () => {
  await AsyncStorage.setItem('follows', JSON.stringify([{ diverNumber: 1, name: 'Diver 1' }]));
  await render(withPages(<Home />, pages));
  expect(await screen.findByText('Place 1 · Total 295.50')).toBeTruthy();
  expect(screen.getByText('University of Texas Diving Invitational')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Open Diver 1'));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/diver/[diverNumber]', params: { diverNumber: '1' } });
});

test('says so plainly when DiveMeets cannot be reached', async () => {
  await render(withPages(<Home />, {}));
  expect(await screen.findByText("Couldn't reach DiveMeets. Check your connection, then try again.")).toBeTruthy();
  expect(screen.getByLabelText('Try again')).toBeTruthy();
});
