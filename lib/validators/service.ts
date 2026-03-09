import { z } from "zod";

const serviceFieldsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  durationMinutes: z.number().int().min(5).max(240),
  priceCents: z.number().int().gt(0),
  isActive: z.boolean(),
});

export const serviceSchema = serviceFieldsSchema.extend({
  isActive: z.boolean().default(true),
});

export const serviceUpdateSchema = serviceFieldsSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one service field must be provided for update.",
);

export const serviceIdSchema = z.object({
  id: z.string().cuid("Invalid service id."),
});

export type ServiceInput = z.infer<typeof serviceSchema>;
