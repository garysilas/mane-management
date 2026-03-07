"use client";

import { FormEvent, useMemo, useState } from "react";

type ServiceRecord = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  priceCents: number;
  isActive: boolean;
};

type FormState = {
  name: string;
  description: string;
  durationMinutes: string;
  priceDollars: string;
  isActive: boolean;
};

const initialState: FormState = {
  name: "",
  description: "",
  durationMinutes: "30",
  priceDollars: "35.00",
  isActive: true,
};

type Props = {
  initialServices: ServiceRecord[];
};

export function ServiceManager({ initialServices }: Props) {
  const [services, setServices] = useState<ServiceRecord[]>(initialServices);
  const [form, setForm] = useState<FormState>(initialState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const currency = useMemo(
    () => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }),
    [],
  );

  async function loadServices() {
    const response = await fetch("/api/services", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Unable to load services.");
      return;
    }

    const data = (await response.json()) as ServiceRecord[];
    setServices(data);
  }

  function resetForm() {
    setForm(initialState);
    setEditingId(null);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const payload = {
      name: form.name,
      description: form.description || null,
      durationMinutes: Number(form.durationMinutes),
      priceCents: Math.round(Number(form.priceDollars) * 100),
      isActive: form.isActive,
    };

    const response = await fetch(editingId ? `/api/services/${editingId}` : "/api/services", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(json.error ?? "Unable to save service.");
      setLoading(false);
      return;
    }

    setMessage(editingId ? "Service updated." : "Service created.");
    resetForm();
    await loadServices();
    setLoading(false);
  }

  async function onDelete(serviceId: string) {
    const response = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });
    if (!response.ok) {
      setMessage("Unable to delete service.");
      return;
    }

    if (editingId === serviceId) {
      resetForm();
    }

    setMessage("Service deleted.");
    await loadServices();
  }

  function onEdit(service: ServiceRecord) {
    setEditingId(service.id);
    setForm({
      name: service.name,
      description: service.description ?? "",
      durationMinutes: String(service.durationMinutes),
      priceDollars: (service.priceCents / 100).toFixed(2),
      isActive: service.isActive,
    });
  }

  return (
    <div className="space-y-6">
      <form className="space-y-3 rounded-xl border border-zinc-200 p-4" onSubmit={onSubmit}>
        <h3 className="text-lg font-semibold">{editingId ? "Edit Service" : "Add Service"}</h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Service name"
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
          />
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Duration (minutes)"
            type="number"
            min={10}
            max={240}
            required
            value={form.durationMinutes}
            onChange={(event) => setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Price (USD)"
            type="number"
            min={1}
            step="0.01"
            required
            value={form.priceDollars}
            onChange={(event) => setForm((prev) => ({ ...prev, priceDollars: event.target.value }))}
          />
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              checked={form.isActive}
              type="checkbox"
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active
          </label>
        </div>

        <textarea
          className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Description"
          value={form.description}
          onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        />

        <div className="flex gap-2">
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={loading}
            type="submit"
          >
            {loading ? "Saving..." : editingId ? "Update Service" : "Create Service"}
          </button>
          {editingId ? (
            <button
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm"
              type="button"
              onClick={resetForm}
            >
              Cancel
            </button>
          ) : null}
        </div>
      </form>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Services</h3>
        {services.length === 0 ? (
          <p className="text-sm text-zinc-600">No services yet.</p>
        ) : (
          <ul className="space-y-2">
            {services.map((service) => (
              <li key={service.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-3">
                <div>
                  <p className="font-medium text-zinc-900">{service.name}</p>
                  <p className="text-sm text-zinc-600">
                    {service.durationMinutes} min • {currency.format(service.priceCents / 100)}
                  </p>
                  {!service.isActive ? <p className="text-xs text-amber-700">Inactive</p> : null}
                </div>
                <div className="flex gap-2">
                  <button className="rounded-md border border-zinc-300 px-3 py-1 text-sm" onClick={() => onEdit(service)}>
                    Edit
                  </button>
                  <button
                    className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700"
                    onClick={() => void onDelete(service.id)}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
