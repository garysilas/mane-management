import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const statusStyles: Record<AppointmentStatus, string> = {
  BOOKED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-zinc-200 text-zinc-700",
  NO_SHOW: "bg-amber-100 text-amber-700",
};

function formatAppointmentTime(value: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      dateStyle: "medium",
      timeStyle: "short",
    }).format(value);
  } catch {
    return new Date(value).toLocaleString("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }
}

export default async function CalendarPage() {
  const barber = await getOrCreateCurrentBarber();
  const now = new Date();

  const [upcomingAppointments, appointmentHistory] = await Promise.all([
    prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        startTime: { gte: now },
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startTime: "asc" },
      take: 25,
    }),
    prisma.appointment.findMany({
      where: {
        barberId: barber.id,
        startTime: { lt: now },
      },
      select: {
        id: true,
        startTime: true,
        status: true,
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: { startTime: "desc" },
      take: 50,
    }),
  ]);

  const sections = [
    {
      title: "Upcoming Appointments",
      emptyState: "No upcoming appointments.",
      items: upcomingAppointments,
    },
    {
      title: "Appointment History",
      emptyState: "No appointment history yet.",
      items: appointmentHistory,
    },
  ];

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.title} className="space-y-3">
          <h2 className="text-xl font-semibold text-zinc-900">{section.title}</h2>

          {section.items.length === 0 ? (
            <p className="text-sm text-zinc-600">{section.emptyState}</p>
          ) : (
            <ul className="space-y-2">
              {section.items.map((appointment) => (
                <li key={appointment.id} className="rounded-xl border border-zinc-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Link
                        href={`/clients/${appointment.client.id}`}
                        className="font-medium text-zinc-900 underline-offset-2 hover:underline"
                      >
                        {appointment.client.name}
                      </Link>
                      <p className="text-sm text-zinc-600">{appointment.service.name}</p>
                      <p className="text-sm text-zinc-600">{formatAppointmentTime(appointment.startTime, barber.timezone)}</p>
                    </div>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium uppercase tracking-wide ${statusStyles[appointment.status]}`}
                    >
                      {appointment.status.replace("_", " ")}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </div>
  );
}
