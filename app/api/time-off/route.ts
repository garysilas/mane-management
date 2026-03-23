import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { timeOffBlockSchema } from "@/lib/validators/time-off";

function normalizeOptionalReason(value?: string | null): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export async function GET() {
  try {
    const barber = await getOrCreateCurrentBarber();
    const blocks = await prisma.timeOffBlock.findMany({
      where: { barberId: barber.id },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });

    return NextResponse.json(blocks);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to load time-off blocks." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const payload = await request.json();
    const parsed = timeOffBlockSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid time-off payload." }, { status: 400 });
    }

    const block = await prisma.timeOffBlock.create({
      data: {
        barberId: barber.id,
        startTime: new Date(parsed.data.startTime),
        endTime: new Date(parsed.data.endTime),
        reason: normalizeOptionalReason(parsed.data.reason),
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });

    return NextResponse.json(block, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to create time-off block." }, { status: 500 });
  }
}
