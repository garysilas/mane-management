import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

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

export default async function ClientsPage() {
  const barber = await getOrCreateCurrentBarber();
  const clients = await prisma.client.findMany({
    where: { barberId: barber.id },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      appointments: {
        orderBy: { startTime: "desc" },
        take: 1,
        select: {
          startTime: true,
          status: true,
        },
      },
      _count: {
        select: {
          appointments: {
            where: {
              status: AppointmentStatus.COMPLETED,
            },
          },
        },
      },
    },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-zinc-900">Clients</h2>
      {clients.length === 0 ? (
        <p className="text-sm text-zinc-600">No clients yet.</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <Link href={`/clients/${client.id}`} className="font-medium text-zinc-900 underline-offset-2 hover:underline">
                    {client.name}
                  </Link>
                  <p className="text-sm text-zinc-600">{client.email || "No email"}</p>
                  <p className="text-sm text-zinc-600">{client.phone || "No phone"}</p>
                </div>

                <div className="space-y-1 text-sm text-zinc-600">
                  <p>
                    Total visits: <span className="font-medium text-zinc-900">{client._count.appointments}</span>
                  </p>
                  <p>
                    Last appointment:{" "}
                    <span className="font-medium text-zinc-900">
                      {client.appointments[0]
                        ? `${formatAppointmentTime(client.appointments[0].startTime, barber.timezone)} (${client.appointments[0].status.replace("_", " ")})`
                        : "No appointments yet"}
                    </span>
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
