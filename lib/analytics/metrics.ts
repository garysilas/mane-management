import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export async function getBarberAnalytics(barberId: string) {
  const [upcomingCount, clientCount, completedCount] = await Promise.all([
    prisma.appointment.count({
      where: {
        barberId,
        status: AppointmentStatus.BOOKED,
        startTime: { gte: new Date() },
      },
    }),
    prisma.client.count({ where: { barberId } }),
    prisma.appointment.count({ where: { barberId, status: AppointmentStatus.COMPLETED } }),
  ]);

  return {
    upcomingCount,
    clientCount,
    completedCount,
  };
}
