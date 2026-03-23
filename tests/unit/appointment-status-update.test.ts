import { AppointmentStatus, ReminderStatus } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { findFirstMock, updateManyMock, reminderUpdateManyMock } = vi.hoisted(() => ({
  findFirstMock: vi.fn(),
  updateManyMock: vi.fn(),
  reminderUpdateManyMock: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    appointment: {
      findFirst: findFirstMock,
      updateMany: updateManyMock,
    },
    reminder: {
      updateMany: reminderUpdateManyMock,
    },
  },
}));

import { updateAppointmentStatus } from "@/lib/scheduling/appointments";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";

describe("appointment status updates", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-22T12:00:00.000Z"));
    findFirstMock.mockReset();
    updateManyMock.mockReset();
    reminderUpdateManyMock.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows cancelling a booked appointment and uses an atomic guarded update", async () => {
    findFirstMock.mockResolvedValue({
      id: "appt_123",
      startTime: new Date("2026-03-23T12:00:00.000Z"),
      status: AppointmentStatus.BOOKED,
    });
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.CANCELLED,
      }),
    ).resolves.toEqual({
      id: "appt_123",
      status: AppointmentStatus.CANCELLED,
    });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.BOOKED,
      },
      data: {
        status: AppointmentStatus.CANCELLED,
      },
    });
    expect(reminderUpdateManyMock).toHaveBeenCalledWith({
      where: {
        appointmentId: "appt_123",
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.CANCELLED,
      },
    });
  });

  it("allows marking a past booked appointment completed", async () => {
    findFirstMock.mockResolvedValue({
      id: "appt_123",
      startTime: new Date("2026-03-22T11:00:00.000Z"),
      status: AppointmentStatus.BOOKED,
    });
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.COMPLETED,
      }),
    ).resolves.toEqual({
      id: "appt_123",
      status: AppointmentStatus.COMPLETED,
    });

    expect(updateManyMock).toHaveBeenCalledWith({
      where: {
        id: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.BOOKED,
        startTime: { lt: new Date("2026-03-22T12:00:00.000Z") },
      },
      data: {
        status: AppointmentStatus.COMPLETED,
      },
    });
    expect(reminderUpdateManyMock).not.toHaveBeenCalled();
  });

  it("allows marking a past booked appointment as no show", async () => {
    findFirstMock.mockResolvedValue({
      id: "appt_456",
      startTime: new Date("2026-03-22T10:00:00.000Z"),
      status: AppointmentStatus.BOOKED,
    });
    updateManyMock.mockResolvedValue({ count: 1 });

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_456",
        barberId: "barber_123",
        status: AppointmentStatus.NO_SHOW,
      }),
    ).resolves.toEqual({
      id: "appt_456",
      status: AppointmentStatus.NO_SHOW,
    });
  });

  it("rejects complete and no-show for future booked appointments", async () => {
    findFirstMock.mockResolvedValue({
      id: "appt_123",
      startTime: new Date("2026-03-22T13:00:00.000Z"),
      status: AppointmentStatus.BOOKED,
    });

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.COMPLETED,
      }),
    ).rejects.toThrowError(new ConflictError("Only past appointments can be marked as completed or no show."));

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.NO_SHOW,
      }),
    ).rejects.toThrowError(new ConflictError("Only past appointments can be marked as completed or no show."));

    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects updates when the appointment is already in a terminal status", async () => {
    findFirstMock.mockResolvedValue({
      id: "appt_123",
      startTime: new Date("2026-03-22T11:00:00.000Z"),
      status: AppointmentStatus.CANCELLED,
    });

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.COMPLETED,
      }),
    ).rejects.toThrowError(new ConflictError("Only booked appointments can be marked as cancelled, completed, or no show."));

    expect(updateManyMock).not.toHaveBeenCalled();
  });

  it("rejects when the guarded update affects zero rows", async () => {
    findFirstMock.mockResolvedValue({
      id: "appt_123",
      startTime: new Date("2026-03-22T11:00:00.000Z"),
      status: AppointmentStatus.BOOKED,
    });
    updateManyMock.mockResolvedValue({ count: 0 });

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.COMPLETED,
      }),
    ).rejects.toThrowError(new ConflictError("Only booked appointments can be marked as cancelled, completed, or no show."));
  });

  it("rejects when the appointment is not found", async () => {
    findFirstMock.mockResolvedValue(null);

    await expect(
      updateAppointmentStatus({
        appointmentId: "appt_123",
        barberId: "barber_123",
        status: AppointmentStatus.CANCELLED,
      }),
    ).rejects.toThrowError(new NotFoundError("Appointment not found."));

    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
