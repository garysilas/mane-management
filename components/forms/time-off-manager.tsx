"use client";

import { FormEvent, useState } from "react";

type TimeOffBlockRecord = {
  id: string;
  startTime: string;
  endTime: string;
  reason: string | null;
};

type FormState = {
  startTimeLocal: string;
  endTimeLocal: string;
  reason: string;
};

type Props = {
  initialBlocks: TimeOffBlockRecord[];
};

const initialFormState: FormState = {
  startTimeLocal: "",
  endTimeLocal: "",
  reason: "",
};

function sortBlocks(blocks: TimeOffBlockRecord[]): TimeOffBlockRecord[] {
  return [...blocks].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
}

function formatBlockDateTime(value: string): string {
  return new Date(value).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function TimeOffManager({ initialBlocks }: Props) {
  const [blocks, setBlocks] = useState<TimeOffBlockRecord[]>(sortBlocks(initialBlocks));
  const [form, setForm] = useState<FormState>(initialFormState);
  const [message, setMessage] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  function resetForm() {
    setForm(initialFormState);
  }

  async function loadBlocks() {
    const response = await fetch("/api/time-off", { cache: "no-store" });
    if (!response.ok) {
      setMessage("Unable to load time-off blocks.");
      return;
    }

    const data = (await response.json()) as TimeOffBlockRecord[];
    setBlocks(sortBlocks(data));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    const startTime = new Date(form.startTimeLocal);
    const endTime = new Date(form.endTimeLocal);

    if (!form.startTimeLocal || !form.endTimeLocal || Number.isNaN(startTime.getTime()) || Number.isNaN(endTime.getTime())) {
      setMessage("Start and end times are required.");
      setLoading(false);
      return;
    }

    if (startTime >= endTime) {
      setMessage("Start time must be before end time.");
      setLoading(false);
      return;
    }

    const response = await fetch("/api/time-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        reason: form.reason || null,
      }),
    });

    const json = (await response.json()) as { error?: string };
    if (!response.ok) {
      setMessage(json.error ?? "Unable to create time-off block.");
      setLoading(false);
      return;
    }

    setMessage("Time-off block created.");
    resetForm();
    await loadBlocks();
    setLoading(false);
  }

  async function onDelete(blockId: string) {
    setLoading(true);
    setMessage("");

    const response = await fetch(`/api/time-off/${blockId}`, { method: "DELETE" });
    if (!response.ok) {
      const json = (await response.json()) as { error?: string };
      setMessage(json.error ?? "Unable to delete time-off block.");
      setLoading(false);
      return;
    }

    setMessage("Time-off block deleted.");
    await loadBlocks();
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      <form className="space-y-3 rounded-xl border border-zinc-200 p-4" onSubmit={onSubmit}>
        <h3 className="text-lg font-semibold">Add Time Off</h3>
        <p className="text-sm text-zinc-600">Times use your current device timezone.</p>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1 text-sm text-zinc-700">
            <span>Start</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              type="datetime-local"
              step={900}
              value={form.startTimeLocal}
              onChange={(event) => setForm((previous) => ({ ...previous, startTimeLocal: event.target.value }))}
              required
            />
          </label>

          <label className="space-y-1 text-sm text-zinc-700">
            <span>End</span>
            <input
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              type="datetime-local"
              step={900}
              value={form.endTimeLocal}
              onChange={(event) => setForm((previous) => ({ ...previous, endTimeLocal: event.target.value }))}
              required
            />
          </label>
        </div>

        <label className="space-y-1 text-sm text-zinc-700">
          <span>Reason</span>
          <input
            className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="Optional"
            value={form.reason}
            onChange={(event) => setForm((previous) => ({ ...previous, reason: event.target.value }))}
          />
        </label>

        <button
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          type="submit"
          disabled={loading}
        >
          {loading ? "Saving..." : "Create Time Off"}
        </button>
      </form>

      {message ? <p className="text-sm text-zinc-600">{message}</p> : null}

      <section className="space-y-2">
        <h3 className="text-lg font-semibold">Time-Off Blocks</h3>
        {blocks.length === 0 ? (
          <p className="text-sm text-zinc-600">No time-off blocks yet.</p>
        ) : (
          <ul className="space-y-2">
            {blocks.map((block) => (
              <li
                key={block.id}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-zinc-200 p-3"
              >
                <div>
                  <p className="font-medium text-zinc-900">
                    {formatBlockDateTime(block.startTime)} - {formatBlockDateTime(block.endTime)}
                  </p>
                  <p className="text-sm text-zinc-600">{block.reason?.trim() ? block.reason : "No reason provided."}</p>
                </div>

                <button
                  className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 disabled:opacity-60"
                  type="button"
                  disabled={loading}
                  onClick={() => void onDelete(block.id)}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
