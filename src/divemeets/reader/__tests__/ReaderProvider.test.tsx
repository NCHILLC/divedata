import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';
import { useContext } from 'react';
import { PageSourceContext, type LoadPage } from '../../source';
import { ReaderProvider } from '../ReaderProvider';

type WebProps = {
  source: { uri: string };
  onLoadEnd: () => void;
  onMessage: (e: { nativeEvent: { data: string } }) => void;
  onHttpError: (e: { nativeEvent: { statusCode: number } }) => void;
};
const mockWeb: { props?: WebProps; inject: jest.Mock } = { inject: jest.fn() };

jest.mock('react-native-webview', () => {
  // jest.mock factories cannot use imports from the top of the file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const WebView = React.forwardRef(function MockWebView(props: WebProps, ref: unknown) {
    mockWeb.props = props;
    React.useImperativeHandle(ref, () => ({ injectJavaScript: mockWeb.inject }));
    return <View testID="webview" />;
  });
  return { __esModule: true, WebView, default: WebView };
});

let load: LoadPage;

async function page(title: string, html: string) {
  await act(async () => {
    mockWeb.props!.onLoadEnd();
    mockWeb.props!.onMessage({ nativeEvent: { data: JSON.stringify({ title, html }) } });
  });
}

beforeEach(async () => {
  mockWeb.props = undefined;
  mockWeb.inject.mockClear();
  const { result } = await renderHook(() => useContext(PageSourceContext), { wrapper: ReaderProvider });
  load = result.current!;
});

test('loads a DiveMeets page in the hidden browser and hands back its HTML', async () => {
  let html: string | undefined;
  await act(async () => void load('index.php').then((h) => (html = h)));
  expect(mockWeb.props?.source.uri).toBe('https://secure.meetcontrol.com/divemeets/system/index.php');
  await page('DiveMeets', '<html>meets</html>');
  expect(mockWeb.inject).toHaveBeenCalled();
  expect(html).toBe('<html>meets</html>');
});

test('shows the DiveMeets check to the person and carries on once they pass it', async () => {
  let html: string | undefined;
  await act(async () => void load('index.php').then((h) => (html = h)));
  await act(async () => mockWeb.props!.onHttpError({ nativeEvent: { statusCode: 403 } }));
  await page('Just a moment...', '<html>check</html>');
  expect(screen.getByText("DiveMeets wants to check you're a person. Finish the check below.")).toBeTruthy();
  expect(html).toBeUndefined();

  await page('DiveMeets', '<html>meets</html>');
  expect(html).toBe('<html>meets</html>');
  expect(screen.queryByText(/wants to check/)).toBeNull();
});

test('Not now closes the check and the page fails with a plain reason', async () => {
  let error: Error | undefined;
  await act(async () => void load('index.php').catch((e: Error) => (error = e)));
  await page('Just a moment...', '<html>check</html>');
  await fireEvent.press(screen.getByLabelText('Not now'));
  expect(error?.name).toBe('CheckNeededError');
  expect(screen.queryByText(/wants to check/)).toBeNull();
});

test('a page DiveMeets refuses without a check fails', async () => {
  let error: Error | undefined;
  await act(async () => void load('profile.php?number=9').catch((e: Error) => (error = e)));
  await act(async () => mockWeb.props!.onHttpError({ nativeEvent: { statusCode: 500 } }));
  await page('Error', '<html>oops</html>');
  expect(error?.name).toBe('NotReachedError');
});
