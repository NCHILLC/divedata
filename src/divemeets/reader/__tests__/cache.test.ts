import { createPageCache } from '../cache';

function setup() {
  let now = 0;
  const fetchPage = jest.fn(async (path: string) => `<html>${path} at ${now}</html>`);
  const load = createPageCache(fetchPage, { now: () => now, freshMs: 60_000 });
  return { load, fetchPage, tick: (ms: number) => (now += ms) };
}

test('serves a page from the cache for a minute, then loads it again', async () => {
  const { load, fetchPage, tick } = setup();
  expect(await load('index.php')).toBe('<html>index.php at 0</html>');
  tick(59_000);
  expect(await load('index.php')).toBe('<html>index.php at 0</html>');
  expect(fetchPage).toHaveBeenCalledTimes(1);
  tick(1_000);
  expect(await load('index.php')).toBe('<html>index.php at 60000</html>');
  expect(fetchPage).toHaveBeenCalledTimes(2);
});

test('two screens asking for the same page at once share one load', async () => {
  const { load, fetchPage } = setup();
  const [a, b] = await Promise.all([load('index.php'), load('index.php')]);
  expect(a).toBe(b);
  expect(fetchPage).toHaveBeenCalledTimes(1);
});

test('a failed load is not kept, so trying again loads the page', async () => {
  const { load, fetchPage } = setup();
  fetchPage.mockRejectedValueOnce(new Error('offline'));
  await expect(load('index.php')).rejects.toThrow('offline');
  expect(await load('index.php')).toBe('<html>index.php at 0</html>');
  expect(fetchPage).toHaveBeenCalledTimes(2);
});
