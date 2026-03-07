import { z } from "zod";

export const serviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  durationMinutes: z.number().int().min(10).max(240),
  priceCents: z.number().int().min(100).max(100_000),
  isActive: z.boolean().default(true),
});

export const serviceUpdateSchema = serviceSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one service field must be provided for update.",
);

export type ServiceInput = z.infer<typeof serviceSchema>;
