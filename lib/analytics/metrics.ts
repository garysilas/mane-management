import { AppointmentStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const DUE_BACK_SOON_MIN_DAYS = 14;
const OVERDUE_MIN_DAYS = 30;

type RetentionAppointment = {
  clientId: string;
  startTime: Date;
  status: AppointmentStatus;
};

function getDaysSince(date: Date, now: Date): number {
  return Math.floor((now.getTime() - date.getTime()) / DAY_IN_MS);
}

function calculateRetentionMetrics(params: {
  appointments: RetentionAppointment[];
  clientCount: number;
  now: Date;
}) {
  const appointmentsByClient = new Map<string, RetentionAppointment[]>();
  const clientsWithFutureBookings = new Set<string>();

  for (const appointment of params.appointments) {
    if (!appointmentsByClient.has(appointment.clientId)) {
      appointmentsByClient.set(appointment.clientId, []);
    }

    appointmentsByClient.get(appointment.clientId)?.push(appointment);

    if (appointment.status === AppointmentStatus.BOOKED && appointment.startTime >= params.now) {
      clientsWithFutureBookings.add(appointment.clientId);
    }
  }

  let overdueClientCount = 0;
  let dueBackSoonCount = 0;
  let repeatClientCount = 0;
  const visitIntervals: number[] = [];

  for (const [clientId, appointments] of Array.from(appointmentsByClient.entries())) {
    const completedAppointments = appointments
      .filter((appointment) => appointment.status === AppointmentStatus.COMPLETED)
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    if (completedAppointments.length === 0) {
      continue;
    }

    if (completedAppointments.length >= 2) {
      repeatClientCount += 1;

      for (let index = 1; index < completedAppointments.length; index += 1) {
        visitIntervals.push(
          Math.round((completedAppointments[index].startTime.getTime() - completedAppointments[index - 1].startTime.getTime()) / DAY_IN_MS),
        );
      }
    }

    if (clientsWithFutureBookings.has(clientId)) {
      continue;
    }

    const lastCompletedAppointment = completedAppointments[completedAppointments.length - 1];
    const daysSinceLastVisit = getDaysSince(lastCompletedAppointment.startTime, params.now);

    if (daysSinceLastVisit > OVERDUE_MIN_DAYS) {
      overdueClientCount += 1;
    } else if (daysSinceLastVisit >= DUE_BACK_SOON_MIN_DAYS) {
      dueBackSoonCount += 1;
    }
  }

  const averageDaysBetweenVisits =
    visitIntervals.length > 0
      ? Math.round(visitIntervals.reduce((total, interval) => total + interval, 0) / visitIntervals.length)
      : 0;

  return {
    overdueClientCount,
    dueBackSoonCount,
    repeatClientCount,
    repeatClientRate: params.clientCount > 0 ? Math.round((repeatClientCount / params.clientCount) * 100) : 0,
    averageDaysBetweenVisits,
  };
}

export async function getBarberAnalytics(barberId: string) {
  const now = new Date();
  const [upcomingCount, clientCount, completedCount, retentionAppointments] = await Promise.all([
    prisma.appointment.count({
      where: {
        barberId,
        status: AppointmentStatus.BOOKED,
        startTime: { gte: now },
      },
    }),
    prisma.client.count({ where: { barberId } }),
    prisma.appointment.count({ where: { barberId, status: AppointmentStatus.COMPLETED } }),
    prisma.appointment.findMany({
      where: {
        barberId,
        status: { in: [AppointmentStatus.COMPLETED, AppointmentStatus.BOOKED] },
      },
      select: {
        clientId: true,
        startTime: true,
        status: true,
      },
      orderBy: [{ clientId: "asc" }, { startTime: "asc" }],
    }),
  ]);

  return {
    upcomingCount,
    clientCount,
    completedCount,
    ...calculateRetentionMetrics({
      appointments: retentionAppointments,
      clientCount,
      now,
    }),
  };
}
