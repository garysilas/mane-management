import { PublicBookingForm } from "@/components/booking/public-booking-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="space-y-2 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Public Booking</p>
        <h1 className="text-3xl font-semibold text-zinc-900">/{slug}</h1>
        <p className="text-sm text-zinc-600">Choose a service, time, and confirm your appointment.</p>
      </header>

      <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <PublicBookingForm slug={slug} />
      </section>
    </main>
  );
}
