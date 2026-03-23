import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { barberSettingsSchema } from "@/lib/validators/barber";

export async function PATCH(request: Request) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const payload = await request.json();
    const parsed = barberSettingsSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid barber settings payload." },
        { status: 400 },
      );
    }

    const updatedBarber = await prisma.barber.update({
      where: { id: barber.id },
      data: {
        businessName: parsed.data.businessName,
        location: parsed.data.location,
        timezone: parsed.data.timezone,
      },
      select: {
        businessName: true,
        location: true,
        timezone: true,
        slug: true,
        email: true,
      },
    });

    return NextResponse.json(updatedBarber);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to update barber settings." }, { status: 500 });
  }
}
