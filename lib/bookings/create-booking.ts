import { prisma } from "@/lib/db/prisma";
import { sendBookingEmail } from "@/lib/email/resend";
import { sendSmsReminder } from "@/lib/messaging/twilio";
import { createAppointment } from "@/lib/scheduling/appointments";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import type { PublicBookingInput } from "@/lib/validators/booking";

export type BookingBarber = {
  id: string;
  name: string;
  businessName: string | null;
};

type BookingLookupInput = {
  barberId?: string;
  barberSlug?: string;
};

export async function findBookingBarberBySlug(slug: string): Promise<BookingBarber | null> {
  return prisma.barber.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      businessName: true,
    },
  });
}

export async function findBookingBarberByIdOrSlug(input: BookingLookupInput): Promise<BookingBarber | null> {
  if (input.barberId) {
    return prisma.barber.findUnique({
      where: { id: input.barberId },
      select: {
        id: true,
        name: true,
        businessName: true,
      },
    });
  }

  if (input.barberSlug) {
    return findBookingBarberBySlug(input.barberSlug);
  }

  return null;
}

export async function createConfirmedBooking(barber: BookingBarber, input: PublicBookingInput) {
  const appointment = await createAppointment({
    barberId: barber.id,
    serviceId: input.serviceId,
    startTime: new Date(input.startTime),
    bookingSource: "PUBLIC_PAGE",
    notes: input.notes,
    client: {
      name: input.name,
      email: input.email,
      phone: input.phone,
    },
  });

  const businessName = barber.businessName ?? barber.name;
  const confirmations: Promise<unknown>[] = [];

  if (input.email) {
    confirmations.push(
      sendBookingEmail({
        to: input.email,
        subject: `Booking confirmed with ${businessName}`,
        html: `<p>Your appointment is booked for ${appointment.startTime.toISOString()}.</p>`,
      }),
    );
  }

  if (input.phone) {
    confirmations.push(sendSmsReminder(input.phone, `Booking confirmed with ${businessName}.`));
  }

  if (confirmations.length > 0) {
    const results = await Promise.allSettled(confirmations);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("Booking confirmation delivery failed.", result.reason);
      }
    }
  }

  return {
    id: appointment.id,
    status: appointment.status,
    startTime: appointment.startTime.toISOString(),
    endTime: appointment.endTime.toISOString(),
  };
}

export function getBookingErrorResponse(error: unknown) {
  if (error instanceof ConflictError) {
    return { error: error.message, status: 409 };
  }

  if (error instanceof NotFoundError) {
    return { error: error.message, status: 404 };
  }

  return { error: "Unable to create appointment.", status: 500 };
}
