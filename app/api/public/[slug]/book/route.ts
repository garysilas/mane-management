import { NextResponse } from "next/server";

import {
  createConfirmedBooking,
  findBookingBarberBySlug,
  getBookingErrorResponse,
} from "@/lib/bookings/create-booking";
import { publicBookingSchema } from "@/lib/validators/booking";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const parsed = publicBookingSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid booking payload." }, { status: 400 });
  }

  const barber = await findBookingBarberBySlug(slug);

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
