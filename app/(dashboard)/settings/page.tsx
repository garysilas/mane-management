import Link from "next/link";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const barber = await getOrCreateCurrentBarber();

  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold">Settings</h2>
      <p className="text-sm text-zinc-600">Slug: /{barber.slug}</p>
      <p className="text-sm text-zinc-600">Timezone: {barber.timezone}</p>
      <p className="text-sm text-zinc-600">Email: {barber.email}</p>
      <Link
        href="/settings/availability"
        className="inline-flex rounded-lg border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-50"
      >
        Manage availability
      </Link>
    </div>
  );
}
