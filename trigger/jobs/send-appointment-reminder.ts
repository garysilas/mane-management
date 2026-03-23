import { AppointmentStatus, ReminderChannel, ReminderStatus, ReminderType } from "@prisma/client";
import { logger, task } from "@trigger.dev/sdk";

import { prisma } from "@/lib/db/prisma";
import { sendBookingEmail } from "@/lib/email/resend";
import { sendSmsReminder } from "@/lib/messaging/twilio";
import { formatDateTimeInTimeZone } from "@/lib/utils/time";

function hasSmsConfig() {
  return Boolean(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_PHONE);
}

function hasEmailConfig() {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL);
}

async function updateReminderStatus(reminderId: string, status: ReminderStatus, sentAt?: Date) {
  const result = await prisma.reminder.updateMany({
    where: {
      id: reminderId,
      status: ReminderStatus.PENDING,
    },
    data: {
      status,
      ...(sentAt ? { sentAt } : {}),
    },
  });

  return result.count === 1;
}

export const sendAppointmentReminder = task({
  id: "send-appointment-reminder",
  run: async (payload: { reminderId: string }) => {
    const reminder = await prisma.reminder.findUnique({
      where: { id: payload.reminderId },
      select: {
        id: true,
        appointmentId: true,
        channel: true,
        type: true,
        status: true,
        appointment: {
          select: {
            status: true,
            startTime: true,
            client: {
              select: {
                email: true,
                phone: true,
              },
            },
            barber: {
              select: {
                name: true,
                businessName: true,
                timezone: true,
              },
            },
            service: {
              select: {
                name: true,
              },
            },
          },
        },
      },
    });

    if (!reminder) {
      logger.info("Skipping missing reminder", { reminderId: payload.reminderId });
      return { ok: false, status: "MISSING" as const };
    }

    if (reminder.status !== ReminderStatus.PENDING) {
      logger.info("Skipping reminder that is no longer pending", {
        reminderId: reminder.id,
        appointmentId: reminder.appointmentId,
        channel: reminder.channel,
        status: reminder.status,
      });
      return { ok: true, status: reminder.status };
    }

    if (reminder.type !== ReminderType.APPOINTMENT_REMINDER) {
      await updateReminderStatus(reminder.id, ReminderStatus.FAILED);
      logger.error("Reminder delivery failed for unsupported type", {
        reminderId: reminder.id,
        appointmentId: reminder.appointmentId,
        channel: reminder.channel,
        type: reminder.type,
        status: ReminderStatus.FAILED,
      });
      return { ok: false, status: ReminderStatus.FAILED };
    }

    if (reminder.appointment.status !== AppointmentStatus.BOOKED) {
      const cancelled = await updateReminderStatus(reminder.id, ReminderStatus.CANCELLED);

      logger.info("Skipping reminder for appointment that is no longer booked", {
        reminderId: reminder.id,
        appointmentId: reminder.appointmentId,
        channel: reminder.channel,
        appointmentStatus: reminder.appointment.status,
        status: cancelled ? ReminderStatus.CANCELLED : reminder.status,
      });

      return {
        ok: true,
        status: cancelled ? ReminderStatus.CANCELLED : reminder.status,
      };
    }

    const businessName = reminder.appointment.barber.businessName ?? reminder.appointment.barber.name;
    const formattedStartTime = formatDateTimeInTimeZone(
      reminder.appointment.startTime,
      reminder.appointment.barber.timezone,
    );
    const message = `Reminder: your ${reminder.appointment.service.name} appointment with ${businessName} is on ${formattedStartTime} (${reminder.appointment.barber.timezone}).`;

    const contact =
      reminder.channel === ReminderChannel.EMAIL
        ? reminder.appointment.client.email
        : reminder.appointment.client.phone;
    const configReady = reminder.channel === ReminderChannel.EMAIL ? hasEmailConfig() : hasSmsConfig();

    if (!contact || !configReady) {
      const failed = await updateReminderStatus(reminder.id, ReminderStatus.FAILED);

      logger.error("Reminder delivery failed before sending", {
        reminderId: reminder.id,
        appointmentId: reminder.appointmentId,
        channel: reminder.channel,
        reason: !contact ? "missing_contact" : "missing_channel_config",
        status: failed ? ReminderStatus.FAILED : reminder.status,
      });

      return {
        ok: false,
        status: failed ? ReminderStatus.FAILED : reminder.status,
      };
    }

    try {
      if (reminder.channel === ReminderChannel.EMAIL) {
        await sendBookingEmail({
          to: contact,
          subject: "Appointment reminder",
          html: `<p>${message}</p>`,
        });
      } else {
        await sendSmsReminder(contact, message);
      }
    } catch (error) {
      const failed = await updateReminderStatus(reminder.id, ReminderStatus.FAILED);

      logger.error("Reminder delivery failed", {
        reminderId: reminder.id,
        appointmentId: reminder.appointmentId,
        channel: reminder.channel,
        error: error instanceof Error ? error.message : "Unknown reminder delivery error",
        status: failed ? ReminderStatus.FAILED : reminder.status,
      });

      return {
        ok: false,
        status: failed ? ReminderStatus.FAILED : reminder.status,
      };
    }

    const sentAt = new Date();
    const sent = await updateReminderStatus(reminder.id, ReminderStatus.SENT, sentAt);

    logger.info("Reminder delivered", {
      reminderId: reminder.id,
      appointmentId: reminder.appointmentId,
      channel: reminder.channel,
      status: sent ? ReminderStatus.SENT : reminder.status,
    });

    return {
      ok: true,
      status: sent ? ReminderStatus.SENT : reminder.status,
    };
  },
});
