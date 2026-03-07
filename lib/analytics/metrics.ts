import { AppointmentStatus, PaymentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function getBarberAnalytics(barberId: string) {
  const [upcomingCount, clientCount, completedCount, totalRevenue] = await Promise.all([
    prisma.appointment.count({
      where: {
        barberId,
        status: AppointmentStatus.BOOKED,
        startTime: { gte: new Date() },
      },
    }),
    prisma.client.count({ where: { barberId } }),
    prisma.appointment.count({ where: { barberId, status: AppointmentStatus.COMPLETED } }),
    prisma.payment.aggregate({
      where: { barberId, status: PaymentStatus.SUCCEEDED },
      _sum: { amountCents: true, tipCents: true },
    }),
  ]);

  return {
    upcomingCount,
    clientCount,
    completedCount,
    totalRevenueCents: (totalRevenue._sum.amountCents ?? 0) + (totalRevenue._sum.tipCents ?? 0),
  };
}
