import { getBarberAvailabilityForDate } from "@/lib/scheduling";

describe("barber availability for date", () => {
  it("combines weekly rules and subtracts time off blocks", () => {
    const windows = getBarberAvailabilityForDate({
      date: new Date("2026-03-09T00:00:00.000Z"),
      availabilityRules: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "12:00",
          isActive: true,
        },
      ],
      timeOffBlocks: [
        {
          startTime: new Date("2026-03-09T10:00:00.000Z"),
          endTime: new Date("2026-03-09T10:30:00.000Z"),
        },
      ],
    });

    expect(windows.map((window) => [window.startTime.toISOString(), window.endTime.toISOString()])).toEqual([
      ["2026-03-09T09:00:00.000Z", "2026-03-09T10:00:00.000Z"],
      ["2026-03-09T10:30:00.000Z", "2026-03-09T12:00:00.000Z"],
    ]);
  });
});
