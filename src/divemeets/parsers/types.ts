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
