import { ReminderStatus, ReminderType } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  findManyReminders: vi.fn(),
  triggerTask: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    reminder: {
      findMany: mocks.findManyReminders,
    },
  },
}));

vi.mock("@trigger.dev/sdk", () => ({
  tasks: {
    trigger: mocks.triggerTask,
  },
}));

import { dispatchDueReminders } from "@/lib/reminders/dispatch";

describe("reminder dispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.triggerTask.mockResolvedValue({ id: "run_1" });
  });

  it("enqueues due pending appointment reminders without pre-filtering appointment status", async () => {
    mocks.findManyReminders.mockResolvedValue([{ id: "reminder_1" }, { id: "reminder_2" }]);

    await expect(dispatchDueReminders()).resolves.toEqual({
      dueCount: 2,
      enqueuedCount: 2,
      reminderIds: ["reminder_1", "reminder_2"],
    });

    expect(mocks.findManyReminders).toHaveBeenCalledWith({
      where: {
        status: ReminderStatus.PENDING,
        type: ReminderType.APPOINTMENT_REMINDER,
        scheduledFor: { lte: expect.any(Date) },
      },
      orderBy: {
        scheduledFor: "asc",
      },
      select: {
        id: true,
      },
      take: 50,
    });

    expect(mocks.triggerTask).toHaveBeenNthCalledWith(
      1,
      "send-appointment-reminder",
      { reminderId: "reminder_1" },
      { idempotencyKey: "reminder:reminder_1", maxAttempts: 1 },
    );
    expect(mocks.triggerTask).toHaveBeenNthCalledWith(
      2,
      "send-appointment-reminder",
      { reminderId: "reminder_2" },
      { idempotencyKey: "reminder:reminder_2", maxAttempts: 1 },
    );
  });

  it("still dispatches stale pending reminders so the task can cancel them", async () => {
    mocks.findManyReminders.mockResolvedValue([{ id: "stale_reminder" }]);

    await expect(dispatchDueReminders()).resolves.toEqual({
      dueCount: 1,
      enqueuedCount: 1,
      reminderIds: ["stale_reminder"],
    });

    expect(mocks.triggerTask).toHaveBeenCalledWith(
      "send-appointment-reminder",
      { reminderId: "stale_reminder" },
      { idempotencyKey: "reminder:stale_reminder", maxAttempts: 1 },
    );
  });

  it("uses stable idempotency keys across repeated dispatch attempts", async () => {
    mocks.findManyReminders.mockResolvedValue([{ id: "reminder_1" }]);

    await dispatchDueReminders();
    await dispatchDueReminders();

    expect(mocks.triggerTask).toHaveBeenNthCalledWith(
      1,
      "send-appointment-reminder",
      { reminderId: "reminder_1" },
      { idempotencyKey: "reminder:reminder_1", maxAttempts: 1 },
    );
    expect(mocks.triggerTask).toHaveBeenNthCalledWith(
      2,
      "send-appointment-reminder",
      { reminderId: "reminder_1" },
      { idempotencyKey: "reminder:reminder_1", maxAttempts: 1 },
    );
  });
});
