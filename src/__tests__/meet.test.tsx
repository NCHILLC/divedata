import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Meet from '../app/meet/[meetNumber]';
import { withPages } from './fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

const pages = {
  'meetresultsext.php?meetnum=13501': 'meet-results/finished.html',
  'meetresultsext.php?meetnum=13172': 'meet-results/in-progress.html',
};

test('lists the events with results and opens one', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ meetNumber: '13501' });
  await render(withPages(<Meet />, pages));
  expect(await screen.findByText('2026 Phil Hansel Invitational @Houston')).toBeTruthy();
  expect(screen.getAllByText('Women 1m Championship (6 Dives)')).toHaveLength(2);
  await fireEvent.press(screen.getByLabelText('Open Women Team Event, Final'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/event',
    params: { path: 'eventresultsext.php?meetnum=13501&eventnum=7345&eventtype=9' },
  });
});

test('says when a meet has no results yet', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ meetNumber: '13172' });
  await render(withPages(<Meet />, pages));
  expect(await screen.findByText('No results yet. Check back once the meet starts.')).toBeTruthy();
});
