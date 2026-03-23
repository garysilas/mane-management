import { AppointmentStatus, BookingSource } from "@prisma/client";
import { vi } from "vitest";

import { ConflictError } from "@/lib/utils/errors";

const mocks = vi.hoisted(() => ({
  prismaTransaction: vi.fn(),
  barberFindUnique: vi.fn(),
  serviceFindFirst: vi.fn(),
  timeOffBlockFindMany: vi.fn(),
  appointmentFindMany: vi.fn(),
  appointmentCreate: vi.fn(),
  clientCreate: vi.fn(),
  reminderCreateMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.prismaTransaction,
  },
}));

import { createAppointment } from "@/lib/scheduling/appointments";

const baseInput = {
  barberId: "barber-1",
  serviceId: "service-1",
  bookingSource: BookingSource.PUBLIC_PAGE,
  client: {
    name: "Alex Client",
  },
};

function buildTransactionClient() {
  return {
    barber: {
      findUnique: mocks.barberFindUnique,
    },
    service: {
      findFirst: mocks.serviceFindFirst,
    },
    timeOffBlock: {
      findMany: mocks.timeOffBlockFindMany,
    },
    appointment: {
      findMany: mocks.appointmentFindMany,
      create: mocks.appointmentCreate,
    },
    client: {
      create: mocks.clientCreate,
    },
    reminder: {
      createMany: mocks.reminderCreateMany,
    },
  };
}

describe("appointment booking guardrails", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-09T12:00:00.000Z"));

    mocks.prismaTransaction.mockImplementation(async (callback) => callback(buildTransactionClient()));
    mocks.barberFindUnique.mockResolvedValue({
      id: "barber-1",
      timezone: "America/New_York",
      availability: [
        {
          dayOfWeek: 1,
          startTimeLocal: "09:00",
          endTimeLocal: "17:00",
          isActive: true,
        },
      ],
    });
    mocks.serviceFindFirst.mockResolvedValue({
      id: "service-1",
      durationMinutes: 30,
    });
    mocks.timeOffBlockFindMany.mockResolvedValue([]);
    mocks.appointmentFindMany.mockResolvedValue([]);
    mocks.clientCreate.mockResolvedValue({
      id: "client-1",
      phone: null,
      email: null,
    });
    mocks.appointmentCreate.mockImplementation(async ({ data }) => ({
      id: "appointment-1",
      status: AppointmentStatus.BOOKED,
      startTime: data.startTime,
      endTime: data.endTime,
    }));
    mocks.reminderCreateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("creates a valid future booking within barber availability", async () => {
    const result = await createAppointment({
      ...baseInput,
      startTime: new Date("2026-03-09T13:00:00.000Z"),
    });

    expect(mocks.timeOffBlockFindMany).toHaveBeenCalledWith({
      where: {
        barberId: "barber-1",
        startTime: { lt: new Date("2026-03-10T04:00:00.000Z") },
        endTime: { gt: new Date("2026-03-09T04:00:00.000Z") },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    expect(mocks.appointmentFindMany).toHaveBeenCalledWith({
      where: {
        barberId: "barber-1",
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { lt: new Date("2026-03-09T13:30:00.000Z") },
        endTime: { gt: new Date("2026-03-09T13:00:00.000Z") },
      },
      select: {
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    expect(result).toEqual({
      id: "appointment-1",
      status: AppointmentStatus.BOOKED,
      startTime: new Date("2026-03-09T13:00:00.000Z"),
      endTime: new Date("2026-03-09T13:30:00.000Z"),
    });
  });

  it("rejects bookings in the past", async () => {
    await expect(
      createAppointment({
        ...baseInput,
        startTime: new Date("2026-03-09T11:00:00.000Z"),
      }),
    ).rejects.toThrowError(new ConflictError("This time slot is no longer available."));

    expect(mocks.timeOffBlockFindMany).not.toHaveBeenCalled();
    expect(mocks.appointmentCreate).not.toHaveBeenCalled();
  });

  it("rejects bookings outside active availability", async () => {
    await expect(
      createAppointment({
        ...baseInput,
        startTime: new Date("2026-03-09T23:00:00.000Z"),
      }),
    ).rejects.toThrowError(new ConflictError("This time slot is no longer available."));

    expect(mocks.timeOffBlockFindMany).toHaveBeenCalledOnce();
    expect(mocks.appointmentFindMany).not.toHaveBeenCalled();
    expect(mocks.appointmentCreate).not.toHaveBeenCalled();
  });

  it("rejects bookings that overlap barber time off", async () => {
    mocks.timeOffBlockFindMany.mockResolvedValue([
      {
        startTime: new Date("2026-03-09T13:00:00.000Z"),
        endTime: new Date("2026-03-09T13:30:00.000Z"),
      },
    ]);

    await expect(
      createAppointment({
        ...baseInput,
        startTime: new Date("2026-03-09T13:00:00.000Z"),
      }),
    ).rejects.toThrowError(new ConflictError("This time slot is no longer available."));

    expect(mocks.appointmentFindMany).not.toHaveBeenCalled();
    expect(mocks.appointmentCreate).not.toHaveBeenCalled();
  });
});
