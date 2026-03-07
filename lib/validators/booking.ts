import { z } from "zod";

export const slotQuerySchema = z.object({
  serviceId: z.string().cuid(),
  date: z.string().date(),
});

export const publicBookingSchema = z.object({
  serviceId: z.string().cuid(),
  startTime: z.string().datetime({ offset: true }),
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().optional().nullable(),
  phone: z.string().trim().min(7).max(20).optional().nullable(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type PublicBookingInput = z.infer<typeof publicBookingSchema>;
