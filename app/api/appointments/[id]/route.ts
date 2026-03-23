import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { updateAppointmentStatus } from "@/lib/scheduling/appointments";
import { ConflictError, NotFoundError, UnauthorizedError } from "@/lib/utils/errors";
import { appointmentIdSchema, appointmentStatusUpdateSchema } from "@/lib/validators/appointment";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const idValidation = appointmentIdSchema.safeParse(await params);
    if (!idValidation.success) {
      return NextResponse.json(
        { error: idValidation.error.issues[0]?.message ?? "Invalid appointment id." },
        { status: 400 },
      );
    }

    const parsed = appointmentStatusUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    const appointment = await updateAppointmentStatus({
      appointmentId: idValidation.data.id,
      barberId: barber.id,
      status: parsed.data.status,
    });

    return NextResponse.json(appointment);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    if (error instanceof ConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    return NextResponse.json({ error: "Unable to update appointment." }, { status: 500 });
  }
}
