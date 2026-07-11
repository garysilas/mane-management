"use client";

import { AppointmentStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

type ActionStatus = Extract<AppointmentStatus, "CANCELLED" | "COMPLETED" | "NO_SHOW">;

type Props = {
  appointmentId: string;
  availableStatuses: readonly ActionStatus[];
};

const actionLabels: Record<ActionStatus, string> = {
  CANCELLED: "Cancel",
  COMPLETED: "Complete",
  NO_SHOW: "No Show",
};

export function AppointmentStatusActions({ appointmentId, availableStatuses }: Props) {
  const router = useRouter();
  const [pendingStatus, setPendingStatus] = useState<ActionStatus | null>(null);
  const [message, setMessage] = useState<string>("");

  async function updateStatus(status: ActionStatus) {
    setPendingStatus(status);
    setMessage("");

    const response = await fetch(`/api/appointments/${appointmentId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setMessage(data?.error ?? "Unable to update appointment status.");
      setPendingStatus(null);
      return;
    }

    setPendingStatus(null);
    router.refresh();
  }

  if (availableStatuses.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col items-start gap-1 sm:items-end">
      <div className="flex flex-wrap gap-2">
        {availableStatuses.map((status) => (
          <button
            key={status}
            className={`rounded-md border px-3 py-1.5 text-sm transition disabled:opacity-60 ${
              status === AppointmentStatus.CANCELLED
                ? "border-red-300 text-red-700 hover:bg-red-50"
                : "border-zinc-300 text-zinc-700 hover:bg-zinc-100"
            }`}
            disabled={pendingStatus !== null}
            type="button"
            onClick={() => void updateStatus(status)}
          >
            {pendingStatus === status ? "Saving..." : actionLabels[status]}
          </button>
        ))}
      </div>
      {message ? <p className="text-xs text-red-700">{message}</p> : null}
    </div>
  );
}
