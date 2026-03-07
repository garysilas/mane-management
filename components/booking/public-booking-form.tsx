"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import type { PublicService, Slot } from "@/types";

type Props = {
  slug: string;
};

export function PublicBookingForm({ slug }: Props) {
  const [services, setServices] = useState<PublicService[]>([]);
  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotValue, setSlotValue] = useState<string>("");

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [message, setMessage] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [booking, setBooking] = useState<boolean>(false);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId],
  );

  useEffect(() => {
    async function loadServices() {
      const response = await fetch(`/api/public/${slug}/services`, { cache: "no-store" });
      if (!response.ok) {
        setMessage("Unable to load services for this barber.");
        return;
      }

      const data = (await response.json()) as PublicService[];
      setServices(data);
      if (data.length > 0) {
        setServiceId(data[0].id);
      }
    }

    void loadServices();
  }, [slug]);

  async function fetchSlots() {
    if (!serviceId || !date) {
      return;
    }

    setLoadingSlots(true);
    setMessage("");
    setSlots([]);
    setSlotValue("");

    const params = new URLSearchParams({ serviceId, date });
    const response = await fetch(`/api/public/${slug}/slots?${params.toString()}`, { cache: "no-store" });

    if (!response.ok) {
      const data = (await response.json()) as { error?: string };
      setMessage(data.error ?? "Unable to load slots.");
      setLoadingSlots(false);
      return;
    }

    const data = (await response.json()) as Slot[];
    setSlots(data);
    if (data.length > 0) {
      setSlotValue(data[0].startTime);
    }
    setLoadingSlots(false);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();

    if (!serviceId || !slotValue) {
      setMessage("Please choose service and slot.");
      return;
    }

    setBooking(true);
    setMessage("");

    const response = await fetch(`/api/public/${slug}/book`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        serviceId,
        startTime: slotValue,
        name,
        email: email || null,
        phone: phone || null,
        notes: notes || null,
      }),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setMessage(data.error ?? "Booking failed.");
      setBooking(false);
      return;
    }

    setMessage("Booking confirmed. Confirmation sent.");
    setSlotValue("");
    setSlots([]);
    setBooking(false);
  }

  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">1. Service</span>
          <select
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            value={serviceId}
            onChange={(event) => setServiceId(event.target.value)}
          >
            {services.map((service) => (
              <option key={service.id} value={service.id}>
                {service.name} ({service.durationMinutes} min, ${(service.priceCents / 100).toFixed(2)})
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">2. Date</span>
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
        </label>
      </div>

      <button
        className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium"
        disabled={!serviceId || !date || loadingSlots}
        type="button"
        onClick={() => void fetchSlots()}
      >
        {loadingSlots ? "Checking availability..." : "3. Find available times"}
      </button>

      <label className="space-y-1 text-sm">
        <span className="font-medium">4. Available times</span>
        <select
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
          value={slotValue}
          onChange={(event) => setSlotValue(event.target.value)}
        >
          <option value="">Select a time</option>
          {slots.map((slot) => (
            <option key={slot.startTime} value={slot.startTime}>
              {new Date(slot.startTime).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </option>
          ))}
        </select>
      </label>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span className="font-medium">5. Name</span>
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>

        <label className="space-y-1 text-sm">
          <span className="font-medium">Email</span>
          <input
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
      </div>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Phone</span>
        <input
          className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <label className="space-y-1 text-sm">
        <span className="font-medium">Notes</span>
        <textarea
          className="min-h-24 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
        />
      </label>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
        <p className="font-medium">Review</p>
        <p>{selectedService ? selectedService.name : "No service selected"}</p>
        <p>{slotValue ? new Date(slotValue).toLocaleString() : "No time selected"}</p>
      </div>

      <button
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        disabled={booking || !slotValue || !name}
        type="submit"
      >
        {booking ? "Booking..." : "6. Confirm booking"}
      </button>

      {message ? <p className="text-sm text-zinc-700">{message}</p> : null}
    </form>
  );
}
