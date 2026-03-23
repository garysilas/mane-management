import { ReminderStatus, ReminderType } from "@prisma/client";
import { tasks } from "@trigger.dev/sdk";

import { prisma } from "@/lib/db/prisma";

const DEFAULT_DISPATCH_LIMIT = 50;

export type ReminderDispatchSummary = {
  dueCount: number;
  enqueuedCount: number;
  reminderIds: string[];
};

export async function dispatchDueReminders(limit = DEFAULT_DISPATCH_LIMIT): Promise<ReminderDispatchSummary> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : DEFAULT_DISPATCH_LIMIT;
  const reminders = await prisma.reminder.findMany({
    where: {
      status: ReminderStatus.PENDING,
      type: ReminderType.APPOINTMENT_REMINDER,
      scheduledFor: { lte: new Date() },
    },
    orderBy: {
      scheduledFor: "asc",
    },
    select: {
      id: true,
    },
    take: safeLimit,
  });

  await Promise.all(
    reminders.map((reminder) =>
      tasks.trigger(
        "send-appointment-reminder",
        { reminderId: reminder.id },
        {
          idempotencyKey: `reminder:${reminder.id}`,
          maxAttempts: 1,
        },
      ),
    ),
  );

  return {
    dueCount: reminders.length,
    enqueuedCount: reminders.length,
    reminderIds: reminders.map((reminder) => reminder.id),
  };
}
