import AsyncStorage from '@react-native-async-storage/async-storage';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Event from '../app/event';
import { withPages } from './fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

const path = 'eventresultsext.php?meetnum=13501&eventnum=7160&eventtype=9';

beforeEach(() => jest.mocked(useLocalSearchParams).mockReturnValue({ path }));

test('shows each diver with place, team and total, and opens their dives', async () => {
  await render(withPages(<Event />, { [path]: 'event-results/final.html' }));
  expect(await screen.findByText('Women 3m Championship (6 Dives)')).toBeTruthy();
  expect(screen.getAllByText('AFA').length).toBeGreaterThan(0);
  expect(screen.getByText('321.55')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Diver 1, place 1, total 321.55. Open their dives'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/dives',
    params: { path: 'divesheetresultsext.php?meetnum=13501&eventnum=7160&dvrnum=1&eventtype=9&sts=1794531690' },
  });
});

test('marks a followed diver as My diver', async () => {
  await AsyncStorage.setItem('follows', JSON.stringify([{ diverNumber: 1, name: 'Diver 1' }]));
  await render(withPages(<Event />, { [path]: 'event-results/final.html' }));
  expect(await screen.findByText('My diver')).toBeTruthy();
  expect(screen.getByLabelText('My diver: Diver 1, place 1, total 321.55. Open their dives')).toBeTruthy();
});

test('names the stage of a prelim', async () => {
  await render(withPages(<Event />, { [path]: 'event-results/prelim.html' }));
  expect(await screen.findByText('Prelim/Quarterfinal')).toBeTruthy();
});
