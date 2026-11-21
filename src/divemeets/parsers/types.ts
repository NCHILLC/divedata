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
  place: z.number().int().positive(),
  tied: z.boolean(),
  diver: DiverRefSchema,
  team: z.string().min(1).optional(),
  total: z.number(),
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
