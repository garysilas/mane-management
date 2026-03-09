import { PublicBookingForm } from "@/components/booking/public-booking-form";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export default async function PublicBookingPage({ params }: PageProps) {
  const { slug } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-6 sm:py-8">
      <PublicBookingForm slug={slug} />
    </main>
  );
}
