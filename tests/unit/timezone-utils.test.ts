import {
  combineLocalDateAndMinutes,
  endOfTimeZoneDay,
  startOfTimeZoneDay,
} from "@/lib/utils/time";

describe("timezone utilities", () => {
  it("returns a 23-hour day window on spring-forward dates", () => {
    const dayStart = startOfTimeZoneDay("2026-03-08", "America/New_York");
    const dayEnd = endOfTimeZoneDay("2026-03-08", "America/New_York");

    expect(dayStart.toISOString()).toBe("2026-03-08T05:00:00.000Z");
    expect(dayEnd.toISOString()).toBe("2026-03-09T04:00:00.000Z");
    expect(dayEnd.getTime() - dayStart.getTime()).toBe(23 * 60 * 60 * 1000);
  });

  it("returns a 25-hour day window on fall-back dates", () => {
    const dayStart = startOfTimeZoneDay("2026-11-01", "America/New_York");
    const dayEnd = endOfTimeZoneDay("2026-11-01", "America/New_York");

    expect(dayStart.toISOString()).toBe("2026-11-01T04:00:00.000Z");
    expect(dayEnd.toISOString()).toBe("2026-11-02T05:00:00.000Z");
    expect(dayEnd.getTime() - dayStart.getTime()).toBe(25 * 60 * 60 * 1000);
  });

  it("maps barber-local clock times to the correct UTC instants across DST", () => {
    expect(combineLocalDateAndMinutes("2026-03-08", 9 * 60, "America/New_York").toISOString()).toBe(
      "2026-03-08T13:00:00.000Z",
    );
    expect(combineLocalDateAndMinutes("2026-11-01", 9 * 60, "America/New_York").toISOString()).toBe(
      "2026-11-01T14:00:00.000Z",
    );
  });
});
