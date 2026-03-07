import { getBarberAnalytics } from "@/lib/analytics/metrics";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const barber = await getOrCreateCurrentBarber();
  const analytics = await getBarberAnalytics(barber.id);

  const cards = [
    { label: "Upcoming Appointments", value: analytics.upcomingCount.toString() },
    { label: "Clients", value: analytics.clientCount.toString() },
    { label: "Completed Appointments", value: analytics.completedCount.toString() },
    {
      label: "Revenue",
      value: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
        analytics.totalRevenueCents / 100,
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-zinc-900">Welcome back, {barber.name}</h2>
        <p className="text-sm text-zinc-600">Run your calendar, clients, and bookings from one place.</p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="rounded-xl border border-zinc-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">{card.label}</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-900">{card.value}</p>
          </article>
        ))}
      </section>
    </div>
  );
}
