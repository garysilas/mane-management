const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  findBarber: vi.fn(),
  findService: vi.fn(),
  findTimeOffBlocks: vi.fn(),
  findAppointments: vi.fn(),
  findClients: vi.fn(),
  updateClient: vi.fn(),
  createClient: vi.fn(),
  createAppointment: vi.fn(),
  createManyReminders: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}));

import { BookingSource } from "@prisma/client";

import { createAppointment } from "@/lib/scheduling/appointments";
import { ConflictError } from "@/lib/utils/errors";

describe("create appointment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-11T14:00:00.000Z"));

    mocks.findBarber.mockResolvedValue({
      id: "barber-1",
      timezone: "America/New_York",
      availability: [
        {
          dayOfWeek: 3,
          startTimeLocal: "09:00",
          endTimeLocal: "17:00",
          isActive: true,
        },
      ],
    });
    mocks.findService.mockResolvedValue({ id: "service-1", durationMinutes: 30 });
    mocks.findTimeOffBlocks.mockResolvedValue([]);
    mocks.findAppointments.mockResolvedValue([]);
    mocks.findClients.mockResolvedValue([]);
    mocks.updateClient.mockResolvedValue(null);
    mocks.createClient.mockResolvedValue({ id: "client-1", phone: null, email: null });
    mocks.createAppointment.mockResolvedValue({ id: "appointment-1" });
    mocks.createManyReminders.mockResolvedValue(undefined);

    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        barber: {
          findUnique: mocks.findBarber,
        },
        service: {
          findFirst: mocks.findService,
        },
        timeOffBlock: {
          findMany: mocks.findTimeOffBlocks,
        },
        appointment: {
          findMany: mocks.findAppointments,
          create: mocks.createAppointment,
        },
        client: {
          findMany: mocks.findClients,
          update: mocks.updateClient,
          create: mocks.createClient,
        },
        reminder: {
          createMany: mocks.createManyReminders,
        },
      }),
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("rejects bookings that overlap a time-off block", async () => {
    mocks.findTimeOffBlocks.mockResolvedValue([
      {
        startTime: new Date("2026-03-11T15:00:00.000Z"),
        endTime: new Date("2026-03-11T15:30:00.000Z"),
      },
    ]);

    await expect(
      createAppointment({
        barberId: "barber-1",
        serviceId: "service-1",
        startTime: new Date("2026-03-11T15:00:00.000Z"),
        bookingSource: BookingSource.PUBLIC_PAGE,
        client: {
          name: "Alex Client",
          email: "alex@example.com",
          phone: "+15555550100",
        },
      }),
    ).rejects.toThrow(ConflictError);

    expect(mocks.findTimeOffBlocks).toHaveBeenCalledWith({
      where: {
        barberId: "barber-1",
        startTime: { lt: new Date("2026-03-12T04:00:00.000Z") },
        endTime: { gt: new Date("2026-03-11T04:00:00.000Z") },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });
    expect(mocks.findAppointments).not.toHaveBeenCalled();
    expect(mocks.findClients).not.toHaveBeenCalled();
    expect(mocks.createAppointment).not.toHaveBeenCalled();
  });
});
