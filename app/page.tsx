import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-10 px-6 py-12">
      <header className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-500">Mane Manager</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-zinc-900">
          Barber-first scheduling and business management.
        </h1>
        <p className="mt-4 max-w-2xl text-zinc-600">
          MVP foundation: auth, services, public booking, appointment conflict prevention, reminders, and analytics.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-sm"
          href="/dashboard"
        >
          <h2 className="text-xl font-semibold">Open Barber Dashboard</h2>
          <p className="mt-2 text-sm text-zinc-600">Manage services, clients, appointments, payments, and analytics.</p>
        </Link>

        <Link
          className="rounded-2xl border border-zinc-200 bg-white p-6 transition hover:-translate-y-0.5 hover:shadow-sm"
          href="/jayfades"
        >
          <h2 className="text-xl font-semibold">Open Public Booking Page</h2>
          <p className="mt-2 text-sm text-zinc-600">Example slug route: /jayfades</p>
        </Link>
      </section>
    </main>
  );
}
