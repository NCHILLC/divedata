import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Diver from '../app/diver/[diverNumber]';
import { withPages } from './fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

const pages = { 'profile.php?number=1': 'diver-profile/adult.html' };

beforeEach(async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ diverNumber: '1' });
  await AsyncStorage.clear();
});

test('shows the diver with their meets and results, and opens an event', async () => {
  await render(withPages(<Diver />, pages));
  expect(await screen.findByText('Diver 1')).toBeTruthy();
  expect(screen.getAllByText('University of Texas Diving Invitational').length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByLabelText('Women 1m Championship (5 Dives) - (Prelim/Quarterfinal), place 1, total 231.75. Open the dives'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/dives',
    params: { path: 'divesheetresultsext.php?meetnum=13353&eventnum=7143&dvrnum=1&eventtype=1&sts=1794363265' },
  });
});

test('Follow keeps the diver on the phone, and Stop following removes them', async () => {
  await render(withPages(<Diver />, pages));
  await fireEvent.press(await screen.findByLabelText('Follow Diver 1'));
  expect(JSON.parse((await AsyncStorage.getItem('follows')) ?? '[]')).toEqual([{ diverNumber: 1, name: 'Diver 1' }]);
  await fireEvent.press(screen.getByLabelText('Stop following Diver 1'));
  expect(JSON.parse((await AsyncStorage.getItem('follows')) ?? '[]')).toEqual([]);
});
