import { isBotCheck, pageUrl } from '../page';

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
