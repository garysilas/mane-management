import { getBarberAvailabilityForDate } from "@/lib/scheduling";

describe("barber availability for date", () => {
  it("combines weekly rules and subtracts time off blocks in the barber timezone", () => {
    const windows = getBarberAvailabilityForDate({
      date: "2026-03-08",
      timeZone: "America/New_York",
      availabilityRules: [
        {
          dayOfWeek: 0,
          startTimeLocal: "09:00",
          endTimeLocal: "12:00",
          isActive: true,
        },
      ],
      timeOffBlocks: [
        {
          startTime: new Date("2026-03-08T14:00:00.000Z"),
          endTime: new Date("2026-03-08T14:30:00.000Z"),
        },
      ],
    });

    expect(windows.map((window) => [window.startTime.toISOString(), window.endTime.toISOString()])).toEqual([
      ["2026-03-08T13:00:00.000Z", "2026-03-08T14:00:00.000Z"],
      ["2026-03-08T14:30:00.000Z", "2026-03-08T16:00:00.000Z"],
    ]);
  });
});
