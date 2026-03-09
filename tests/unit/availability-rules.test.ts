import { hasAvailabilityRuleOverlap } from "@/lib/scheduling/availability-rules";

describe("availability rule overlap detection", () => {
  it("returns true for overlapping windows on the same day", () => {
    const hasOverlap = hasAvailabilityRuleOverlap(
      { startTimeLocal: "09:00", endTimeLocal: "12:00" },
      [{ startTimeLocal: "11:30", endTimeLocal: "13:00" }],
    );

    expect(hasOverlap).toBe(true);
  });

  it("returns false for non-overlapping windows", () => {
    const hasOverlap = hasAvailabilityRuleOverlap(
      { startTimeLocal: "09:00", endTimeLocal: "12:00" },
      [{ startTimeLocal: "12:00", endTimeLocal: "14:00" }],
    );

    expect(hasOverlap).toBe(false);
  });
});
