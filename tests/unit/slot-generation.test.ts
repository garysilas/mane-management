import { AppointmentStatus } from "@prisma/client";

import { generateTimeSlots } from "@/lib/scheduling";

describe("slot generation", () => {
  it("returns open slots while excluding overlapping appointments in the barber timezone", () => {
    const slots = generateTimeSlots({
      date: "2026-03-09",
      timeZone: "America/New_York",
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 15,
      availabilityRules: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "10:00",
          isActive: true,
        },
      ],
      appointments: [
        {
          startTime: new Date("2026-03-09T13:30:00.000Z"),
          endTime: new Date("2026-03-09T14:00:00.000Z"),
          status: AppointmentStatus.BOOKED,
        },
      ],
      timeOffBlocks: [],
    });

    expect(slots.map((slot) => slot.startTime.toISOString())).toEqual(["2026-03-09T13:00:00.000Z"]);
  });

  it("returns no slots when service duration overflows available time", () => {
    const slots = generateTimeSlots({
      date: "2026-03-09",
      timeZone: "America/New_York",
      serviceDurationMinutes: 45,
      slotIntervalMinutes: 15,
      availabilityRules: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "09:30",
          isActive: true,
        },
      ],
      appointments: [],
      timeOffBlocks: [],
    });

    expect(slots).toEqual([]);
  });

  it("aligns generated slots to 15-minute boundaries", () => {
    const slots = generateTimeSlots({
      date: "2026-03-09",
      timeZone: "America/New_York",
      serviceDurationMinutes: 30,
      slotIntervalMinutes: 15,
      availabilityRules: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:10",
          endTimeLocal: "10:05",
          isActive: true,
        },
      ],
      appointments: [],
      timeOffBlocks: [],
    });

    expect(slots.map((slot) => slot.startTime.toISOString())).toEqual([
      "2026-03-09T13:15:00.000Z",
      "2026-03-09T13:30:00.000Z",
    ]);
  });

  it("uses the DST-adjusted offset on spring-forward days", () => {
    const slots = generateTimeSlots({
      date: "2026-03-08",
      timeZone: "America/New_York",
      serviceDurationMinutes: 60,
      slotIntervalMinutes: 60,
      availabilityRules: [
        {
          dayOfWeek: 0,
          startTimeLocal: "09:00",
          endTimeLocal: "10:00",
          isActive: true,
        },
      ],
      appointments: [],
      timeOffBlocks: [],
    });

    expect(slots.map((slot) => slot.startTime.toISOString())).toEqual(["2026-03-08T13:00:00.000Z"]);
  });

  it("uses the standard-time offset on fall-back days", () => {
    const slots = generateTimeSlots({
      date: "2026-11-01",
      timeZone: "America/New_York",
      serviceDurationMinutes: 60,
      slotIntervalMinutes: 60,
      availabilityRules: [
        {
          dayOfWeek: 0,
          startTimeLocal: "09:00",
          endTimeLocal: "10:00",
          isActive: true,
        },
      ],
      appointments: [],
      timeOffBlocks: [],
    });

    expect(slots.map((slot) => slot.startTime.toISOString())).toEqual(["2026-11-01T14:00:00.000Z"]);
  });
});
