import { diveScore, keptAwards, runningTotals } from '../../../scoring';
import { PageChangedError } from '../common';
import { parseDiveSheet } from '../dive-sheet';
import { parseJudgeScores } from '../judge-scores';
import { fixture } from './fixtures';

const sum = (xs: number[]) => xs.reduce((a, b) => a + Math.round(b * 100), 0) / 100;

describe('parseDiveSheet', () => {
  const sheet = parseDiveSheet(fixture('dive-sheet/final.html'));

  it('reads the diver, event and dives', () => {
    expect(sheet.diver).toEqual({ diverNumber: 1, name: 'Diver 1' });
    expect(sheet.eventName).toBe('Women 3m Championship (6 Dives)');
    expect(sheet.dives).toHaveLength(6);
    expect(sheet.dives[0]).toEqual({
      round: 1,
      diveNumber: '105B',
      height: '3M',
      description: 'Forward 2 1/2 Somersault Pike',
      net: 21,
      dd: 2.4,
      score: 50.4,
      roundPlace: 1,
      judgeScoresPath: 'judgesscoresext.php?meetnum=13501&eventnum=7160&dvrnum=1&divord=1&eventtype=9&synchdvrnum=&sts=1794531690',
    });
    expect(sheet.total).toBe(321.55);
  });

  it('every dive links to its judge scores', () => {
    for (const d of sheet.dives) expect(d.judgeScoresPath).toMatch(/^judgesscoresext\.php\?.*divord=\d+/);
  });

  it('published score equals net x DD for every dive', () => {
    // Whole-number maths (net in cents, DD in tenths) so there is no float noise; exact equality.
    for (const d of sheet.dives) {
      expect((Math.round(d.net * 100) * Math.round(d.dd * 10)) / 1000).toBe(d.score);
    }
  });

  it('running totals end at the published total', () => {
    const totals = runningTotals(sheet.dives.map((d) => d.score));
    expect(totals[totals.length - 1]).toBe(sheet.total);
    expect(sum(sheet.dives.map((d) => d.net))).toBe(114.5);
  });

  it('keeps a failed dive: net and score 0', () => {
    const html = fixture('dive-sheet/final.html')
      .replace('<td valign="top">21.00</td><td valign="top">2.40</td>', '<td valign="top">0.00</td><td valign="top">2.40</td>')
      .replace('>50.40<', '>0.00<');
    const s = parseDiveSheet(html);
    expect(s.dives[0]).toMatchObject({ net: 0, dd: 2.4, score: 0 });
    expect(s.dives).toHaveLength(6);
  });

  it('skips later rounds that are still blank (unfinished event)', () => {
    let html = fixture('dive-sheet/final.html');
    // Blank the net, DD, score and place of dives 4 to 6 (their number and description stay, as DiveMeets lists the list).
    for (const [net, dd, score, place] of [
      ['19.00', '2.80', '53.20', '2'],
      ['16.50', '2.90', '47.85', '3'],
      ['21.00', '3.00', '63.00', '1'],
    ]) {
      html = html
        .replace(`<td valign="top">${net}</td><td valign="top">${dd}</td>`, '<td valign="top">&nbsp;</td><td valign="top">&nbsp;</td>')
        .replace(new RegExp(`(<td valign="top">&nbsp;</td><td valign="top">&nbsp;</td><td valign="top">)<a [^>]*>${score}</a>(</td><td align="right" valign="top">)${place}`), '$1&nbsp;$2&nbsp;');
    }
    html = html.replace('<td valign="bottom">114.50</td><td valign="bottom">16.9</td><td valign="bottom">321.55</td>', '<td valign="bottom"></td><td valign="bottom"></td><td valign="bottom"></td>');
    const s = parseDiveSheet(html);
    expect(s.dives.map((d) => d.diveNumber)).toEqual(['105B', '5152B', '205C']);
    expect(s.total).toBeUndefined();
  });

  it('throws PageChangedError on garbage in a score cell', () => {
    const html = fixture('dive-sheet/final.html').replace('>50.40<', '>abc<');
    expect(() => parseDiveSheet(html)).toThrow(expect.objectContaining({ page: 'dive-sheet', name: 'PageChangedError' }));
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseDiveSheet(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'dive-sheet' }));
  });
});

describe('parseJudgeScores', () => {
  it('five judges: dive 1 of the dive sheet, cross-checked', () => {
    const j = parseJudgeScores(fixture('judge-scores/five-judges.html'));
    const sheet = parseDiveSheet(fixture('dive-sheet/final.html'));
    expect(j.eventName).toBe('Women 3m Championship (6 Dives)');
    expect(j.diverName).toBe('Diver 1');
    expect(j.description).toBe('Forward 2 1/2 Somersault Pike');
    expect(j.height).toBe('3 Meter');
    expect(j.diveOrder).toBe(1);
    expect(j.awards).toEqual([7, 7, 6.5, 7, 7]);
    // The page's Total is the kept awards (the high and low are dropped), not all five.
    expect(sum(keptAwards(j.awards) ?? [])).toBe(j.total);
    expect(j.total).toBe(21);
    const first = sheet.dives[0];
    expect(first.judgeScoresPath).toContain('divord=1');
    expect(first.description).toBe(j.description);
    expect(first.net).toBe(j.total);
    expect(diveScore(j.awards, first.dd)).toBe(first.score);
  });

  it('seven judges: kept awards equal the page total (a different meet, so no dive sheet to cross-check)', () => {
    const j = parseJudgeScores(fixture('judge-scores/seven-judges.html'));
    expect(j.awards).toHaveLength(7);
    expect(j.awards).toEqual([6.5, 7, 7.5, 7, 6.5, 7, 7]);
    expect(sum(keptAwards(j.awards) ?? [])).toBe(j.total);
    expect(j.eventName).toBe('Senior Women 1m');
  });

  it('keeps a failed dive: all awards 0', () => {
    const html = fixture('judge-scores/five-judges.html')
      .replace(/(color:[a-z0-9]+">)\d\.\d\d(<\/td><\/tr>)/g, '$10.00$2')
      .replace('<td>21.00</td>', '<td>0.00</td>');
    const j = parseJudgeScores(html);
    expect(j.awards).toEqual([0, 0, 0, 0, 0]);
    expect(j.total).toBe(0);
  });

  it('never reads judge names', () => {
    const j = parseJudgeScores(fixture('judge-scores/five-judges.html'));
    expect(JSON.stringify(j)).not.toContain('Judge');
  });

  it('throws PageChangedError on a non-number award', () => {
    const html = fixture('judge-scores/five-judges.html').replace('>6.50<', '>abc<');
    expect(() => parseJudgeScores(html)).toThrow(expect.objectContaining({ page: 'judge-scores', name: 'PageChangedError' }));
  });

  it('throws PageChangedError on a different page', () => {
    const run = () => parseJudgeScores(fixture('meet-list/past.html'));
    expect(run).toThrow(PageChangedError);
    expect(run).toThrow(expect.objectContaining({ page: 'judge-scores' }));
  });
});
