import { AppointmentStatus } from "@prisma/client";

import { canTransitionAppointmentStatus } from "@/lib/scheduling/appointments";

describe("appointment status transitions", () => {
  it("allows booked appointments to be cancelled, completed, or marked no show", () => {
    expect(canTransitionAppointmentStatus(AppointmentStatus.BOOKED, AppointmentStatus.CANCELLED)).toBe(true);
    expect(canTransitionAppointmentStatus(AppointmentStatus.BOOKED, AppointmentStatus.COMPLETED)).toBe(true);
    expect(canTransitionAppointmentStatus(AppointmentStatus.BOOKED, AppointmentStatus.NO_SHOW)).toBe(true);
  });

  it("rejects transitions that do not move a booked appointment into a lifecycle status", () => {
    expect(canTransitionAppointmentStatus(AppointmentStatus.BOOKED, AppointmentStatus.BOOKED)).toBe(false);
  });

  it("rejects updates once an appointment is already in a terminal status", () => {
    expect(canTransitionAppointmentStatus(AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED)).toBe(false);
    expect(canTransitionAppointmentStatus(AppointmentStatus.COMPLETED, AppointmentStatus.NO_SHOW)).toBe(false);
    expect(canTransitionAppointmentStatus(AppointmentStatus.NO_SHOW, AppointmentStatus.CANCELLED)).toBe(false);
  });
});
