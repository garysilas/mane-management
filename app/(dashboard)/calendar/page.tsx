import { AppointmentStatus } from "@prisma/client";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const barber = await getOrCreateCurrentBarber();

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: barber.id,
      status: AppointmentStatus.BOOKED,
      startTime: { gte: new Date() },
    },
    include: {
      client: true,
      service: true,
    },
    orderBy: { startTime: "asc" },
    take: 20,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Upcoming Appointments</h2>
      {appointments.length === 0 ? (
        <p className="text-sm text-zinc-600">No upcoming appointments.</p>
      ) : (
        <ul className="space-y-2">
          {appointments.map((appointment) => (
            <li key={appointment.id} className="rounded-lg border border-zinc-200 p-3">
              <p className="font-medium">{appointment.client.name}</p>
              <p className="text-sm text-zinc-600">{appointment.service.name}</p>
              <p className="text-sm text-zinc-600">{new Date(appointment.startTime).toLocaleString()}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
