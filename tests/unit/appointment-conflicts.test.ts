import { AppointmentStatus } from "@prisma/client";

import { hasAppointmentConflict } from "@/lib/scheduling/conflicts";

describe("appointment conflict detection", () => {
  it("returns true when a booked appointment overlaps", () => {
    const existing = [
      {
        startTime: new Date("2026-03-11T15:00:00.000Z"),
        endTime: new Date("2026-03-11T15:30:00.000Z"),
        status: AppointmentStatus.BOOKED,
      },
    ];

    const hasConflict = hasAppointmentConflict(
      existing,
      new Date("2026-03-11T15:20:00.000Z"),
      new Date("2026-03-11T15:50:00.000Z"),
    );

    expect(hasConflict).toBe(true);
  });

  it("ignores cancelled appointments", () => {
    const existing = [
      {
        startTime: new Date("2026-03-11T15:00:00.000Z"),
        endTime: new Date("2026-03-11T15:30:00.000Z"),
        status: AppointmentStatus.CANCELLED,
      },
    ];

    const hasConflict = hasAppointmentConflict(
      existing,
      new Date("2026-03-11T15:20:00.000Z"),
      new Date("2026-03-11T15:50:00.000Z"),
    );

    expect(hasConflict).toBe(false);
  });
});
