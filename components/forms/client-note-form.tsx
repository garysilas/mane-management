"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ClientNoteFormProps = {
  clientId: string;
};

export function ClientNoteForm({ clientId }: ClientNoteFormProps) {
  const router = useRouter();
  const [note, setNote] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNote = note.trim();
    if (!trimmedNote) {
      setMessage("Note cannot be empty.");
      return;
    }

    setSubmitting(true);
    setMessage("");

    const response = await fetch(`/api/clients/${clientId}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ note: trimmedNote }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(data?.error ?? "Unable to add note.");
      setSubmitting(false);
      return;
    }

    setNote("");
    setSubmitting(false);
    router.refresh();
  }

  return (
    <form className="space-y-3 rounded-xl border border-zinc-200 p-4" onSubmit={onSubmit}>
      <label className="block space-y-1 text-sm text-zinc-700">
        <span>Add Note</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-zinc-300 px-3 py-2"
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </label>

      {message ? <p className="text-sm text-red-700">{message}</p> : null}

      <button
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={submitting}
        type="submit"
      >
        {submitting ? "Saving..." : "Add Note"}
      </button>
    </form>
  );
}
