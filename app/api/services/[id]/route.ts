import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { serviceUpdateSchema } from "@/lib/validators/service";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const { id } = await params;
    const payload = await request.json();

    const parsed = serviceUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    const existing = await prisma.service.findFirst({ where: { id, barberId: barber.id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    const updated = await prisma.service.update({
      where: { id },
      data: {
        ...parsed.data,
        description: parsed.data.description ?? existing.description,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to update service." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const { id } = await params;

    const existing = await prisma.service.findFirst({ where: { id, barberId: barber.id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    await prisma.service.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to delete service." }, { status: 500 });
  }
}
