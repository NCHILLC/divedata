import { fireEvent, render, screen } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Dives from '../app/dives';
import { withPages } from './fixtures';

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: jest.fn(),
  Stack: { Screen: () => null },
}));

const path = 'divesheetresultsext.php?meetnum=13501&eventnum=7160&dvrnum=1&eventtype=9&sts=1794531690';

test('shows every dive round by round and the total', async () => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ path });
  await render(withPages(<Dives />, { [path]: 'dive-sheet/final.html' }));
  expect(await screen.findByText('Women 3m Championship (6 Dives)')).toBeTruthy();
  expect(screen.getByText('Round 1 · 105B · 3 m')).toBeTruthy();
  expect(screen.getByText('Forward 2 1/2 Somersault Pike')).toBeTruthy();
  expect(screen.getByText('DD 2.4 · Place 1')).toBeTruthy();
  expect(screen.getByText('50.40')).toBeTruthy();
  expect(screen.getByText('Total 321.55')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText("Open Diver 1's page"));
  expect(router.push).toHaveBeenCalledWith({ pathname: '/diver/[diverNumber]', params: { diverNumber: '1' } });
});
