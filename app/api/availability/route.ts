import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { hasAvailabilityRuleOverlap } from "@/lib/scheduling/availability-rules";
import { UnauthorizedError } from "@/lib/utils/errors";
import { availabilityRuleSchema } from "@/lib/validators/availability";

async function hasAvailabilityOverlap(params: {
  barberId: string;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  excludeRuleId?: string;
}): Promise<boolean> {
  const { barberId, dayOfWeek, startTimeLocal, endTimeLocal, excludeRuleId } = params;
  const existingRules = await prisma.availabilityRule.findMany({
    where: {
      barberId,
      dayOfWeek,
      isActive: true,
      ...(excludeRuleId ? { id: { not: excludeRuleId } } : {}),
    },
    select: {
      startTimeLocal: true,
      endTimeLocal: true,
    },
  });

  return hasAvailabilityRuleOverlap({ startTimeLocal, endTimeLocal }, existingRules);
}

export async function GET() {
  try {
    const barber = await getOrCreateCurrentBarber();
    const rules = await prisma.availabilityRule.findMany({
      where: { barberId: barber.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTimeLocal: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        startTimeLocal: true,
        endTimeLocal: true,
        isActive: true,
      },
    });

    return NextResponse.json(rules);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to load availability rules." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const payload = await request.json();
    const parsed = availabilityRuleSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid availability payload." }, { status: 400 });
    }

    if (parsed.data.isActive) {
      const hasOverlap = await hasAvailabilityOverlap({
        barberId: barber.id,
        dayOfWeek: parsed.data.dayOfWeek,
        startTimeLocal: parsed.data.startTimeLocal,
        endTimeLocal: parsed.data.endTimeLocal,
      });

      if (hasOverlap) {
        return NextResponse.json(
          { error: "Availability rule overlaps with an existing active rule for this day." },
          { status: 409 },
        );
      }
    }

    const rule = await prisma.availabilityRule.create({
      data: {
        barberId: barber.id,
        dayOfWeek: parsed.data.dayOfWeek,
        startTimeLocal: parsed.data.startTimeLocal,
        endTimeLocal: parsed.data.endTimeLocal,
        isActive: parsed.data.isActive,
      },
      select: {
        id: true,
        dayOfWeek: true,
        startTimeLocal: true,
        endTimeLocal: true,
        isActive: true,
      },
    });

    return NextResponse.json(rule, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to create availability rule." }, { status: 500 });
  }
}
