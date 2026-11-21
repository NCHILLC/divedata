import { z } from 'zod';

/** A diver as DiveMeets lists them: the number is in the profile link. */
export const DiverRefSchema = z.object({
  diverNumber: z.number().int().positive(),
  name: z.string().min(1),
});
export type DiverRef = z.infer<typeof DiverRefSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

/** One meet in a list. Dates are YYYY-MM-DD. */
export const MeetSummarySchema = z.object({
  meetNumber: z.number().int().positive(),
  name: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate,
  city: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
});
export type MeetSummary = z.infer<typeof MeetSummarySchema>;

/** One event in a meet. `eventNumber` is DiveMeets' own event id (the `eventnum` in its links), not the "Event 3" order. */
export const EventSummarySchema = z.object({
  eventNumber: z.number().int().positive(),
  /** Prelim, consolation and final share an `eventNumber`; the type (the `eventtype` in links) tells them apart. */
  eventType: z.number().int().positive(),
  name: z.string().min(1),
  date: isoDate.optional(),
  /** DiveMeets-relative link to the event's results, e.g. `eventresultsext.php?meetnum=1&eventnum=2&eventtype=9`. */
  resultsPath: z.string().min(1).optional(),
});
export type EventSummary = z.infer<typeof EventSummarySchema>;

export const MeetSchema = MeetSummarySchema.extend({ events: z.array(EventSummarySchema) });
export type Meet = z.infer<typeof MeetSchema>;

/** The meet results page: the meet and the events that have results posted. */
export const MeetResultsSchema = z.object({
  meetNumber: z.number().int().positive(),
  name: z.string().min(1),
  events: z.array(EventSummarySchema),
});
export type MeetResults = z.infer<typeof MeetResultsSchema>;

export const ResultRowSchema = z.object({
  /** Undefined only while DiveMeets shows a blank place (event not finished). */
  place: z.number().int().positive().optional(),
  tied: z.boolean(),
  diver: DiverRefSchema,
  team: z.string().min(1).optional(),
  /** Undefined only while DiveMeets shows a blank score. */
  total: z.number().optional(),
  /** DiveMeets-relative link to the diver's dive sheet for this event. */
  diveSheetPath: z.string().min(1).optional(),
});
export type ResultRow = z.infer<typeof ResultRowSchema>;

export const EventResultsSchema = z.object({
  meetNumber: z.number().int().positive(),
  eventName: z.string().min(1),
  stage: z.string().min(1).optional(),
  rows: z.array(ResultRowSchema),
});
export type EventResults = z.infer<typeof EventResultsSchema>;

export const DiveSchema = z.object({
  round: z.number().int().positive(),
  /** DiveMeets dive number with position letter, e.g. `5253B`. */
  diveNumber: z.string().min(1),
  /** Board, as the sheet writes it, e.g. `3M`. */
  height: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  /** The "Net Score" column: what the kept awards add up to. */
  net: z.number(),
  dd: z.number().positive(),
  /** Published dive score (net x DD). */
  score: z.number(),
  /** Place after this round; undefined while blank. */
  roundPlace: z.number().int().positive().optional(),
  /** DiveMeets-relative link to the judges' awards for this dive. */
  judgeScoresPath: z.string().min(1).optional(),
});
export type Dive = z.infer<typeof DiveSchema>;

export const DiveSheetSchema = z.object({
  diver: DiverRefSchema,
  eventName: z.string().min(1),
  /** Only dives that have a score; rounds not yet dived are left out. */
  dives: z.array(DiveSchema),
  /** Undefined while the Totals row is blank (event not finished). */
  total: z.number().optional(),
});
export type DiveSheet = z.infer<typeof DiveSheetSchema>;

/** One dive's awards page. Judge names are never read. */
export const JudgeScoresSchema = z.object({
  eventName: z.string().min(1),
  /** Plain text after "Diver:" up to the first " - " (the team follows); the page gives no profile link. */
  diverName: z.string().min(1).optional(),
  description: z.string().min(1),
  /** The board in the page's words, e.g. `3 Meter`. */
  height: z.string().min(1).optional(),
  /** `divord` in the page's own links: which dive of the sheet this is. */
  diveOrder: z.number().int().positive().optional(),
  awards: z.array(z.number()).min(1),
  /** The page's Total: the awards that count (high and low dropped), before DD. */
  total: z.number(),
});
export type JudgeScores = z.infer<typeof JudgeScoresSchema>;
