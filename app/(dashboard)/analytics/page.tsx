import { getBarberAnalytics } from "@/lib/analytics/metrics";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

export const dynamic = "force-dynamic";

type MetricCardProps = {
  label: string;
  value: string | number;
  helper?: string;
};

function MetricCard({ label, value, helper }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-zinc-200 p-3">
      <dt className="text-sm text-zinc-500">{label}</dt>
      <dd className="text-2xl font-semibold">{value}</dd>
      {helper ? <p className="mt-1 text-xs text-zinc-500">{helper}</p> : null}
    </div>
  );
}

export default async function AnalyticsPage() {
  const barber = await getOrCreateCurrentBarber();
  const analytics = await getBarberAnalytics(barber.id);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">Business Health</h2>
        <p className="text-sm text-zinc-600">Retention and booking signals to help keep the chair filled.</p>
      </div>

      <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Upcoming appointments" value={analytics.upcomingCount} />
        <MetricCard label="Total clients" value={analytics.clientCount} />
        <MetricCard label="Completed appointments" value={analytics.completedCount} />
        <MetricCard
          label="Clients overdue"
          value={analytics.overdueClientCount}
          helper="Clients whose last completed visit was over 30 days ago with no future booking."
        />
        <MetricCard
          label="Due back soon"
          value={analytics.dueBackSoonCount}
          helper="Clients 14–30 days out from their last completed visit."
        />
        <MetricCard
          label="Repeat client rate"
          value={`${analytics.repeatClientRate}%`}
          helper={`${analytics.repeatClientCount} clients have booked 2+ completed visits.`}
        />
        <MetricCard
          label="Average days between visits"
          value={analytics.averageDaysBetweenVisits || "—"}
          helper="Average interval for repeat clients."
        />
      </dl>
    </div>
  );
}
