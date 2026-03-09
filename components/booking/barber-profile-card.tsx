import type { PublicBarberProfile } from "@/types";

type Props = {
  barber: PublicBarberProfile;
};

export function BarberProfileCard({ barber }: Props) {
  const displayName = barber.businessName ?? barber.name;

  return (
    <section className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Public Booking</p>
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{displayName}</h1>
      {barber.businessName ? <p className="text-sm text-zinc-700">Barber: {barber.name}</p> : null}
      {barber.location ? <p className="text-sm text-zinc-600">{barber.location}</p> : null}
      <p className="text-sm text-zinc-600">No account needed. Pick a service, choose a time, and confirm.</p>
    </section>
  );
}
