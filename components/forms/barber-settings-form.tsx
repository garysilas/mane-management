"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

type BarberSettingsFormProps = {
  initialSettings: {
    businessName: string | null;
    location: string | null;
    timezone: string;
    bookingPolicy: string | null;
  };
};

type BarberSettingsState = {
  businessName: string;
  location: string;
  timezone: string;
  bookingPolicy: string;
};

function buildInitialState(initialSettings: BarberSettingsFormProps["initialSettings"]): BarberSettingsState {
  return {
    businessName: initialSettings.businessName ?? "",
    location: initialSettings.location ?? "",
    timezone: initialSettings.timezone,
    bookingPolicy: initialSettings.bookingPolicy ?? "",
  };
}

export function BarberSettingsForm({ initialSettings }: BarberSettingsFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<BarberSettingsState>(() => buildInitialState(initialSettings));
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch("/api/barber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          location: form.location,
          timezone: form.timezone,
          bookingPolicy: form.bookingPolicy,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            error?: string;
            businessName?: string | null;
            location?: string | null;
            timezone?: string;
            bookingPolicy?: string | null;
          }
        | null;

      if (!response.ok) {
        setErrorMessage(data?.error ?? "Unable to save settings.");
        setSubmitting(false);
        return;
      }

      setForm({
        businessName: data?.businessName ?? "",
        location: data?.location ?? "",
        timezone: data?.timezone ?? form.timezone,
        bookingPolicy: data?.bookingPolicy ?? "",
      });
      setSuccessMessage("Settings saved.");
      setSubmitting(false);
      router.refresh();
    } catch {
      setErrorMessage("Unable to save settings.");
      setSubmitting(false);
    }
  }

  return (
    <form className="space-y-4 rounded-xl border border-zinc-200 p-5" onSubmit={onSubmit}>
      <h3 className="text-lg font-semibold">Booking Settings</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-1 text-sm text-zinc-700">
          <span>Business name</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            maxLength={120}
            value={form.businessName}
            onChange={(event) => setForm((previous) => ({ ...previous, businessName: event.target.value }))}
          />
        </label>

        <label className="space-y-1 text-sm text-zinc-700">
          <span>Location</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2"
            maxLength={200}
            value={form.location}
            onChange={(event) => setForm((previous) => ({ ...previous, location: event.target.value }))}
          />
        </label>
      </div>

      <label className="space-y-1 text-sm text-zinc-700">
        <span>Timezone</span>
        <input
          className="w-full rounded-lg border border-zinc-300 px-3 py-2"
          maxLength={120}
          required
          value={form.timezone}
          onChange={(event) => setForm((previous) => ({ ...previous, timezone: event.target.value }))}
        />
        <p className="text-xs text-zinc-500">Use an IANA timezone like America/New_York.</p>
      </label>

      <label className="space-y-1 text-sm text-zinc-700">
        <span>Booking policy</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2"
          maxLength={1000}
          placeholder="Example: Please arrive on time. Contact me at least 24 hours ahead to cancel or reschedule."
          value={form.bookingPolicy}
          onChange={(event) => setForm((previous) => ({ ...previous, bookingPolicy: event.target.value }))}
        />
        <p className="text-xs text-zinc-500">Shown to clients before they confirm a public booking.</p>
      </label>

      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}

      <button
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Saving..." : "Save Settings"}
      </button>
    </form>
  );
}
