import { AvailabilityManager } from "@/components/forms/availability-manager";
import { TimeOffManager } from "@/components/forms/time-off-manager";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function AvailabilitySettingsPage() {
  const barber = await getOrCreateCurrentBarber();
  const [rules, timeOffBlocks] = await Promise.all([
    prisma.availabilityRule.findMany({
      where: { barberId: barber.id },
      orderBy: [{ dayOfWeek: "asc" }, { startTimeLocal: "asc" }],
      select: {
        id: true,
        dayOfWeek: true,
        startTimeLocal: true,
        endTimeLocal: true,
        isActive: true,
      },
    }),
    prisma.timeOffBlock.findMany({
      where: { barberId: barber.id },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-zinc-900">Availability</h2>
      <p className="text-sm text-zinc-600">Define weekly working hours, edit rules, and block specific time off.</p>
      <AvailabilityManager initialRules={rules} />
      <TimeOffManager
        initialBlocks={timeOffBlocks.map((block) => ({
          id: block.id,
          startTime: block.startTime.toISOString(),
          endTime: block.endTime.toISOString(),
          reason: block.reason,
        }))}
      />
    </div>
  );
}
