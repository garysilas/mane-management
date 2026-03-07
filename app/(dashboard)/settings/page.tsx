import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const barber = await getOrCreateCurrentBarber();

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Settings</h2>
      <p className="text-sm text-zinc-600">Slug: /{barber.slug}</p>
      <p className="text-sm text-zinc-600">Timezone: {barber.timezone}</p>
      <p className="text-sm text-zinc-600">Email: {barber.email}</p>
    </div>
  );
}
