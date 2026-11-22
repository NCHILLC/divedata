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

test('shows the events running now and opens a live board', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ meetNumber: '13172' });
  await render(withPages(<Meet />, pages));
  expect(await screen.findByText('Live now')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Open live board, Women 3m Championship (6 Dives), Final'));
  expect(router.push).toHaveBeenCalledWith({
    pathname: '/live',
    params: { path: 'livestats.php?event=stats-13172-7160-9-Started' },
  });
});

test('shows no live boards once a meet is over', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ meetNumber: '13501' });
  await render(withPages(<Meet />, pages));
  expect(await screen.findByText('2026 Phil Hansel Invitational @Houston')).toBeTruthy();
  expect(screen.queryByText('Live now')).toBeNull();
});
