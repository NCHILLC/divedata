import { cleanText, load } from '../common';

describe('cleanText', () => {
  it('decodes entities, turns nbsp into spaces and trims', () => {
    const el = load('<p>&nbsp;&nbsp;Tom &amp;&nbsp;Jerry\n  &lt;3 </p>').querySelector('p');
    expect(cleanText(el)).toBe('Tom & Jerry <3');
  });
  it('gives an empty string for a missing element', () => {
    expect(cleanText(undefined)).toBe('');
  });
});
