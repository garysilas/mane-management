import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  const barber = await getOrCreateCurrentBarber();

  const payments = await prisma.payment.findMany({
    where: { barberId: barber.id },
    include: {
      appointment: {
        include: {
          client: true,
          service: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Payments</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-zinc-600">No payment records yet.</p>
      ) : (
        <ul className="space-y-2">
          {payments.map((payment) => (
            <li key={payment.id} className="rounded-lg border border-zinc-200 p-3">
              <p className="font-medium">
                {new Intl.NumberFormat("en-US", { style: "currency", currency: payment.currency }).format(
                  payment.amountCents / 100,
                )}
              </p>
              <p className="text-sm text-zinc-600">{payment.appointment.client.name}</p>
              <p className="text-sm text-zinc-600">{payment.appointment.service.name}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">{payment.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
