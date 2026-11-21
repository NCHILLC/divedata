import { checked, cleanText, load, numberFromHref, PageChangedError, toNumber } from './common';
import { type JudgeScores, JudgeScoresSchema } from './types';

/** The text after a "Label:" row, e.g. the bold part of "Dive: <strong>...</strong>". */
function labelled(root: ReturnType<typeof load>, label: string): string | undefined {
  const td = root
    .querySelectorAll('td[colspan="3"]')
    .find((t) => cleanText(t).startsWith(`${label}:`) && t.querySelector('strong'));
  return td ? cleanText(td.querySelector('strong')) : undefined;
}

/**
 * Judge scores page for one dive: meet, event title, "Diver:", "Dive: description (board)", then a table
 * Judge Number | Judge | Net Score with one row per judge and a Total row. Judge names are anonymised and never read.
 */
export function parseJudgeScores(html: string): JudgeScores {
  const root = load(html);
  const title = root.querySelector('strong[style*="font-size:14px"]');
  const dive = labelled(root, 'Dive');
  const rows = root.querySelectorAll('tr').map((tr) => tr.querySelectorAll('td'));
  const awardRows = rows.filter((c) => c.length === 3 && c[1].querySelector('a[href*="profilej.php"]'));
  const totalRow = rows.find((c) => c.length === 2 && cleanText(c[0]) === 'Total');
  if (!title || dive === undefined || !totalRow) throw new PageChangedError('judge-scores', 'title, dive or total not found');

  // "Forward 2 1/2 Somersault Pike (3 Meter)": the board is the last bracket.
  const m = /^(.*?)\s*\(([^()]+)\)$/.exec(dive);
  const diver = labelled(root, 'Diver')?.split(' - ')[0].trim();
  const order = root.querySelector('a[href*="judgesscoresext.php?"][href*="divord="]');

  return checked('judge-scores', JudgeScoresSchema, {
    eventName: cleanText(title),
    ...(diver ? { diverName: diver } : {}),
    description: m ? m[1] : dive,
    ...(m ? { height: m[2] } : {}),
    ...(order ? { diveOrder: numberFromHref(order.getAttribute('href'), 'divord') } : {}),
    awards: awardRows.map((c) => toNumber(cleanText(c[2]))),
    total: toNumber(cleanText(totalRow[1])),
  });
}
