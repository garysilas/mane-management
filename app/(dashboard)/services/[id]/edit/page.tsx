import { notFound } from "next/navigation";

import { ServiceForm } from "@/components/forms/service-form";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { serviceIdSchema } from "@/lib/validators/service";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditServicePage({ params }: PageProps) {
  const idValidation = serviceIdSchema.safeParse(await params);
  if (!idValidation.success) {
    notFound();
  }

  const barber = await getOrCreateCurrentBarber();
  const service = await prisma.service.findFirst({
    where: {
      id: idValidation.data.id,
      barberId: barber.id,
    },
    select: {
      id: true,
      name: true,
      description: true,
      durationMinutes: true,
      priceCents: true,
      isActive: true,
    },
  });

  if (!service) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">Edit Service</h2>
        <p className="text-sm text-zinc-600">Update details, pricing, and active status for this service.</p>
      </div>
      <ServiceForm mode="edit" initialService={service} />
    </div>
  );
}
