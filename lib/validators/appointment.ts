import { AppointmentStatus } from "@prisma/client";
import { z } from "zod";

export const appointmentIdSchema = z.object({
  id: z.string().cuid("Invalid appointment id."),
});

export const appointmentStatusUpdateSchema = z.object({
  status: z.enum([AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW]),
});

export type AppointmentStatusUpdateInput = z.infer<typeof appointmentStatusUpdateSchema>;
