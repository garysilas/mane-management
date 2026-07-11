import {
  AppointmentStatus,
  BookingSource,
  Prisma,
  ReminderChannel,
  ReminderStatus,
  ReminderType,
} from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { getBarberAvailabilityForDate, isTimeSlotAvailable, overlaps } from "@/lib/scheduling/engine";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import { addMinutes, endOfTimeZoneDay, getDateStringInTimeZone, startOfTimeZoneDay } from "@/lib/utils/time";

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

export const BOOKING_VALIDATION_ERRORS = {
  past: "This time slot is no longer available.",
  outsideAvailability: "This time slot is no longer available.",
  timeOffConflict: "This time slot is no longer available.",
  overlap: "This time slot is no longer available.",
} as const;

type BookingValidationInput = {
  proposedStartTime: Date;
  proposedEndTime: Date;
  availabilityRules: Array<{
    dayOfWeek: number;
    startTimeLocal: string;
    endTimeLocal: string;
    isActive: boolean;
  }>;
  timeOffBlocks: Array<{
    startTime: Date;
    endTime: Date;
  }>;
  appointments: Array<{
    startTime: Date;
    endTime: Date;
    status?: AppointmentStatus;
  }>;
  now?: Date;
  timeZone?: string;
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

export type AppointmentLifecycleStatus = Extract<AppointmentStatus, "CANCELLED" | "COMPLETED" | "NO_SHOW">;

export function canTransitionAppointmentStatus(
  currentStatus: AppointmentStatus,
  nextStatus: AppointmentStatus,
): nextStatus is AppointmentLifecycleStatus {
  return (
    currentStatus === AppointmentStatus.BOOKED &&
    (nextStatus === AppointmentStatus.CANCELLED ||
      nextStatus === AppointmentStatus.COMPLETED ||
      nextStatus === AppointmentStatus.NO_SHOW)
  );
}

export function getBookingValidationError(input: BookingValidationInput): string | null {
  const now = input.now ?? new Date();
  const timeZone = input.timeZone ?? "UTC";

  if (input.proposedStartTime <= now) {
    return BOOKING_VALIDATION_ERRORS.past;
  }

  const availableWindows = getBarberAvailabilityForDate({
    date: input.proposedStartTime,
    timeZone,
    availabilityRules: input.availabilityRules,
    timeOffBlocks: [],
  });

  const isInsideAvailability = availableWindows.some(
    (window) => input.proposedStartTime >= window.startTime && input.proposedEndTime <= window.endTime,
  );

  if (!isInsideAvailability) {
    return BOOKING_VALIDATION_ERRORS.outsideAvailability;
  }

  const overlapsTimeOff = input.timeOffBlocks.some((block) =>
    overlaps(input.proposedStartTime, input.proposedEndTime, block.startTime, block.endTime),
  );

  if (overlapsTimeOff) {
    return BOOKING_VALIDATION_ERRORS.timeOffConflict;
  }

  if (!isTimeSlotAvailable(input.proposedStartTime, input.proposedEndTime, input.appointments)) {
    return BOOKING_VALIDATION_ERRORS.overlap;
  }

  return null;
}

function requiresPastAppointmentForStatus(status: AppointmentLifecycleStatus): boolean {
  return status === AppointmentStatus.COMPLETED || status === AppointmentStatus.NO_SHOW;
}

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

export async function updateAppointmentStatus(input: {
  appointmentId: string;
  barberId: string;
  status: AppointmentLifecycleStatus;
}) {
  const now = new Date();
  const appointment = await prisma.appointment.findFirst({
    where: {
      id: input.appointmentId,
      barberId: input.barberId,
    },
    select: {
      id: true,
      startTime: true,
      status: true,
    },
  });

  if (!appointment) {
    throw new NotFoundError("Appointment not found.");
  }

  if (!canTransitionAppointmentStatus(appointment.status, input.status)) {
    throw new ConflictError("Only booked appointments can be marked as cancelled, completed, or no show.");
  }

  if (requiresPastAppointmentForStatus(input.status) && appointment.startTime >= now) {
    throw new ConflictError("Only past appointments can be marked as completed or no show.");
  }

  const result = await prisma.appointment.updateMany({
    where: {
      id: appointment.id,
      barberId: input.barberId,
      status: AppointmentStatus.BOOKED,
      ...(requiresPastAppointmentForStatus(input.status) ? { startTime: { lt: now } } : {}),
    },
    data: { status: input.status },
  });

  if (result.count !== 1) {
    throw new ConflictError("Only booked appointments can be marked as cancelled, completed, or no show.");
  }

  if (input.status === AppointmentStatus.CANCELLED) {
    await prisma.reminder.updateMany({
      where: {
        appointmentId: appointment.id,
        status: ReminderStatus.PENDING,
      },
      data: {
        status: ReminderStatus.CANCELLED,
      },
    });
  }

  return {
    id: appointment.id,
    status: input.status,
  };
}

export async function createAppointment(input: CreateAppointmentInput) {
  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const barber = await tx.barber.findUnique({
            where: { id: input.barberId },
            select: {
              id: true,
              timezone: true,
              availability: {
                where: { isActive: true },
                select: {
                  dayOfWeek: true,
                  startTimeLocal: true,
                  endTimeLocal: true,
                  isActive: true,
                },
              },
            },
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

          if (startTime <= new Date()) {
            throw new ConflictError(BOOKING_VALIDATION_ERRORS.past);
          }

          const localDate = getDateStringInTimeZone(startTime, barber.timezone);
          const dayStart = startOfTimeZoneDay(localDate, barber.timezone);
          const dayEnd = endOfTimeZoneDay(localDate, barber.timezone);

          const timeOffBlocks = await tx.timeOffBlock.findMany({
            where: {
              barberId: input.barberId,
              startTime: { lt: dayEnd },
              endTime: { gt: dayStart },
            },
            select: {
              startTime: true,
              endTime: true,
            },
          });

          const preAppointmentValidationError = getBookingValidationError({
            proposedStartTime: startTime,
            proposedEndTime: endTime,
            availabilityRules: barber.availability,
            timeOffBlocks,
            appointments: [],
            timeZone: barber.timezone,
          });

          if (preAppointmentValidationError) {
            throw new ConflictError(preAppointmentValidationError);
          }

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

          const validationError = getBookingValidationError({
            proposedStartTime: startTime,
            proposedEndTime: endTime,
            availabilityRules: barber.availability,
            timeOffBlocks,
            appointments: existingAppointments,
            timeZone: barber.timezone,
          });

          if (validationError) {
            throw new ConflictError(validationError);
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
        throw new ConflictError(BOOKING_VALIDATION_ERRORS.overlap);
      }

      throw error;
    }
  }

  throw new ConflictError(BOOKING_VALIDATION_ERRORS.overlap);
}
