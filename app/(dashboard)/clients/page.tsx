import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const barber = await getOrCreateCurrentBarber();
  const clients = await prisma.client.findMany({
    where: { barberId: barber.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Clients</h2>
      {clients.length === 0 ? (
        <p className="text-sm text-zinc-600">No clients yet.</p>
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.id} className="rounded-lg border border-zinc-200 p-3">
              <p className="font-medium">{client.name}</p>
              <p className="text-sm text-zinc-600">{client.email || "No email"}</p>
              <p className="text-sm text-zinc-600">{client.phone || "No phone"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
