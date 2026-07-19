import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { serviceIdSchema, serviceSchema, serviceUpdateSchema } from "@/lib/validators/service";

type RouteProps = {
  params: Promise<{ id: string }>;
};

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const idValidation = serviceIdSchema.safeParse(await params);
    if (!idValidation.success) {
      return NextResponse.json({ error: idValidation.error.issues[0]?.message ?? "Invalid service id." }, { status: 400 });
    }
    const { id } = idValidation.data;
    const payload = await request.json();

    const parsed = serviceUpdateSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    const existing = await prisma.service.findFirst({
      where: { id, barberId: barber.id },
      select: {
        id: true,
        name: true,
        description: true,
        durationMinutes: true,
        priceCents: true,
        sortOrder: true,
        isFeatured: true,
        category: true,
        isActive: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    const mergedService = {
      name: parsed.data.name ?? existing.name,
      description: Object.prototype.hasOwnProperty.call(parsed.data, "description")
        ? (parsed.data.description ?? null)
        : existing.description,
      durationMinutes: parsed.data.durationMinutes ?? existing.durationMinutes,
      priceCents: parsed.data.priceCents ?? existing.priceCents,
      sortOrder: parsed.data.sortOrder ?? existing.sortOrder,
      isFeatured: parsed.data.isFeatured ?? existing.isFeatured,
      category: Object.prototype.hasOwnProperty.call(parsed.data, "category")
        ? (parsed.data.category ?? null)
        : existing.category,
      isActive: parsed.data.isActive ?? existing.isActive,
    };

    const mergedValidation = serviceSchema.safeParse(mergedService);
    if (!mergedValidation.success) {
      return NextResponse.json(
        { error: mergedValidation.error.issues[0]?.message ?? "Invalid service payload." },
        { status: 400 },
      );
    }

    const updated = await prisma.service.update({
      where: { id },
      data: mergedValidation.data,
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
    const idValidation = serviceIdSchema.safeParse(await params);
    if (!idValidation.success) {
      return NextResponse.json({ error: idValidation.error.issues[0]?.message ?? "Invalid service id." }, { status: 400 });
    }
    const { id } = idValidation.data;

    const existing = await prisma.service.findFirst({ where: { id, barberId: barber.id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found." }, { status: 404 });
    }

    try {
      await prisma.service.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        return NextResponse.json(
          { error: "This service has existing appointments and cannot be deleted." },
          { status: 409 },
        );
      }

      throw error;
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to delete service." }, { status: 500 });
  }
}
