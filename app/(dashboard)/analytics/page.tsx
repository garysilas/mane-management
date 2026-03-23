import { getBarberAnalytics } from "@/lib/analytics/metrics";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

export const dynamic = "force-dynamic";

export default async function AnalyticsPage() {
  const barber = await getOrCreateCurrentBarber();
  const analytics = await getBarberAnalytics(barber.id);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Basic Analytics</h2>
      <p className="text-sm text-zinc-600">Operational counts only for the current MVP.</p>
      <dl className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-zinc-200 p-3">
          <dt className="text-sm text-zinc-500">Upcoming appointments</dt>
          <dd className="text-2xl font-semibold">{analytics.upcomingCount}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3">
          <dt className="text-sm text-zinc-500">Total clients</dt>
          <dd className="text-2xl font-semibold">{analytics.clientCount}</dd>
        </div>
        <div className="rounded-lg border border-zinc-200 p-3">
          <dt className="text-sm text-zinc-500">Completed appointments</dt>
          <dd className="text-2xl font-semibold">{analytics.completedCount}</dd>
        </div>
      </dl>
    </div>
  );
}
