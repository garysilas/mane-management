import { AppointmentStatus } from "@prisma/client";

import { generateAvailableSlots } from "@/lib/scheduling/slots";

describe("slot generation", () => {
  it("returns open slots while excluding booked windows", () => {
    const slots = generateAvailableSlots({
      date: new Date("2026-03-09T00:00:00.000Z"),
      slotDurationMinutes: 30,
      slotIntervalMinutes: 15,
      rules: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "10:00",
          isActive: true,
        },
      ],
      appointments: [
        {
          startTime: new Date("2026-03-09T09:30:00.000Z"),
          endTime: new Date("2026-03-09T10:00:00.000Z"),
          status: AppointmentStatus.BOOKED,
        },
      ],
      timeOffBlocks: [],
    });

    expect(slots.map((slot) => slot.startTime.toISOString())).toEqual(["2026-03-09T09:00:00.000Z"]);
  });
});
