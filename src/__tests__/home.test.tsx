import { render, screen } from '@testing-library/react-native';
import Home from '../app/index';

test('home screen names the app and says what to do first', async () => {
  await render(<Home />);
  expect(screen.getByText('DiveData')).toBeTruthy();
  expect(screen.getByText('Find a meet to get started.')).toBeTruthy();
});
