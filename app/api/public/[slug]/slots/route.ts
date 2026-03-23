import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { generateTimeSlots } from "@/lib/scheduling";
import { endOfTimeZoneDay, startOfTimeZoneDay } from "@/lib/utils/time";
import { slotQuerySchema } from "@/lib/validators/booking";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const url = new URL(request.url);

  const parsed = slotQuerySchema.safeParse({
    serviceId: url.searchParams.get("serviceId"),
    date: url.searchParams.get("date"),
  });

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid slot query." }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({
    where: { slug },
    select: {
      id: true,
      timezone: true,
      availability: {
        where: { isActive: true },
        select: {
          dayOfWeek: true,
          startTimeLocal: true,
          endTimeLocal: true,
          isActive: true,
        },
      },
    },
  });

  if (!barber) {
    return NextResponse.json({ error: "Barber not found." }, { status: 404 });
  }

  const dayStart = startOfTimeZoneDay(parsed.data.date, barber.timezone);
  const dayEnd = endOfTimeZoneDay(parsed.data.date, barber.timezone);

  const service = await prisma.service.findFirst({
    where: {
      id: parsed.data.serviceId,
      barberId: barber.id,
      isActive: true,
    },
    select: { durationMinutes: true },
  });

  if (!service) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const timeOffBlocks = await prisma.timeOffBlock.findMany({
    where: {
      barberId: barber.id,
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    select: {
      startTime: true,
      endTime: true,
    },
  });

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: barber.id,
      startTime: { lt: dayEnd },
      endTime: { gt: dayStart },
    },
    select: {
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  const slots = generateTimeSlots({
    date: parsed.data.date,
    timeZone: barber.timezone,
    serviceDurationMinutes: service.durationMinutes,
    availabilityRules: barber.availability,
    appointments,
    timeOffBlocks,
    slotIntervalMinutes: 15,
  });

  return NextResponse.json(
    slots.map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
    })),
  );
}
