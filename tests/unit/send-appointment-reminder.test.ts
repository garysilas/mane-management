import { AppointmentStatus, ReminderChannel, ReminderStatus, ReminderType } from "@prisma/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  task: vi.fn(<T>(definition: T) => definition),
  loggerInfo: vi.fn(),
  loggerError: vi.fn(),
  findUniqueReminder: vi.fn(),
  updateManyReminder: vi.fn(),
  sendSmsReminder: vi.fn(),
  sendBookingEmail: vi.fn(),
}));

vi.mock("@trigger.dev/sdk", () => ({
  logger: {
    info: mocks.loggerInfo,
    error: mocks.loggerError,
  },
  task: mocks.task,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    reminder: {
      findUnique: mocks.findUniqueReminder,
      updateMany: mocks.updateManyReminder,
    },
  },
}));

vi.mock("@/lib/messaging/twilio", () => ({
  sendSmsReminder: mocks.sendSmsReminder,
}));

vi.mock("@/lib/email/resend", () => ({
  sendBookingEmail: mocks.sendBookingEmail,
}));

import { sendAppointmentReminder } from "@/trigger/jobs/send-appointment-reminder";

const sendAppointmentReminderTask = sendAppointmentReminder as unknown as {
  run: (payload: { reminderId: string }) => Promise<{ ok: boolean; status: string }>;
};

function buildReminder(overrides: {
  channel?: ReminderChannel;
  appointmentStatus?: AppointmentStatus;
  email?: string | null;
  phone?: string | null;
  status?: ReminderStatus;
  type?: ReminderType;
} = {}) {
  const email = Object.prototype.hasOwnProperty.call(overrides, "email") ? (overrides.email ?? null) : "alex@example.com";
  const phone = Object.prototype.hasOwnProperty.call(overrides, "phone") ? (overrides.phone ?? null) : "+15555550100";

  return {
    id: "reminder_1",
    appointmentId: "appointment_1",
    channel: overrides.channel ?? ReminderChannel.SMS,
    type: overrides.type ?? ReminderType.APPOINTMENT_REMINDER,
    status: overrides.status ?? ReminderStatus.PENDING,
    appointment: {
      status: overrides.appointmentStatus ?? AppointmentStatus.BOOKED,
      startTime: new Date("2026-03-24T14:00:00.000Z"),
      client: {
        email,
        phone,
      },
      barber: {
        name: "Jay Fades",
        businessName: "Jay Fades Studio",
        timezone: "America/New_York",
      },
      service: {
        name: "Fade",
      },
    },
  };
}

describe("send appointment reminder task", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-23T15:00:00.000Z"));
    process.env = { ...originalEnv };
    mocks.updateManyReminder.mockResolvedValue({ count: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  it("marks a pending sms reminder as sent", async () => {
    process.env.TWILIO_ACCOUNT_SID = "sid";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_PHONE = "+15555559999";
    mocks.findUniqueReminder.mockResolvedValue(buildReminder());

    await expect(sendAppointmentReminderTask.run({ reminderId: "reminder_1" })).resolves.toEqual({
      ok: true,
      status: ReminderStatus.SENT,
    });

    expect(mocks.sendSmsReminder).toHaveBeenCalledWith(
      "+15555550100",
      expect.stringContaining("Fade appointment with Jay Fades Studio"),
    );
    expect(mocks.updateManyReminder).toHaveBeenCalledWith({
      where: {
        id: "reminder_1",
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.SENT,
        sentAt: new Date("2026-03-23T15:00:00.000Z"),
      },
    });
  });

  it("marks a pending email reminder as sent", async () => {
    process.env.RESEND_API_KEY = "key";
    process.env.RESEND_FROM_EMAIL = "noreply@example.com";
    mocks.findUniqueReminder.mockResolvedValue(buildReminder({ channel: ReminderChannel.EMAIL }));

    await expect(sendAppointmentReminderTask.run({ reminderId: "reminder_1" })).resolves.toEqual({
      ok: true,
      status: ReminderStatus.SENT,
    });

    expect(mocks.sendBookingEmail).toHaveBeenCalledWith({
      to: "alex@example.com",
      subject: "Appointment reminder",
      html: expect.stringContaining("Fade appointment with Jay Fades Studio"),
    });
  });

  it("marks a pending reminder as failed when the delivery target is missing", async () => {
    process.env.TWILIO_ACCOUNT_SID = "sid";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_PHONE = "+15555559999";
    mocks.findUniqueReminder.mockResolvedValue(buildReminder({ phone: null }));

    await expect(sendAppointmentReminderTask.run({ reminderId: "reminder_1" })).resolves.toEqual({
      ok: false,
      status: ReminderStatus.FAILED,
    });

    expect(mocks.sendSmsReminder).not.toHaveBeenCalled();
    expect(mocks.updateManyReminder).toHaveBeenCalledWith({
      where: {
        id: "reminder_1",
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.FAILED,
      },
    });
  });

  it("marks a pending reminder as failed when delivery throws", async () => {
    process.env.TWILIO_ACCOUNT_SID = "sid";
    process.env.TWILIO_AUTH_TOKEN = "token";
    process.env.TWILIO_FROM_PHONE = "+15555559999";
    mocks.findUniqueReminder.mockResolvedValue(buildReminder());
    mocks.sendSmsReminder.mockRejectedValue(new Error("Twilio outage"));

    await expect(sendAppointmentReminderTask.run({ reminderId: "reminder_1" })).resolves.toEqual({
      ok: false,
      status: ReminderStatus.FAILED,
    });

    expect(mocks.updateManyReminder).toHaveBeenCalledWith({
      where: {
        id: "reminder_1",
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.FAILED,
      },
    });
  });

  it("marks a pending reminder as cancelled when the appointment is no longer booked", async () => {
    mocks.findUniqueReminder.mockResolvedValue(
      buildReminder({
        appointmentStatus: AppointmentStatus.CANCELLED,
      }),
    );

    await expect(sendAppointmentReminderTask.run({ reminderId: "reminder_1" })).resolves.toEqual({
      ok: true,
      status: ReminderStatus.CANCELLED,
    });

    expect(mocks.sendSmsReminder).not.toHaveBeenCalled();
    expect(mocks.updateManyReminder).toHaveBeenCalledWith({
      where: {
        id: "reminder_1",
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.CANCELLED,
      },
    });
  });
});
