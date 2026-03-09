"use client";

import { FormEvent, useMemo, useState } from "react";

type AvailabilityRuleRecord = {
  id: string;
  dayOfWeek: number;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

type FormState = {
  dayOfWeek: string;
  startTimeLocal: string;
  endTimeLocal: string;
  isActive: boolean;
};

type Props = {
  initialRules: AvailabilityRuleRecord[];
};

const dayOptions = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

const initialFormState: FormState = {
  dayOfWeek: "1",
  startTimeLocal: "09:00",
  endTimeLocal: "17:00",
  isActive: true,
};

function sortRules(rules: AvailabilityRuleRecord[]): AvailabilityRuleRecord[] {
  return [...rules].sort((a, b) => {
    if (a.dayOfWeek !== b.dayOfWeek) {
      return a.dayOfWeek - b.dayOfWeek;
    }

    return a.startTimeLocal.localeCompare(b.startTimeLocal);
  });
}

export function AvailabilityManager({ initialRules }: Props) {
  const [rules, setRules] = useState<AvailabilityRuleRecord[]>(sortRules(initialRules));
  const [form, setForm] = useState<FormState>(initialFormState);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const rulesByDay = useMemo(() => {
    const grouped = new Map<number, AvailabilityRuleRecord[]>();

    for (const rule of rules) {
      const dayRules = grouped.get(rule.dayOfWeek) ?? [];
      dayRules.push(rule);
      grouped.set(rule.dayOfWeek, dayRules);
    }

    return grouped;
  }, [rules]);

  function resetForm() {
    setForm(initialFormState);
    setEditingId(null);
  }

  async function loadRules() {
    const response = await fetch("/api/availability", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Unable to load availability rules.");
      return;
    }

    const data = (await response.json()) as AvailabilityRuleRecord[];
    setRules(sortRules(data));
  }

  function hasStartBeforeEnd(startTimeLocal: string, endTimeLocal: string): boolean {
    return startTimeLocal < endTimeLocal;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    if (!hasStartBeforeEnd(form.startTimeLocal, form.endTimeLocal)) {
      setMessage("Start time must be before end time.");
      setLoading(false);
      return;
    }

    const payload = {
      dayOfWeek: Number(form.dayOfWeek),
      startTimeLocal: form.startTimeLocal,
      endTimeLocal: form.endTimeLocal,
      isActive: form.isActive,
    };

    const response = await fetch(editingId ? `/api/availability/${editingId}` : "/api/availability", {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Unable to save availability rule.");
      setLoading(false);
      return;
    }

    setMessage(editingId ? "Availability rule updated." : "Availability rule created.");
    resetForm();
    await loadRules();
    setLoading(false);
  }

  async function onDelete(ruleId: string) {
    const response = await fetch(`/api/availability/${ruleId}`, { method: "DELETE" });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setMessage(json.error ?? "Unable to delete availability rule.");
      return;
    }

    if (editingId === ruleId) {
      resetForm();
    }

    setMessage("Availability rule deleted.");
    await loadRules();
  }

  function onEdit(rule: AvailabilityRuleRecord) {
    setEditingId(rule.id);
    setForm({
      dayOfWeek: String(rule.dayOfWeek),
      startTimeLocal: rule.startTimeLocal,
      endTimeLocal: rule.endTimeLocal,
      isActive: rule.isActive,
    });
  }

  async function onToggleActive(rule: AvailabilityRuleRecord) {
    const response = await fetch(`/api/availability/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !rule.isActive }),
    });

    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Unable to update rule status.");
      return;
    }

    setMessage(rule.isActive ? "Availability disabled for this rule." : "Availability enabled for this rule.");
    await loadRules();
  }

  async function onDisableDay(dayOfWeek: number) {
    const activeRules = rules.filter((rule) => rule.dayOfWeek === dayOfWeek && rule.isActive);
    if (activeRules.length === 0) {
      return;
    }

    setLoading(true);
    setMessage("");

    const results = await Promise.all(
      activeRules.map(async (rule) => {
        const response = await fetch(`/api/availability/${rule.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isActive: false }),
        });

        if (response.ok) {
          return { ok: true as const };
        }

        const json = (await response.json()) as { error?: string };
        return { ok: false as const, error: json.error ?? "Unable to disable one of the rules." };
      }),
    );

    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      setMessage(failed.error);
      setLoading(false);
      return;
    }

    setMessage(`Disabled availability for ${dayOptions[dayOfWeek]?.label ?? "this day"}.`);
    await loadRules();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form className="space-y-3 rounded-xl border border-zinc-200 p-4" onSubmit={onSubmit}>
        <h3 className="text-lg font-semibold">{editingId ? "Edit Availability Rule" : "Add Availability Rule"}</h3>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1 text-sm text-zinc-700">
            <span>Day</span>
            <select
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              value={form.dayOfWeek}
              onChange={(event) => setForm((previous) => ({ ...previous, dayOfWeek: event.target.value }))}
            >
              {dayOptions.map((day) => (
                <option key={day.value} value={day.value}>
                  {day.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span>Start time</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              type="time"
              step={900}
              value={form.startTimeLocal}
              onChange={(event) => setForm((previous) => ({ ...previous, startTimeLocal: event.target.value }))}
              required
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span>End time</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              type="time"
              step={900}
              value={form.endTimeLocal}
              onChange={(event) => setForm((previous) => ({ ...previous, endTimeLocal: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-700">
          <input
            checked={form.isActive}
            type="checkbox"
            onChange={(event) => setForm((previous) => ({ ...previous, isActive: event.target.checked }))}
          />
          Active
        </label>

        <div className="flex gap-2">
          <button
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            type="submit"
            disabled={loading}
          >
            {loading ? "Saving..." : editingId ? "Update Rule" : "Create Rule"}
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
        <h3 className="text-lg font-semibold">Availability Rules</h3>
        {rules.length === 0 ? (
          <p className="text-sm text-zinc-600">No availability rules yet.</p>
        ) : (
          <div className="space-y-3">
            {dayOptions.map((day) => {
              const dayRules = rulesByDay.get(day.value) ?? [];

              return (
                <div key={day.value} className="rounded-lg border border-zinc-200 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-zinc-800">{day.label}</p>
                    {dayRules.some((rule) => rule.isActive) ? (
                      <button
                        className="rounded-md border border-zinc-300 px-2 py-1 text-xs text-zinc-700"
                        type="button"
                        disabled={loading}
                        onClick={() => void onDisableDay(day.value)}
                      >
                        Disable Day
                      </button>
                    ) : null}
                  </div>
                  {dayRules.length === 0 ? (
                    <p className="text-sm text-zinc-500">Off</p>
                  ) : (
                    <ul className="space-y-2">
                      {dayRules.map((rule) => (
                        <li
                          key={rule.id}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-zinc-200 p-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-zinc-900">
                              {rule.startTimeLocal} - {rule.endTimeLocal}
                            </p>
                            {!rule.isActive ? <p className="text-xs text-amber-700">Disabled</p> : null}
                          </div>
                          <div className="flex gap-2">
                            <button
                              className="rounded-md border border-zinc-300 px-3 py-1 text-sm"
                              type="button"
                              onClick={() => onEdit(rule)}
                            >
                              Edit
                            </button>
                            <button
                              className="rounded-md border border-zinc-300 px-3 py-1 text-sm"
                              type="button"
                              onClick={() => void onToggleActive(rule)}
                            >
                              {rule.isActive ? "Disable" : "Enable"}
                            </button>
                            <button
                              className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700"
                              type="button"
                              onClick={() => void onDelete(rule.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
