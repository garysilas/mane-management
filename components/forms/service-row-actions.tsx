"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Props = {
  serviceId: string;
  isActive: boolean;
};

export function ServiceRowActions({ serviceId, isActive }: Props) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"toggle" | "delete" | null>(null);
  const [message, setMessage] = useState<string>("");

  async function toggleStatus() {
    setPendingAction("toggle");
    setMessage("");

    const response = await fetch(`/api/services/${serviceId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !isActive }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(data?.error ?? "Unable to update service status.");
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    router.refresh();
  }

  async function deleteService() {
    const shouldDelete = window.confirm("Delete this service?");
    if (!shouldDelete) {
      return;
    }

    setPendingAction("delete");
    setMessage("");

    const response = await fetch(`/api/services/${serviceId}`, { method: "DELETE" });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setMessage(data?.error ?? "Unable to delete service.");
      setPendingAction(null);
      return;
    }

    setPendingAction(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <div className="flex gap-2">
        <button
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-60"
          disabled={pendingAction !== null}
          type="button"
          onClick={() => void toggleStatus()}
        >
          {pendingAction === "toggle" ? "Saving..." : isActive ? "Deactivate" : "Activate"}
        </button>
        <button
          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 transition hover:bg-red-50 disabled:opacity-60"
          disabled={pendingAction !== null}
          type="button"
          onClick={() => void deleteService()}
        >
          {pendingAction === "delete" ? "Deleting..." : "Delete"}
        </button>
      </div>
      {message ? <p className="text-xs text-red-700">{message}</p> : null}
    </div>
  );
}
