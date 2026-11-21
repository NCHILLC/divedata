import { boardHeight, cleanText, load, parsePlace } from '../common';

describe('boardHeight', () => {
  it('writes the dive sheet and judge page spellings the same way', () => {
    for (const text of ['3M', '3 Meter', '3 meters', '3m']) expect(boardHeight(text)).toBe('3 m');
    expect(boardHeight('7.5M')).toBe('7.5 m');
    expect(boardHeight('10 Meter')).toBe('10 m');
  });
  it('keeps anything else as written', () => {
    expect(boardHeight('Platform')).toBe('Platform');
  });
});

describe('cleanText', () => {
  it('decodes entities, turns nbsp into spaces and trims', () => {
    const el = load('<p>&nbsp;&nbsp;Tom &amp;&nbsp;Jerry\n  &lt;3 </p>').querySelector('p');
    expect(cleanText(el)).toBe('Tom & Jerry <3');
  });
  it('gives an empty string for a missing element', () => {
    expect(cleanText(undefined)).toBe('');
  });
});

describe('parsePlace', () => {
  it('reads blank as no place and not tied', () => {
    expect(parsePlace('')).toEqual({ tied: false });
  });
  it('reads a plain place', () => {
    expect(parsePlace('3')).toEqual({ place: 3, tied: false });
  });
  it('reads 3T, T-3 and T - 3 as a tied place 3', () => {
    for (const text of ['3T', 'T-3', 'T - 3', 't3']) expect(parsePlace(text)).toEqual({ place: 3, tied: true });
  });
  it('reads EXHB as exhibition with no place', () => {
    expect(parsePlace('EXHB')).toEqual({ tied: false, exhibition: true });
  });
  it('gives NaN for anything else', () => {
    for (const text of ['abc', '3X', '-3', '3.5', 'T']) expect(parsePlace(text).place).toBeNaN();
  });
});
