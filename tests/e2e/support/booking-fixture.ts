import { randomUUID } from "node:crypto";

import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

loadEnvConfig(process.cwd());

const prisma = new PrismaClient({
  log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
});

const BOOKING_DATE = "2099-03-10";
const SLOT_START_TIME = `${BOOKING_DATE}T15:00:00.000Z`;
const SLOT_END_TIME = `${BOOKING_DATE}T15:30:00.000Z`;

export type BookingFixture = {
  barberId: string;
  slug: string;
  serviceId: string;
  bookingDate: string;
  slotStartTime: string;
  slotEndTime: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string;
};

export async function createBookingFixture(): Promise<BookingFixture> {
  const id = randomUUID().replace(/-/g, "").slice(0, 12);
  const slug = `playwright-booking-${id}`;
  const barberEmail = `${slug}@example.com`;

  const barber = await prisma.barber.create({
    data: {
      clerkUserId: `pw-clerk-${id}`,
      slug,
      name: "Playwright Barber",
      businessName: "Playwright Fades",
      email: barberEmail,
      phone: null,
      location: "Test Shop",
      timezone: "UTC",
      availability: {
        createMany: {
          data: Array.from({ length: 7 }, (_, dayOfWeek) => ({
            dayOfWeek,
            startTimeLocal: "15:00",
            endTimeLocal: "17:00",
            isActive: true,
          })),
        },
      },
      services: {
        create: {
          name: "Haircut",
          description: "Classic cut",
          durationMinutes: 30,
          priceCents: 3500,
          isActive: true,
        },
      },
    },
    select: {
      id: true,
      slug: true,
      services: {
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  return {
    barberId: barber.id,
    slug: barber.slug,
    serviceId: barber.services[0]!.id,
    bookingDate: BOOKING_DATE,
    slotStartTime: SLOT_START_TIME,
    slotEndTime: SLOT_END_TIME,
    clientName: "Alex Client",
    clientEmail: `${slug}-client@example.com`,
    clientPhone: "+15555550100",
  };
}

export async function getBookedAppointment(fixture: BookingFixture) {
  return prisma.appointment.findFirst({
    where: {
      barberId: fixture.barberId,
      serviceId: fixture.serviceId,
      startTime: new Date(fixture.slotStartTime),
      client: {
        email: fixture.clientEmail,
      },
    },
    include: {
      client: true,
      reminders: true,
    },
  });
}

export async function cleanupBookingFixture(fixture: BookingFixture) {
  await prisma.$transaction(async (tx) => {
    const appointments = await tx.appointment.findMany({
      where: { barberId: fixture.barberId },
      select: { id: true },
    });

    const appointmentIds = appointments.map((appointment) => appointment.id);

    if (appointmentIds.length > 0) {
      await tx.reminder.deleteMany({
        where: {
          appointmentId: { in: appointmentIds },
        },
      });
    }

    await tx.appointment.deleteMany({
      where: { barberId: fixture.barberId },
    });

    await tx.client.deleteMany({
      where: { barberId: fixture.barberId },
    });

    await tx.service.deleteMany({
      where: { barberId: fixture.barberId },
    });

    await tx.availabilityRule.deleteMany({
      where: { barberId: fixture.barberId },
    });

    await tx.timeOffBlock.deleteMany({
      where: { barberId: fixture.barberId },
    });

    await tx.barber.deleteMany({
      where: { id: fixture.barberId },
    });
  });
}
