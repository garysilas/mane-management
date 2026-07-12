import { AppointmentStatus } from "@prisma/client";
import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  appointmentCount: vi.fn(),
  clientCount: vi.fn(),
  appointmentFindMany: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    appointment: {
      count: mocks.appointmentCount,
      findMany: mocks.appointmentFindMany,
    },
    client: {
      count: mocks.clientCount,
    },
  },
}));

import { getBarberAnalytics } from "@/lib/analytics/metrics";

describe("barber retention analytics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-31T12:00:00.000Z"));

    mocks.appointmentCount
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(8);
    mocks.clientCount.mockResolvedValue(5);
    mocks.appointmentFindMany.mockResolvedValue([
      {
        clientId: "repeat-overdue",
        startTime: new Date("2026-01-01T15:00:00.000Z"),
        status: AppointmentStatus.COMPLETED,
      },
      {
        clientId: "repeat-overdue",
        startTime: new Date("2026-02-15T15:00:00.000Z"),
        status: AppointmentStatus.COMPLETED,
      },
      {
        clientId: "due-soon",
        startTime: new Date("2026-03-10T15:00:00.000Z"),
        status: AppointmentStatus.COMPLETED,
      },
      {
        clientId: "overdue-with-future",
        startTime: new Date("2026-02-01T15:00:00.000Z"),
        status: AppointmentStatus.COMPLETED,
      },
      {
        clientId: "overdue-with-future",
        startTime: new Date("2026-04-03T15:00:00.000Z"),
        status: AppointmentStatus.BOOKED,
      },
      {
        clientId: "recent",
        startTime: new Date("2026-03-25T15:00:00.000Z"),
        status: AppointmentStatus.COMPLETED,
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns operational counts plus retention health metrics", async () => {
    const analytics = await getBarberAnalytics("barber-1");

    expect(mocks.appointmentCount).toHaveBeenNthCalledWith(1, {
      where: {
        barberId: "barber-1",
        status: AppointmentStatus.BOOKED,
        startTime: { gte: new Date("2026-03-31T12:00:00.000Z") },
      },
    });
    expect(mocks.clientCount).toHaveBeenCalledWith({ where: { barberId: "barber-1" } });
    expect(mocks.appointmentCount).toHaveBeenNthCalledWith(2, {
      where: { barberId: "barber-1", status: AppointmentStatus.COMPLETED },
    });
    expect(mocks.appointmentFindMany).toHaveBeenCalledWith({
      where: {
        barberId: "barber-1",
        status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.BOOKED] },
      },
      select: {
        clientId: true,
        startTime: true,
        status: true,
      },
      orderBy: [{ clientId: "asc" }, { startTime: "asc" }],
    });

    expect(analytics).toEqual({
      upcomingCount: 3,
      clientCount: 5,
      completedCount: 8,
      overdueClientCount: 1,
      dueBackSoonCount: 1,
      repeatClientCount: 1,
      repeatClientRate: 20,
      averageDaysBetweenVisits: 45,
    });
  });
});
