import { ServiceForm } from "@/components/forms/service-form";
import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  await getOrCreateCurrentBarber();

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-semibold text-zinc-900">Create Service</h2>
        <p className="text-sm text-zinc-600">Add a new service with pricing, duration, and booking status.</p>
      </div>
      <ServiceForm mode="create" />
    </div>
  );
}
