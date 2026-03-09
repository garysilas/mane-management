import Link from "next/link";
import { AppointmentStatus } from "@prisma/client";
import { notFound } from "next/navigation";

import { ClientNoteForm } from "@/components/forms/client-note-form";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { clientIdSchema } from "@/lib/validators/client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

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

export default async function ClientProfilePage({ params }: PageProps) {
  const idValidation = clientIdSchema.safeParse(await params);
  if (!idValidation.success) {
    notFound();
  }

  const barber = await getOrCreateCurrentBarber();

  const client = await prisma.client.findFirst({
    where: {
      id: idValidation.data.id,
      barberId: barber.id,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      notes: true,
      _count: {
        select: {
          appointments: {
            where: { status: AppointmentStatus.COMPLETED },
          },
        },
      },
      appointments: {
        orderBy: { startTime: "desc" },
        select: {
          id: true,
          startTime: true,
          status: true,
          notes: true,
          service: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (!client) {
    notFound();
  }

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href="/clients" className="text-sm text-zinc-600 underline-offset-2 hover:underline">
          Back to Clients
        </Link>
        <h2 className="text-xl font-semibold text-zinc-900">{client.name}</h2>
        <div className="text-sm text-zinc-600">
          <p>{client.email || "No email on file"}</p>
          <p>{client.phone || "No phone on file"}</p>
          <p>
            Total visits: <span className="font-medium text-zinc-900">{client._count.appointments}</span>
          </p>
        </div>
      </header>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">Notes</h3>
        <ClientNoteForm clientId={client.id} />
        <div className="rounded-xl border border-zinc-200 p-4 text-sm text-zinc-700">
          {client.notes?.trim() ? (
            <p className="whitespace-pre-wrap">{client.notes}</p>
          ) : (
            <p className="text-zinc-600">No notes yet.</p>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-semibold text-zinc-900">Appointment History</h3>
        {client.appointments.length === 0 ? (
          <p className="text-sm text-zinc-600">No appointment history yet.</p>
        ) : (
          <ul className="space-y-2">
            {client.appointments.map((appointment) => (
              <li key={appointment.id} className="rounded-xl border border-zinc-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-zinc-900">{appointment.service.name}</p>
                    <p className="text-sm text-zinc-600">{formatAppointmentTime(appointment.startTime, barber.timezone)}</p>
                    <p className="text-sm text-zinc-600">
                      Appointment note: {appointment.notes?.trim() ? appointment.notes : "None"}
                    </p>
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
    </div>
  );
}
