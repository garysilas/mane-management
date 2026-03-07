import {
  AppointmentStatus,
  BookingSource,
  Prisma,
  ReminderChannel,
  ReminderStatus,
  ReminderType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import { addMinutes } from "@/lib/utils/time";

type CreateAppointmentInput = {
  barberId: string;
  serviceId: string;
  startTime: Date;
  bookingSource: BookingSource;
  notes?: string | null;
  client: {
    name: string;
    email?: string | null;
    phone?: string | null;
    notes?: string | null;
  };
};

async function findOrCreateClient(tx: Prisma.TransactionClient, input: CreateAppointmentInput) {
  const { barberId, client } = input;
  const orConditions = [
    client.email ? { email: client.email } : null,
    client.phone ? { phone: client.phone } : null,
  ].filter(Boolean) as Array<{ email?: string; phone?: string }>;

  if (orConditions.length > 0) {
    const existing = await tx.client.findFirst({
      where: {
        barberId,
        OR: orConditions,
      },
    });

    if (existing) {
      return tx.client.update({
        where: { id: existing.id },
        data: {
          name: client.name,
          email: client.email,
          phone: client.phone,
          notes: client.notes,
        },
      });
    }
  }

  return tx.client.create({
    data: {
      barberId,
      name: client.name,
      email: client.email,
      phone: client.phone,
      notes: client.notes,
    },
  });
}

export async function createAppointment(input: CreateAppointmentInput) {
  return prisma.$transaction(
    async (tx) => {
      const service = await tx.service.findFirst({
        where: {
          id: input.serviceId,
          barberId: input.barberId,
          isActive: true,
        },
      });

      if (!service) {
        throw new NotFoundError("Service not found.");
      }

      const startTime = input.startTime;
      const endTime = addMinutes(startTime, service.durationMinutes);

      const conflictingAppointment = await tx.appointment.findFirst({
        where: {
          barberId: input.barberId,
          status: AppointmentStatus.BOOKED,
          startTime: { lt: endTime },
          endTime: { gt: startTime },
        },
      });

      if (conflictingAppointment) {
        throw new ConflictError("This time slot is no longer available.");
      }

      const client = await findOrCreateClient(tx, input);

      const appointment = await tx.appointment.create({
        data: {
          barberId: input.barberId,
          clientId: client.id,
          serviceId: service.id,
          startTime,
          endTime,
          status: AppointmentStatus.BOOKED,
          bookingSource: input.bookingSource,
          notes: input.notes,
        },
      });

      const reminderTime = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
      const reminders = [] as Prisma.ReminderCreateManyInput[];

      if (client.phone) {
        reminders.push({
          appointmentId: appointment.id,
          channel: ReminderChannel.SMS,
          type: ReminderType.APPOINTMENT_REMINDER,
          scheduledFor: reminderTime,
          status: ReminderStatus.PENDING,
        });
      }

      if (client.email) {
        reminders.push({
          appointmentId: appointment.id,
          channel: ReminderChannel.EMAIL,
          type: ReminderType.APPOINTMENT_REMINDER,
          scheduledFor: reminderTime,
          status: ReminderStatus.PENDING,
        });
      }

      if (reminders.length > 0) {
        await tx.reminder.createMany({ data: reminders });
      }

      return appointment;
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    },
  );
}
