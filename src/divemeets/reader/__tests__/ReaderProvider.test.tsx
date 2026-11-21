import { act, fireEvent, renderHook, screen } from '@testing-library/react-native';
import { useContext } from 'react';
import { LiveSourceContext, PageSourceContext, type LoadPage } from '../../source';
import { ReaderProvider } from '../ReaderProvider';

type WebProps = {
  source: { uri: string; headers?: Record<string, string> };
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

const HOME = 'https://secure.meetcontrol.com/divemeets/system/index.php';

test('sends the DiveMeets page it loaded last as the Referer, as a browser does when you tap a link', async () => {
  await act(async () => void load('index.php'));
  expect(mockWeb.props?.source.headers).toBeUndefined(); // the first page comes from nowhere
  await page('DiveMeets', '<html>meets</html>');
  await act(async () => void load('meetresultsext.php?meetnum=1'));
  expect(mockWeb.props?.source.headers).toEqual({ Referer: HOME });
});

test('a page DiveMeets refuses offers the page the link came from, to open in the browser', async () => {
  let error: (Error & { url?: string }) | undefined;
  await act(async () => void load('index.php'));
  await page('DiveMeets', '<html>meets</html>');
  await act(async () => void load('eventresultsext.php?meetnum=1').catch((e: Error) => (error = e)));
  await act(async () => mockWeb.props!.onHttpError({ nativeEvent: { statusCode: 403 } }));
  await page('Webpage not available', '<html></html>');
  expect(error?.name).toBe('RefusedError');
  expect(error?.url).toBe(HOME);
});

test('gives screens live mode too, which says so where the Android module is missing', async () => {
  const { result } = await renderHook(() => useContext(LiveSourceContext), { wrapper: ReaderProvider });
  const updates: { html?: string; error?: Error }[] = [];
  result.current!('index.php', (u) => updates.push(u));
  expect(updates[0].error?.message).toBe('Live mode needs the Android app');
});
