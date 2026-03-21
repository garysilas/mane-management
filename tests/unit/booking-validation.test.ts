import { AppointmentStatus } from "@prisma/client";

import { BOOKING_VALIDATION_ERRORS, getBookingValidationError } from "@/lib/scheduling/appointments";

const mondayAvailability = [
  {
    dayOfWeek: 1,
    startTimeLocal: "09:00",
    endTimeLocal: "17:00",
    isActive: true,
  },
];

function buildValidationInput() {
  return {
    proposedStartTime: new Date("2026-03-09T10:00:00.000Z"),
    proposedEndTime: new Date("2026-03-09T10:30:00.000Z"),
    availabilityRules: mondayAvailability,
    timeOffBlocks: [],
    appointments: [],
    now: new Date("2026-03-09T09:00:00.000Z"),
  };
}

describe("booking write validation", () => {
  it("accepts a future booking inside availability with no conflicts", () => {
    const error = getBookingValidationError(buildValidationInput());

    expect(error).toBeNull();
  });

  it("rejects bookings in the past", () => {
    const error = getBookingValidationError({
      ...buildValidationInput(),
      now: new Date("2026-03-09T10:01:00.000Z"),
    });

    expect(error).toBe(BOOKING_VALIDATION_ERRORS.past);
  });

  it("rejects bookings outside active availability", () => {
    const error = getBookingValidationError({
      ...buildValidationInput(),
      proposedStartTime: new Date("2026-03-09T17:00:00.000Z"),
      proposedEndTime: new Date("2026-03-09T17:30:00.000Z"),
    });

    expect(error).toBe(BOOKING_VALIDATION_ERRORS.outsideAvailability);
  });

  it("rejects bookings during time-off blocks", () => {
    const error = getBookingValidationError({
      ...buildValidationInput(),
      timeOffBlocks: [
        {
          startTime: new Date("2026-03-09T10:15:00.000Z"),
          endTime: new Date("2026-03-09T10:45:00.000Z"),
        },
      ],
    });

    expect(error).toBe(BOOKING_VALIDATION_ERRORS.timeOffConflict);
  });

  it("preserves overlap protection for booked appointments", () => {
    const error = getBookingValidationError({
      ...buildValidationInput(),
      appointments: [
        {
          startTime: new Date("2026-03-09T10:15:00.000Z"),
          endTime: new Date("2026-03-09T10:45:00.000Z"),
          status: AppointmentStatus.BOOKED,
        },
      ],
    });

    expect(error).toBe(BOOKING_VALIDATION_ERRORS.overlap);
  });

  it("still allows overlaps against cancelled appointments", () => {
    const error = getBookingValidationError({
      ...buildValidationInput(),
      appointments: [
        {
          startTime: new Date("2026-03-09T10:15:00.000Z"),
          endTime: new Date("2026-03-09T10:45:00.000Z"),
          status: AppointmentStatus.CANCELLED,
        },
      ],
    });

    expect(error).toBeNull();
  });
});
