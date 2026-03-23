import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { timeOffBlockIdSchema, timeOffBlockSchema, timeOffBlockUpdateSchema } from "@/lib/validators/time-off";

type RouteProps = {
  params: Promise<{ id: string }>;
};

function normalizeOptionalReason(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const idValidation = timeOffBlockIdSchema.safeParse(await params);
    if (!idValidation.success) {
      return NextResponse.json({ error: idValidation.error.issues[0]?.message ?? "Invalid time off block id." }, { status: 400 });
    }

    const { id } = idValidation.data;
    const payload = await request.json();
    const parsed = timeOffBlockUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    const existingBlock = await prisma.timeOffBlock.findFirst({
      where: { id, barberId: barber.id },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });

    if (!existingBlock) {
      return NextResponse.json({ error: "Time-off block not found." }, { status: 404 });
    }

    const mergedBlock = {
      startTime: parsed.data.startTime ?? existingBlock.startTime.toISOString(),
      endTime: parsed.data.endTime ?? existingBlock.endTime.toISOString(),
      reason: Object.prototype.hasOwnProperty.call(parsed.data, "reason")
        ? normalizeOptionalReason(parsed.data.reason)
        : existingBlock.reason,
    };

    const mergedValidation = timeOffBlockSchema.safeParse(mergedBlock);
    if (!mergedValidation.success) {
      return NextResponse.json(
        { error: mergedValidation.error.issues[0]?.message ?? "Invalid time-off block." },
        { status: 400 },
      );
    }

    const updatedBlock = await prisma.timeOffBlock.update({
      where: { id },
      data: {
        startTime: new Date(mergedValidation.data.startTime),
        endTime: new Date(mergedValidation.data.endTime),
        reason: normalizeOptionalReason(mergedValidation.data.reason),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });

    return NextResponse.json(updatedBlock);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to update time-off block." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const idValidation = timeOffBlockIdSchema.safeParse(await params);
    if (!idValidation.success) {
      return NextResponse.json({ error: idValidation.error.issues[0]?.message ?? "Invalid time off block id." }, { status: 400 });
    }

    const { id } = idValidation.data;
    const existingBlock = await prisma.timeOffBlock.findFirst({
      where: { id, barberId: barber.id },
      select: { id: true },
    });

    if (!existingBlock) {
      return NextResponse.json({ error: "Time-off block not found." }, { status: 404 });
    }

    await prisma.timeOffBlock.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to delete time-off block." }, { status: 500 });
  }
}
