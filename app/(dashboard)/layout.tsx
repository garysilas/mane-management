import { UserButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/");
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-4 py-6 lg:px-6">
      <header className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-4 shadow-sm">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Dashboard</p>
          <h1 className="text-lg font-semibold text-zinc-900">Mane Manager</h1>
        </div>
        <UserButton />
      </header>

      <div className="flex flex-col gap-4 lg:flex-row">
        <DashboardSidebar />
        <main className="flex-1 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">{children}</main>
      </div>
    </div>
  );
}
