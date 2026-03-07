import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const barber = await prisma.barber.findUnique({ where: { slug }, select: { id: true } });
  if (!barber) {
    return NextResponse.json({ error: "Barber not found." }, { status: 404 });
  }

  const services = await prisma.service.findMany({
    where: {
      barberId: barber.id,
      isActive: true,
    },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
    },
  });

  return NextResponse.json(services);
}
