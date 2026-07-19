import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { publicWaitlistRequestSchema } from "@/lib/validators/waitlist";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function POST(request: Request, { params }: RouteProps) {
  const { slug } = await params;
  const payload = await request.json().catch(() => null);
  const parsed = publicWaitlistRequestSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid waitlist payload." }, { status: 400 });
  }

  const barber = await prisma.barber.findUnique({
    where: { slug },
    select: {
      id: true,
      services: {
        where: { isActive: true },
        select: { id: true },
      },
    },
  });

  if (!barber) {
    return NextResponse.json({ error: "Barber not found." }, { status: 404 });
  }

  const serviceId = parsed.data.serviceId;
  if (serviceId && !barber.services.some((service) => service.id === serviceId)) {
    return NextResponse.json({ error: "Service not found." }, { status: 404 });
  }

  const waitlistRequest = await prisma.waitlistRequest.create({
    data: {
      barberId: barber.id,
      serviceId,
      clientName: parsed.data.clientName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      preferredDate: new Date(parsed.data.preferredDate),
      preferredWindow: parsed.data.preferredWindow,
    },
    select: {
      id: true,
      status: true,
      preferredDate: true,
    },
  });

  return NextResponse.json(waitlistRequest, { status: 201 });
}
