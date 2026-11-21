import { parseMeetLink } from '../meet-link';

describe('parseMeetLink', () => {
  it('reads a meet number typed on its own', () => {
    expect(parseMeetLink(' 13501 ')).toBe(13501);
  });
  it('reads the meet number in a pasted DiveMeets link', () => {
    expect(parseMeetLink('https://secure.meetcontrol.com/divemeets/system/meetinfoext.php?meetnum=13501')).toBe(13501);
    expect(
      parseMeetLink('https://secure.meetcontrol.com/divemeets/system/eventresultsext.php?eventnum=2&meetnum=12275&eventtype=9'),
    ).toBe(12275);
  });
  it('gives nothing for text that is not a meet number or a DiveMeets link', () => {
    for (const text of ['', 'Houston', '0', 'https://example.com/x.php?meetnum=13501', '13501abc']) {
      expect(parseMeetLink(text)).toBeUndefined();
    }
  });
});
