import Link from "next/link";

import { ServiceRowActions } from "@/components/forms/service-row-actions";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const barber = await getOrCreateCurrentBarber();
  const services = await prisma.service.findMany({
    where: { barberId: barber.id },
    orderBy: [{ isActive: "desc" }, { isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
      sortOrder: true,
      isFeatured: true,
      category: true,
      isActive: true,
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-1">
          <h2 className="text-xl font-semibold text-zinc-900">Service Catalog</h2>
          <p className="text-sm text-zinc-600">Create, update, deactivate, and delete your services.</p>
        </div>
        <Link
          href="/services/new"
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700"
        >
          Create Service
        </Link>
      </header>

      {services.length === 0 ? (
        <section className="rounded-xl border border-dashed border-zinc-300 p-6">
          <p className="text-sm text-zinc-600">No services yet. Add your first service to start taking bookings.</p>
        </section>
      ) : (
        <ul className="space-y-3">
          {services.map((service) => (
            <li key={service.id} className="rounded-xl border border-zinc-200 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-900">{service.name}</h3>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        service.isActive ? "bg-emerald-100 text-emerald-700" : "bg-zinc-200 text-zinc-700"
                      }`}
                    >
                      {service.isActive ? "Active" : "Inactive"}
                    </span>
                    {service.isFeatured ? (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">Featured</span>
                    ) : null}
                    {service.category ? (
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700">
                        {service.category}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-sm text-zinc-600">
                    {service.durationMinutes} min • ${(service.priceCents / 100).toFixed(2)}
                  </p>
                  <p className="text-sm text-zinc-600">
                    {service.description?.trim() ? service.description : "No description provided."}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/services/${service.id}/edit`}
                    className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
                  >
                    Edit
                  </Link>
                  <ServiceRowActions serviceId={service.id} isActive={service.isActive} />
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
