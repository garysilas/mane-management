import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  barberFindUnique: vi.fn(),
  serviceFindFirst: vi.fn(),
  timeOffBlockFindMany: vi.fn(),
  appointmentFindMany: vi.fn(),
  generateTimeSlots: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
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
    },
  },
}));

vi.mock("@/lib/scheduling", () => ({
  generateTimeSlots: mocks.generateTimeSlots,
}));

import { GET } from "@/app/api/public/[slug]/slots/route";

describe("public slots route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries barber-local day windows using the stored barber timezone", async () => {
    mocks.barberFindUnique.mockResolvedValue({
      id: "barber-1",
      timezone: "America/Los_Angeles",
      availability: [
        {
          dayOfWeek: 0,
          startTimeLocal: "09:00",
          endTimeLocal: "17:00",
          isActive: true,
        },
      ],
    });
    mocks.serviceFindFirst.mockResolvedValue({ durationMinutes: 30 });
    mocks.timeOffBlockFindMany.mockResolvedValue([
      {
        startTime: new Date("2026-03-08T14:00:00.000Z"),
        endTime: new Date("2026-03-08T14:30:00.000Z"),
      },
    ]);
    mocks.appointmentFindMany.mockResolvedValue([
      {
        startTime: new Date("2026-03-08T15:00:00.000Z"),
        endTime: new Date("2026-03-08T15:30:00.000Z"),
        status: "BOOKED",
      },
    ]);
    mocks.generateTimeSlots.mockReturnValue([
      {
        startTime: new Date("2026-03-08T13:00:00.000Z"),
        endTime: new Date("2026-03-08T13:30:00.000Z"),
      },
    ]);

    const response = await GET(
      new Request("http://localhost/api/public/jayfades/slots?serviceId=cm1234567890123456789012&date=2026-03-08"),
      { params: Promise.resolve({ slug: "jayfades" }) },
    );

    expect(mocks.barberFindUnique).toHaveBeenCalledWith({
      where: { slug: "jayfades" },
      select: {
        id: true,
        timezone: true,
        availability: {
          where: { isActive: true },
          select: {
            dayOfWeek: true,
            startTimeLocal: true,
            endTimeLocal: true,
            isActive: true,
          },
        },
      },
    });

    expect(mocks.timeOffBlockFindMany).toHaveBeenCalledWith({
      where: {
        barberId: "barber-1",
        startTime: { lt: new Date("2026-03-09T07:00:00.000Z") },
        endTime: { gt: new Date("2026-03-08T08:00:00.000Z") },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    expect(mocks.appointmentFindMany).toHaveBeenCalledWith({
      where: {
        barberId: "barber-1",
        startTime: { lt: new Date("2026-03-09T07:00:00.000Z") },
        endTime: { gt: new Date("2026-03-08T08:00:00.000Z") },
      },
      select: {
        startTime: true,
        endTime: true,
        status: true,
      },
    });

    expect(mocks.generateTimeSlots).toHaveBeenCalledWith({
      date: "2026-03-08",
      timeZone: "America/Los_Angeles",
      serviceDurationMinutes: 30,
      availabilityRules: [
        {
          dayOfWeek: 0,
          startTimeLocal: "09:00",
          endTimeLocal: "17:00",
          isActive: true,
        },
      ],
      appointments: [
        {
          startTime: new Date("2026-03-08T15:00:00.000Z"),
          endTime: new Date("2026-03-08T15:30:00.000Z"),
          status: "BOOKED",
        },
      ],
      timeOffBlocks: [
        {
          startTime: new Date("2026-03-08T14:00:00.000Z"),
          endTime: new Date("2026-03-08T14:30:00.000Z"),
        },
      ],
      slotIntervalMinutes: 15,
    });

    await expect(response.json()).resolves.toEqual([
      {
        startTime: "2026-03-08T13:00:00.000Z",
        endTime: "2026-03-08T13:30:00.000Z",
      },
    ]);
  });
});
