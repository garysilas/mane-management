import { ServiceManager } from "@/components/forms/service-manager";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const barber = await getOrCreateCurrentBarber();
  const services = await prisma.service.findMany({
    where: { barberId: barber.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
      isActive: true,
    },
  });

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-zinc-900">Service Catalog</h2>
      <p className="text-sm text-zinc-600">Create and manage your service offerings and prices.</p>
      <ServiceManager initialServices={services} />
    </div>
  );
}
