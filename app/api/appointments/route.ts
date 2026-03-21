import { NextResponse } from "next/server";

import {
  createConfirmedBooking,
  findBookingBarberByIdOrSlug,
  getBookingErrorResponse,
} from "@/lib/bookings/create-booking";
import { appointmentCreateSchema } from "@/lib/validators/booking";

export async function POST(request: Request) {
  const parsed = appointmentCreateSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid appointment payload." },
      { status: 400 },
    );
  }

  const barber = await findBookingBarberByIdOrSlug({
    barberId: parsed.data.barberId,
    barberSlug: parsed.data.barberSlug,
  });

  if (!barber) {
    return NextResponse.json({ error: "Barber not found." }, { status: 404 });
  }

  try {
    const appointment = await createConfirmedBooking(barber, parsed.data);
    return NextResponse.json(appointment, { status: 201 });
  } catch (error) {
    const response = getBookingErrorResponse(error);
    return NextResponse.json({ error: response.error }, { status: response.status });
  }
}
