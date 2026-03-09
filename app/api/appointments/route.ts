import { BookingSource } from "@prisma/client";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { sendBookingEmail } from "@/lib/email/resend";
import { sendSmsReminder } from "@/lib/messaging/twilio";
import { createAppointment } from "@/lib/scheduling/appointments";
import { ConflictError, NotFoundError } from "@/lib/utils/errors";
import { appointmentCreateSchema } from "@/lib/validators/booking";

export async function POST(request: Request) {
  const parsed = appointmentCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid appointment payload." },
      { status: 400 },
    );
  }

  let barber: { id: string; name: string; businessName: string | null } | null = null;

  if (parsed.data.barberId) {
    barber = await prisma.barber.findUnique({
      where: { id: parsed.data.barberId },
      select: {
        id: true,
        name: true,
        businessName: true,
      },
    });
  } else if (parsed.data.barberSlug) {
    barber = await prisma.barber.findUnique({
      where: { slug: parsed.data.barberSlug },
      select: {
        id: true,
        name: true,
        businessName: true,
      },
    });
  }

  if (!barber) {
    return NextResponse.json({ error: "Barber not found." }, { status: 404 });
  }

  try {
    const appointment = await createAppointment({
      barberId: barber.id,
      serviceId: parsed.data.serviceId,
      startTime: new Date(parsed.data.startTime),
      bookingSource: BookingSource.PUBLIC_PAGE,
      notes: parsed.data.notes,
      client: {
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone,
      },
    });

    const businessName = barber.businessName ?? barber.name;

    if (parsed.data.email) {
      await sendBookingEmail({
        to: parsed.data.email,
        subject: `Booking confirmed with ${businessName}`,
        html: `<p>Your appointment is booked for ${appointment.startTime.toISOString()}.</p>`,
      });
    }

    if (parsed.data.phone) {
      await sendSmsReminder(parsed.data.phone, `Booking confirmed with ${businessName}.`);
    }

    return NextResponse.json(
      {
        id: appointment.id,
        status: appointment.status,
        startTime: appointment.startTime.toISOString(),
        endTime: appointment.endTime.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json({ error: "Unable to create appointment." }, { status: 500 });
  }
}
