"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type EditableService = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
};

type ServiceFormState = {
  name: string;
  description: string;
  durationMinutes: string;
  priceDollars: string;
  isActive: boolean;
};

type ServiceFormProps = {
  mode: "create" | "edit";
  initialService?: EditableService;
};

function buildInitialState(initialService?: EditableService): ServiceFormState {
  if (!initialService) {
    return {
      name: "",
      description: "",
      durationMinutes: "30",
      priceDollars: "35.00",
      isActive: true,
    };
  }

  return {
    name: initialService.name,
    description: initialService.description ?? "",
    durationMinutes: String(initialService.durationMinutes),
    priceDollars: (initialService.priceCents / 100).toFixed(2),
    isActive: initialService.isActive,
  };
}

export function ServiceForm({ mode, initialService }: ServiceFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<ServiceFormState>(() => buildInitialState(initialService));
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const isEdit = mode === "edit";
  const endpoint = isEdit && initialService ? `/api/services/${initialService.id}` : "/api/services";

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");

    if (isEdit && !initialService) {
      setMessage("Service context is missing.");
      setSubmitting(false);
      return;
    }

    const durationMinutes = Number(form.durationMinutes);
    const priceDollars = Number(form.priceDollars);

    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 240) {
      setMessage("Duration must be between 5 and 240 minutes.");
      setSubmitting(false);
      return;
    }

    if (!Number.isFinite(priceDollars) || priceDollars <= 0) {
      setMessage("Price must be positive.");
      setSubmitting(false);
      return;
    }

    const response = await fetch(endpoint, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description.trim() || null,
        durationMinutes,
        priceCents: Math.round(priceDollars * 100),
        isActive: form.isActive,
      }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(data?.error ?? "Unable to save service.");
      setSubmitting(false);
      return;
    }

    router.push("/services");
    router.refresh();
  }

  return (
    <form className="space-y-4 rounded-xl border border-zinc-200 p-5" onSubmit={onSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-zinc-700">
          <span>Name</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            required
            maxLength={80}
            value={form.name}
            onChange={(event) => setForm((previous) => ({ ...previous, name: event.target.value }))}
          />
        </label>

        <label className="space-y-1 text-sm text-zinc-700">
          <span>Duration (minutes)</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            type="number"
            min={5}
            max={240}
            required
            value={form.durationMinutes}
            onChange={(event) => setForm((previous) => ({ ...previous, durationMinutes: event.target.value }))}
          />
        </label>
      </div>

      <label className="space-y-1 text-sm text-zinc-700">
        <span>Description</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2"
          maxLength={500}
          value={form.description}
          onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-zinc-700">
          <span>Price (USD)</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            type="number"
            min={0.01}
            step="0.01"
            required
            value={form.priceDollars}
            onChange={(event) => setForm((previous) => ({ ...previous, priceDollars: event.target.value }))}
          />
        </label>

        <label className="flex items-center gap-2 pt-7 text-sm text-zinc-700">
          <input
            checked={form.isActive}
            type="checkbox"
            onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
          />
          Active and bookable
        </label>
      </div>

      {message ? <p className="text-sm text-red-700">{message}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? "Saving..." : isEdit ? "Save Changes" : "Create Service"}
        </button>
        <Link
          href="/services"
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition hover:bg-zinc-100"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
