import { z } from "zod";

import { parseTimeToMinutes } from "@/lib/utils/time";

const timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;

const availabilityRuleFieldsSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTimeLocal: z.string().regex(timePattern, "Start time must be in HH:mm format."),
  endTimeLocal: z.string().regex(timePattern, "End time must be in HH:mm format."),
  isActive: z.boolean().default(true),
});

export const availabilityRuleSchema = availabilityRuleFieldsSchema.refine(
  (value) => parseTimeToMinutes(value.startTimeLocal) < parseTimeToMinutes(value.endTimeLocal),
  {
    message: "Start time must be before end time.",
    path: ["endTimeLocal"],
  },
);

export const availabilityRuleUpdateSchema = availabilityRuleFieldsSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, "At least one availability field must be provided for update.")
  .refine(
    (value) =>
      !value.startTimeLocal || !value.endTimeLocal || parseTimeToMinutes(value.startTimeLocal) < parseTimeToMinutes(value.endTimeLocal),
    {
      message: "Start time must be before end time.",
      path: ["endTimeLocal"],
    },
  );

export type AvailabilityRuleInput = z.infer<typeof availabilityRuleSchema>;
