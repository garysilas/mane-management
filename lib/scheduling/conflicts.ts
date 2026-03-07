import { AppointmentStatus } from "@prisma/client";

export type AppointmentWindow = {
  startTime: Date;
  endTime: Date;
  status?: AppointmentStatus;
};

export function overlaps(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && endA > startB;
}

export function hasAppointmentConflict(existingAppointments: AppointmentWindow[], proposedStart: Date, proposedEnd: Date): boolean {
  return existingAppointments.some((appointment) => {
    if (appointment.status && appointment.status !== AppointmentStatus.BOOKED) {
      return false;
    }

    return overlaps(appointment.startTime, appointment.endTime, proposedStart, proposedEnd);
  });
}
