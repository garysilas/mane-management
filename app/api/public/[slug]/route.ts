import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

type RouteProps = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, { params }: RouteProps) {
  const { slug } = await params;

  const barber = await prisma.barber.findUnique({
    where: { slug },
    select: {
      slug: true,
      name: true,
      businessName: true,
      location: true,
      services: {
        where: {
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
      },
    },
  });

  if (!barber) {
    return NextResponse.json({ error: "Barber not found." }, { status: 404 });
  }

  return NextResponse.json({
    barber: {
      slug: barber.slug,
      name: barber.name,
      businessName: barber.businessName,
      location: barber.location,
    },
    services: barber.services,
  });
}
