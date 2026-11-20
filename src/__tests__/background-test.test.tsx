import { fireEvent, render, screen } from '@testing-library/react-native';
import BackgroundTest from '../app/background-test';
import BackgroundTestModule from '../../modules/background-test';

jest.mock('react-native-webview', () => {
  // jest.mock factories cannot use imports from the top of the file.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { View } = require('react-native');
  const WebView = React.forwardRef(function MockWebView(_props: object, ref: unknown) {
    React.useImperativeHandle(ref, () => ({ reload: jest.fn(), injectJavaScript: jest.fn() }));
    return <View testID="webview" />;
  });
  return { __esModule: true, WebView, default: WebView };
});

jest.mock('../../modules/background-test', () => ({
  __esModule: true,
  default: {
    start: jest.fn(),
    stop: jest.fn(),
    isRunning: jest.fn(() => false),
    appendLog: jest.fn(),
    readLog: jest.fn(async () => ''),
    clearLog: jest.fn(),
    notify: jest.fn(),
    phoneState: jest.fn(() => ({ batteryOptimized: true, powerSave: false, alertsOn: true })),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

const mocked = jest.mocked(BackgroundTestModule);

function cleanLog(): string {
  const t0 = 1_700_000_000_000;
  const lines: object[] = [
    { kind: 'start', at: t0, url: 'https://x', alertsOn: true, batteryOptimized: true, powerSave: false },
  ];
  for (let seq = 1; seq <= 60; seq++) {
    const at = t0 + seq * 30_000;
    lines.push({ kind: 'tick', seq, nativeAt: at });
    lines.push({ kind: 'read', seq, startedAt: at + 5, endedAt: at + 800, result: 'page', fingerprint: 'a' });
  }
  lines.push({ kind: 'stop', at: t0 + 1_801_000, reason: 'done' });
  return lines.map((l) => JSON.stringify(l)).join('\n');
}

beforeEach(() => jest.clearAllMocks());

test('Start test waits until a page is chosen', async () => {
  await render(<BackgroundTest />);
  expect(await screen.findByText('Background test')).toBeTruthy();
  const start = screen.getByLabelText('Start test');
  expect(start.props.accessibilityState?.disabled).toBe(true);
  await fireEvent.press(screen.getByLabelText('Use this page'));
  expect(screen.getByLabelText('Start test').props.accessibilityState?.disabled).toBe(false);
});

test('a finished clean run shows Passed', async () => {
  mocked.readLog.mockResolvedValueOnce(cleanLog());
  await render(<BackgroundTest />);
  expect(await screen.findByText('Passed')).toBeTruthy();
  expect(screen.getByText(/60 of 60 reads came back/)).toBeTruthy();
});
