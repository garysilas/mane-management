import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { generateTimeSlots } from "@/lib/scheduling";
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

  const dayStart = new Date(`${parsed.data.date}T00:00:00.000Z`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const barber = await prisma.barber.findUnique({
    where: { slug },
    select: {
      id: true,
      availability: {
        where: { isActive: true },
        select: {
          dayOfWeek: true,
          startTimeLocal: true,
          endTimeLocal: true,
          isActive: true,
        },
      },
      timeOffBlocks: {
        where: {
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      },
    },
  });

  if (!barber) {
    return NextResponse.json({ error: "Barber not found." }, { status: 404 });
  }

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
    date: dayStart,
    serviceDurationMinutes: service.durationMinutes,
    availabilityRules: barber.availability,
    appointments,
    timeOffBlocks: barber.timeOffBlocks,
    slotIntervalMinutes: 15,
  });

  return NextResponse.json(
    slots.map((slot) => ({
      startTime: slot.startTime.toISOString(),
      endTime: slot.endTime.toISOString(),
    })),
  );
}
