import { AppointmentStatus } from "@prisma/client";

import { isTimeSlotAvailable } from "@/lib/scheduling";

describe("appointment conflict detection", () => {
  it("returns false when a booked appointment overlaps", () => {
    const existing = [
      {
        startTime: new Date("2026-03-11T15:00:00.000Z"),
        endTime: new Date("2026-03-11T15:30:00.000Z"),
        status: AppointmentStatus.BOOKED,
      },
    ];

    const isAvailable = isTimeSlotAvailable({
      appointments: existing,
      proposedStartTime: new Date("2026-03-11T15:20:00.000Z"),
      proposedEndTime: new Date("2026-03-11T15:50:00.000Z"),
    });

    expect(isAvailable).toBe(false);
  });

  it("ignores cancelled appointments when checking availability", () => {
    const existing = [
      {
        startTime: new Date("2026-03-11T15:00:00.000Z"),
        endTime: new Date("2026-03-11T15:30:00.000Z"),
        status: AppointmentStatus.CANCELLED,
      },
    ];

    const isAvailable = isTimeSlotAvailable({
      appointments: existing,
      proposedStartTime: new Date("2026-03-11T15:20:00.000Z"),
      proposedEndTime: new Date("2026-03-11T15:50:00.000Z"),
    });

    expect(isAvailable).toBe(true);
  });
});
