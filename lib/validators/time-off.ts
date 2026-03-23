import { z } from "zod";

const timeOffFieldsSchema = z.object({
  startTime: z.string().datetime({ offset: true }),
  endTime: z.string().datetime({ offset: true }),
  reason: z.string().trim().max(200).nullable().optional(),
});

export const timeOffBlockSchema = timeOffFieldsSchema.refine(
  (value) => new Date(value.startTime).getTime() < new Date(value.endTime).getTime(),
  {
    message: "Start time must be before end time.",
    path: ["endTime"],
  },
);

export const timeOffBlockUpdateSchema = timeOffFieldsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one time-off field must be provided for update.",
);

export const timeOffBlockIdSchema = z.object({
  id: z.string().cuid("Invalid time off block id."),
});

export type TimeOffBlockInput = z.infer<typeof timeOffBlockSchema>;
