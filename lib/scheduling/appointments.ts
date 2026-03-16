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

export type ExistingClientRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

export type BookingClientInput = CreateAppointmentInput["client"];

const MAX_TRANSACTION_RETRIES = 2;

function normalizeOptionalText(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function dedupeClientsById(clients: ExistingClientRecord[]): ExistingClientRecord[] {
  const uniqueClients = new Map<string, ExistingClientRecord>();

  for (const client of clients) {
    if (!uniqueClients.has(client.id)) {
      uniqueClients.set(client.id, client);
    }
  }

  return Array.from(uniqueClients.values());
}

function hasExactContactMatch(existing: ExistingClientRecord, client: BookingClientInput): boolean {
  const email = normalizeOptionalText(client.email);
  const phone = normalizeOptionalText(client.phone);

  return Boolean(email && phone && existing.email === email && existing.phone === phone);
}

function isCompatibleClient(existing: ExistingClientRecord, client: BookingClientInput): boolean {
  const email = normalizeOptionalText(client.email);
  const phone = normalizeOptionalText(client.phone);

  const emailIsCompatible = !email || !existing.email || existing.email === email;
  const phoneIsCompatible = !phone || !existing.phone || existing.phone === phone;

  return emailIsCompatible && phoneIsCompatible;
}

export function selectClientForBooking(params: {
  emailMatches: ExistingClientRecord[];
  phoneMatches: ExistingClientRecord[];
  client: BookingClientInput;
}): ExistingClientRecord | null {
  const candidates = dedupeClientsById([...params.emailMatches, ...params.phoneMatches]);

  const exactMatches = candidates.filter((candidate) => hasExactContactMatch(candidate, params.client));
  if (exactMatches.length === 1) {
    return exactMatches[0];
  }

  if (exactMatches.length > 1) {
    return null;
  }

  const compatibleMatches = candidates.filter((candidate) => isCompatibleClient(candidate, params.client));
  if (compatibleMatches.length === 1) {
    return compatibleMatches[0];
  }

  return null;
}

export function buildClientUpdateData(params: {
  existing: ExistingClientRecord;
  client: BookingClientInput;
}): Prisma.ClientUpdateInput {
  const email = normalizeOptionalText(params.client.email);
  const phone = normalizeOptionalText(params.client.phone);
  const notes = normalizeOptionalText(params.client.notes);

  const data: Prisma.ClientUpdateInput = {
    email: params.existing.email ?? email,
    phone: params.existing.phone ?? phone,
    notes: params.existing.notes ?? notes,
  };

  if (hasExactContactMatch(params.existing, params.client)) {
    data.name = params.client.name;
  }

  return data;
}

async function findOrCreateClient(tx: Prisma.TransactionClient, input: CreateAppointmentInput) {
  const { barberId, client } = input;
  const email = normalizeOptionalText(client.email);
  const phone = normalizeOptionalText(client.phone);
  const notes = normalizeOptionalText(client.notes);

  const [emailMatches, phoneMatches] = await Promise.all([
    email
      ? tx.client.findMany({
          where: {
            barberId,
            email,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
          },
        })
      : Promise.resolve([]),
    phone
      ? tx.client.findMany({
          where: {
            barberId,
            phone,
          },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            notes: true,
          },
        })
      : Promise.resolve([]),
  ]);

  const existing = selectClientForBooking({
    emailMatches,
    phoneMatches,
    client: {
      ...client,
      email,
      phone,
      notes,
    },
  });

  if (existing) {
    return tx.client.update({
      where: { id: existing.id },
      data: buildClientUpdateData({
        existing,
        client: {
          ...client,
          email,
          phone,
          notes,
        },
      }),
    });
  }

  return tx.client.create({
    data: {
      barberId,
      name: client.name,
      email,
      phone,
      notes,
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
