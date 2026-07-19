import Link from "next/link";

import { BarberSettingsForm } from "@/components/forms/barber-settings-form";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const barber = await getOrCreateCurrentBarber();

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Settings</h2>
      <BarberSettingsForm
        initialSettings={{
          businessName: barber.businessName,
          location: barber.location,
          timezone: barber.timezone,
          bookingPolicy: barber.bookingPolicy,
        }}
      />
      <div className="space-y-1">
        <p className="text-sm text-zinc-600">Slug: /{barber.slug}</p>
        <p className="text-sm text-zinc-600">Email: {barber.email}</p>
      </div>
      <Link
        href="/settings/availability"
        className="inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Manage availability
      </Link>
    </div>
  );
}
