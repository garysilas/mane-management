export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Payments</h2>
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
        <p className="font-medium text-zinc-900">Payments are not included in this MVP.</p>
        <p className="mt-2 text-sm text-zinc-600">
          Payment capture, syncing, and revenue reporting are intentionally hidden until the Stripe flow is built
          end-to-end.
        </p>
      </div>
    </div>
  );
}
