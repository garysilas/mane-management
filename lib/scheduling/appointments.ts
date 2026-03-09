import {
  AppointmentStatus,
  BookingSource,
  Prisma,
  ReminderChannel,
  ReminderStatus,
  ReminderType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { isTimeSlotAvailable } from "@/lib/scheduling/engine";
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

const MAX_TRANSACTION_RETRIES = 2;

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
  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const barber = await tx.barber.findUnique({
            where: { id: input.barberId },
            select: { id: true },
          });

          if (!barber) {
            throw new NotFoundError("Barber not found.");
          }

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

          const existingAppointments = await tx.appointment.findMany({
            where: {
              barberId: input.barberId,
              status: { not: AppointmentStatus.CANCELLED },
              startTime: { lt: endTime },
              endTime: { gt: startTime },
            },
            select: {
              startTime: true,
              endTime: true,
              status: true,
            },
          });

          const slotIsAvailable = isTimeSlotAvailable({
            proposedStartTime: startTime,
            proposedEndTime: endTime,
            appointments: existingAppointments,
          });

          if (!slotIsAvailable) {
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
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < MAX_TRANSACTION_RETRIES - 1
      ) {
        continue;
      }

      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
        throw new ConflictError("This time slot is no longer available.");
      }

      throw error;
    }
  }

  throw new ConflictError("This time slot is no longer available.");
}
