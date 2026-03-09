import type { ReactNode } from "react";

type Props = {
  step: number;
  title: string;
  description?: string;
  children: ReactNode;
};

export function BookingStepCard({ step, title, description, children }: Props) {
  return (
    <section className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm sm:p-5">
      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">Step {step}</p>
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        {description ? <p className="text-sm text-zinc-600">{description}</p> : null}
      </header>
      {children}
    </section>
  );
}
