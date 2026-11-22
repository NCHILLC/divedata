import { isBotCheck, pageUrl, readPageScript, readyWhen } from '../page';

test('pageUrl puts a DiveMeets page name on the DiveMeets address', () => {
  expect(pageUrl('profile.php?number=1')).toBe('https://secure.meetcontrol.com/divemeets/system/profile.php?number=1');
});

test('pageUrl refuses anything that is not a DiveMeets page name', () => {
  for (const path of ['https://example.com/x.php', '../x.php', '//evil.com/a.php', 'index.html']) {
    expect(() => pageUrl(path)).toThrow();
  }
});

test('isBotCheck spots the Cloudflare check and passes real pages', () => {
  expect(isBotCheck({ title: 'Just a moment...', html: '' })).toBe(true);
  expect(isBotCheck({ title: 'x', html: '<h1>Performing security verification</h1>' })).toBe(true);
  expect(isBotCheck({ title: 'x', html: '<p>Please verify you are human</p>' })).toBe(true);
  expect(isBotCheck({ title: 'DiveMeets', html: '<td>Round 1</td>' })).toBe(false);
});

/** Runs the reading script against a fake page; returns what it sent back to the app. */
function runReadScript(script: string, page: { title: string; ready: () => boolean }) {
  const sent: { title: string; html: string }[] = [];
  const document = {
    get title() {
      return page.title;
    },
    querySelector: (sel: string) => (sel === '#Results table' && page.ready() ? {} : null),
    documentElement: {
      get outerHTML() {
        return page.ready() ? '<table>filled</table>' : '<div id="Results"></div>';
      },
    },
  };
  const window = { ReactNativeWebView: { postMessage: (s: string) => sent.push(JSON.parse(s)) } };
  new Function('window', 'document', 'setTimeout', script)(window, document, setTimeout);
  return sent;
}

describe('readPageScript', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('sends an ordinary page as soon as it has loaded', () => {
    const sent = runReadScript(readPageScript(readyWhen('meetresultsext.php?meetnum=1')), { title: 'DiveMeets', ready: () => false });
    expect(sent).toHaveLength(1);
  });

  test('waits for the live board to fill its table before sending it', () => {
    let filled = false;
    const sent = runReadScript(readPageScript(readyWhen('livestats.php?event=stats-1-2-9-Started')), {
      title: 'MeetControl',
      ready: () => filled,
    });
    jest.advanceTimersByTime(2000);
    expect(sent).toHaveLength(0);
    filled = true;
    jest.advanceTimersByTime(500);
    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain('filled');
  });

  test('sends the board anyway after 10 seconds without a table', () => {
    const sent = runReadScript(readPageScript(readyWhen('livestats.php?event=x')), { title: 'MeetControl', ready: () => false });
    jest.advanceTimersByTime(9000);
    expect(sent).toHaveLength(0);
    jest.advanceTimersByTime(1500);
    expect(sent).toHaveLength(1);
  });

  test('sends the check at once, so the person sees it without waiting', () => {
    const sent = runReadScript(readPageScript(readyWhen('livestats.php?event=x')), { title: 'Just a moment...', ready: () => false });
    expect(sent).toHaveLength(1);
  });
});
