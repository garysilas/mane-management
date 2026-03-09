import { AvailabilityManager } from "@/components/forms/availability-manager";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AvailabilitySettingsPage() {
  const barber = await getOrCreateCurrentBarber();
  const rules = await prisma.availabilityRule.findMany({
    where: { barberId: barber.id },
    orderBy: [{ dayOfWeek: "asc" }, { startTimeLocal: "asc" }],
    select: {
      id: true,
      dayOfWeek: true,
      startTimeLocal: true,
      endTimeLocal: true,
      isActive: true,
    },
  });

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold text-zinc-900">Availability</h2>
      <p className="text-sm text-zinc-600">Define weekly working hours, edit rules, and disable specific days.</p>
      <AvailabilityManager initialRules={rules} />
    </div>
  );
}
