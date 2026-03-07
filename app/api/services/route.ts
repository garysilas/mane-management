import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { serviceSchema } from "@/lib/validators/service";

export async function GET() {
  try {
    const barber = await getOrCreateCurrentBarber();
    const services = await prisma.service.findMany({
      where: { barberId: barber.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(services);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to load services." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const payload = await request.json();
    const parsed = serviceSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid service payload." }, { status: 400 });
    }

    const service = await prisma.service.create({
      data: {
        ...parsed.data,
        barberId: barber.id,
        description: parsed.data.description ?? null,
      },
    });

    return NextResponse.json(service, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to create service." }, { status: 500 });
  }
}
