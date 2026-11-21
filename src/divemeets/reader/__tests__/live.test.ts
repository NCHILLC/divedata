import { createLive, type LiveNative } from '../live';

function fakeNative() {
  const listeners = new Map<string, (e: never) => void>();
  const native = {
    start: jest.fn(),
    reload: jest.fn(),
    stop: jest.fn(),
    addListener: jest.fn((event: string, fn: (e: never) => void) => {
      listeners.set(event, fn);
      return { remove: () => listeners.delete(event) };
    }),
  };
  const emit = (event: string, payload: object = {}) => listeners.get(event)?.(payload as never);
  return { native: native as LiveNative & typeof native, emit, listeners };
}

const page = (html: string, title = 'DiveMeets', status = 200) => ({ title, html, status });

test('follows a page through the service browser every 30 seconds', () => {
  const { native, emit } = fakeNative();
  const updates: unknown[] = [];
  createLive(native)('eventresultsext.php?eventnum=1', (u) => updates.push(u));
  expect(native.start).toHaveBeenCalledWith(
    'https://secure.meetcontrol.com/divemeets/system/eventresultsext.php?eventnum=1',
    30,
    '',
  );

  emit('onPage', page('<html>round 1</html>'));
  emit('onTick');
  expect(native.reload).toHaveBeenCalledTimes(1);
  emit('onPage', page('<html>round 2</html>'));
  expect(updates).toEqual([{ html: '<html>round 1</html>' }, { html: '<html>round 2</html>' }]);
});

test('stops reloading while DiveMeets shows its check, and carries on if the check clears', () => {
  const { native, emit } = fakeNative();
  const updates: { html?: string; error?: Error }[] = [];
  createLive(native)('index.php', (u) => updates.push(u));

  emit('onPage', page('<html>check</html>', 'Just a moment...', 403));
  expect(updates[0].error?.name).toBe('CheckNeededError');
  emit('onTick');
  expect(native.reload).not.toHaveBeenCalled();

  emit('onPage', page('<html>meets</html>'));
  expect(updates[1]).toEqual({ html: '<html>meets</html>' });
  emit('onTick');
  expect(native.reload).toHaveBeenCalledTimes(1);
});

test('reports refused pages, lost connections and pages that never come back', () => {
  const { native, emit } = fakeNative();
  const errors: string[] = [];
  createLive(native)('index.php', (u) => 'error' in u && errors.push(u.error.message));

  emit('onPage', page('<html>oops</html>', 'Error', 500));
  emit('onTick');
  emit('onFailed', { reason: 'net::ERR_INTERNET_DISCONNECTED' });
  emit('onTick');
  emit('onTick'); // nothing came back since the last reload
  expect(errors).toEqual(['DiveMeets answered 500', 'No connection to DiveMeets', 'DiveMeets did not answer']);
  expect(native.reload).toHaveBeenCalledTimes(3);
});

test('sends the page the link came from as the Referer, and says when DiveMeets refuses the page', () => {
  const { native, emit } = fakeNative();
  const meet = 'https://secure.meetcontrol.com/divemeets/system/meetresultsext.php?meetnum=1';
  const errors: Error[] = [];
  createLive(native, () => meet)('eventresultsext.php?eventnum=1', (u) => 'error' in u && errors.push(u.error));
  expect(native.start).toHaveBeenCalledWith(expect.any(String), 30, meet);

  emit('onPage', page('', 'Webpage not available', 403));
  expect(errors[0].name).toBe('RefusedError');
  expect((errors[0] as Error & { url: string }).url).toBe(meet);
});

test('the person stopping it from the notification ends the follow', () => {
  const { native, emit, listeners } = fakeNative();
  const updates: { html?: string; error?: Error }[] = [];
  createLive(native)('index.php', (u) => updates.push(u));
  emit('onStopped');
  expect(updates[0].error?.name).toBe('LiveStoppedError');
  expect(listeners.size).toBe(0);
});

test('unfollowing stops the service; following a new page replaces the old one', () => {
  const { native, emit } = fakeNative();
  const follow = createLive(native);
  const first: unknown[] = [];
  const unfollowFirst = follow('index.php', (u) => first.push(u));
  const unfollowSecond = follow('profile.php?number=1', () => {});
  emit('onPage', page('<html>diver</html>'));
  expect(first).toEqual([]);

  unfollowFirst(); // already replaced, so it leaves the second follow alone
  expect(native.stop).not.toHaveBeenCalled();
  unfollowSecond();
  expect(native.stop).toHaveBeenCalledTimes(1);
});

test('says so when live mode cannot start', () => {
  const updates: { html?: string; error?: Error }[] = [];
  createLive(null)('index.php', (u) => updates.push(u));
  expect(updates[0].error?.name).toBe('NotReachedError');

  const { native } = fakeNative();
  native.start.mockImplementation(() => {
    throw new Error('ForegroundServiceStartNotAllowedException');
  });
  createLive(native)('index.php', (u) => updates.push(u));
  expect(updates[1].error?.name).toBe('NotReachedError');
});
