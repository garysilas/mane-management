import { isTimeSlotAvailable, overlaps, type AppointmentWindow } from "@/lib/scheduling/engine";

export type { AppointmentWindow };
export { overlaps };

export function hasAppointmentConflict(existingAppointments: AppointmentWindow[], proposedStart: Date, proposedEnd: Date): boolean {
  return !isTimeSlotAvailable({
    proposedStartTime: proposedStart,
    proposedEndTime: proposedEnd,
    appointments: existingAppointments,
  });
}
