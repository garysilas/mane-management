import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { hasAvailabilityRuleOverlap } from "@/lib/scheduling/availability-rules";
import { UnauthorizedError } from "@/lib/utils/errors";
import { availabilityRuleSchema, availabilityRuleUpdateSchema } from "@/lib/validators/availability";

type RouteProps = {
  params: Promise<{ id: string }>;
};

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

export async function PUT(request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const { id } = await params;
    const payload = await request.json();
    const parsed = availabilityRuleUpdateSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    const existingRule = await prisma.availabilityRule.findFirst({
      where: { id, barberId: barber.id },
      select: {
        id: true,
        dayOfWeek: true,
        startTimeLocal: true,
        endTimeLocal: true,
        isActive: true,
      },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Availability rule not found." }, { status: 404 });
    }

    const mergedRule = {
      dayOfWeek: parsed.data.dayOfWeek ?? existingRule.dayOfWeek,
      startTimeLocal: parsed.data.startTimeLocal ?? existingRule.startTimeLocal,
      endTimeLocal: parsed.data.endTimeLocal ?? existingRule.endTimeLocal,
      isActive: parsed.data.isActive ?? existingRule.isActive,
    };

    const mergedValidation = availabilityRuleSchema.safeParse(mergedRule);
    if (!mergedValidation.success) {
      return NextResponse.json(
        { error: mergedValidation.error.issues[0]?.message ?? "Invalid availability rule." },
        { status: 400 },
      );
    }

    if (mergedValidation.data.isActive) {
      const hasOverlap = await hasAvailabilityOverlap({
        barberId: barber.id,
        dayOfWeek: mergedValidation.data.dayOfWeek,
        startTimeLocal: mergedValidation.data.startTimeLocal,
        endTimeLocal: mergedValidation.data.endTimeLocal,
        excludeRuleId: id,
      });

      if (hasOverlap) {
        return NextResponse.json(
          { error: "Availability rule overlaps with an existing active rule for this day." },
          { status: 409 },
        );
      }
    }

    const updatedRule = await prisma.availabilityRule.update({
      where: { id },
      data: mergedValidation.data,
      select: {
        id: true,
        dayOfWeek: true,
        startTimeLocal: true,
        endTimeLocal: true,
        isActive: true,
      },
    });

    return NextResponse.json(updatedRule);
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to update availability rule." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();
    const { id } = await params;

    const existingRule = await prisma.availabilityRule.findFirst({
      where: { id, barberId: barber.id },
      select: { id: true },
    });

    if (!existingRule) {
      return NextResponse.json({ error: "Availability rule not found." }, { status: 404 });
    }

    await prisma.availabilityRule.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to delete availability rule." }, { status: 500 });
  }
}
