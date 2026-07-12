"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { PublicBarberProfile, PublicBookingBootstrap, PublicService, Slot } from "@/types";
import { BarberProfileCard } from "@/components/booking/barber-profile-card";
import { BookingStepCard } from "@/components/booking/booking-step-card";
import { formatDateTimeInTimeZone, formatTimeInTimeZone, getCurrentDateInTimeZone } from "@/lib/utils/time";

type Props = {
  slug: string;
};

function formatCurrency(priceCents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(priceCents / 100);
}

export function PublicBookingForm({ slug }: Props) {
  const [barber, setBarber] = useState<PublicBarberProfile | null>(null);
  const [services, setServices] = useState<PublicService[]>([]);
  const [loadingBootstrap, setLoadingBootstrap] = useState<boolean>(true);
  const [bootstrapError, setBootstrapError] = useState<string>("");

  const [serviceId, setServiceId] = useState<string>("");
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slotValue, setSlotValue] = useState<string>("");

  const [name, setName] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [phone, setPhone] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [loadingSlots, setLoadingSlots] = useState<boolean>(false);
  const [booking, setBooking] = useState<boolean>(false);
  const latestSlotsRequestRef = useRef(0);

  const minDate = useMemo(() => getCurrentDateInTimeZone(barber?.timezone ?? "UTC"), [barber?.timezone]);

  const selectedService = useMemo(
    () => services.find((service) => service.id === serviceId),
    [services, serviceId],
  );

  const selectedSlot = useMemo(() => slots.find((slot) => slot.startTime === slotValue) ?? null, [slots, slotValue]);

  useEffect(() => {
    async function loadBookingBootstrap() {
      setLoadingBootstrap(true);
      setBootstrapError("");
      setBarber(null);
      setServices([]);
      setServiceId("");
      setDate("");
      setSlots([]);
      setSlotValue("");
      latestSlotsRequestRef.current += 1;
      setErrorMessage("");
      setSuccessMessage("");

      try {
        const response = await fetch(`/api/public/${slug}`, { cache: "no-store" });
        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          setBootstrapError(data.error ?? "Unable to load booking page.");
          setLoadingBootstrap(false);
          return;
        }

        const data = (await response.json()) as PublicBookingBootstrap;
        setBarber(data.barber);
        setServices(data.services);
        setServiceId(data.services[0]?.id ?? "");
        setLoadingBootstrap(false);
      } catch {
        setBootstrapError("Unable to load booking page.");
        setLoadingBootstrap(false);
      }
    }

    void loadBookingBootstrap();
  }, [slug]);

  const fetchSlots = useCallback(
    async (selectedServiceId: string, selectedDate: string) => {
      const requestId = latestSlotsRequestRef.current + 1;
      latestSlotsRequestRef.current = requestId;
      setLoadingSlots(true);
      setErrorMessage("");

      try {
        const params = new URLSearchParams({ serviceId: selectedServiceId, date: selectedDate });
        const response = await fetch(`/api/public/${slug}/slots?${params.toString()}`, { cache: "no-store" });
        if (requestId !== latestSlotsRequestRef.current) {
          return;
        }

        if (!response.ok) {
          const data = (await response.json().catch(() => ({}))) as { error?: string };
          setSlots([]);
          setSlotValue("");
          setErrorMessage(data.error ?? "Unable to load slots.");
          setLoadingSlots(false);
          return;
        }

        const data = (await response.json()) as Slot[];
        if (requestId !== latestSlotsRequestRef.current) {
          return;
        }
        setSlots(data);
        setSlotValue((current) =>
          data.some((slot) => slot.startTime === current) ? current : (data[0]?.startTime ?? ""),
        );
        setLoadingSlots(false);
      } catch {
        if (requestId !== latestSlotsRequestRef.current) {
          return;
        }
        setSlots([]);
        setSlotValue("");
        setErrorMessage("Unable to load slots.");
        setLoadingSlots(false);
      }
    },
    [slug],
  );

  function onServiceChange(nextServiceId: string) {
    latestSlotsRequestRef.current += 1;
    setServiceId(nextServiceId);
    setSlots([]);
    setSlotValue("");

    if (date) {
      void fetchSlots(nextServiceId, date);
    } else {
      setLoadingSlots(false);
    }
  }

  function onDateChange(nextDate: string) {
    latestSlotsRequestRef.current += 1;
    setDate(nextDate);
    setSlots([]);
    setSlotValue("");

    if (serviceId && nextDate) {
      void fetchSlots(serviceId, nextDate);
    } else {
      setLoadingSlots(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!serviceId || !slotValue) {
      setErrorMessage("Please choose a service and time.");
      return;
    }

    setBooking(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const response = await fetch(`/api/public/${slug}/book`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startTime: slotValue,
          name,
          email,
          phone,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setErrorMessage(data.error ?? "Booking failed.");
        setBooking(false);
        return;
      }

      setSuccessMessage("Booking confirmed.");
      setSlotValue("");
      setName("");
      setEmail("");
      setPhone("");

      await fetchSlots(serviceId, date);
      setBooking(false);
    } catch {
      setErrorMessage("Booking failed.");
      setBooking(false);
    }
  }

  if (loadingBootstrap) {
    return (
      <div className="space-y-4">
        <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-zinc-700">Loading booking page...</p>
        </section>
      </div>
    );
  }

  if (bootstrapError || !barber) {
    return (
      <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
        {bootstrapError || "Unable to load booking page."}
      </section>
    );
  }

  return (
    <div className="space-y-4">
      <BarberProfileCard barber={barber} />

      {services.length === 0 ? (
        <BookingStepCard
          step={1}
          title="Select service"
          description="This barber does not have active services available right now."
        >
          <p className="text-sm text-zinc-700">Please check back later.</p>
        </BookingStepCard>
      ) : (
        <form className="space-y-4" onSubmit={onSubmit}>
          <BookingStepCard step={1} title="Select service">
            <fieldset className="space-y-2" aria-label="1. Select service">
              {services.map((service) => {
                const isSelected = service.id === serviceId;

                return (
                  <label
                    key={service.id}
                    className={`block cursor-pointer rounded-xl border px-3 py-3 text-sm transition ${
                      isSelected
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-800 hover:border-zinc-400"
                    }`}
                  >
                    <input
                      checked={isSelected}
                      className="sr-only"
                      name="serviceId"
                      type="radio"
                      value={service.id}
                      onChange={(event) => onServiceChange(event.target.value)}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{service.name}</p>
                      <p className={isSelected ? "text-zinc-100" : "text-zinc-600"}>{formatCurrency(service.priceCents)}</p>
                    </div>
                    <p className={`mt-1 ${isSelected ? "text-zinc-100" : "text-zinc-600"}`}>{service.durationMinutes} min</p>
                    {service.description ? (
                      <div className={`mt-2 rounded-lg px-2 py-1.5 text-xs ${isSelected ? "bg-white/10 text-zinc-100" : "bg-zinc-50 text-zinc-600"}`}>
                        <span className="font-medium">Includes: </span>
                        {service.description}
                      </div>
                    ) : null}
                  </label>
                );
              })}
            </fieldset>
          </BookingStepCard>

          <BookingStepCard step={2} title="Select date">
            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-800">2. Date</span>
              <input
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                min={minDate}
                required
                type="date"
                value={date}
                onChange={(event) => onDateChange(event.target.value)}
              />
            </label>
          </BookingStepCard>

          <BookingStepCard step={3} title="Display available time slots" description="Slots are generated by the scheduling engine.">
            {loadingSlots ? <p className="text-sm text-zinc-600">Checking availability...</p> : null}
            {!loadingSlots && date && slots.length === 0 ? (
              <p className="text-sm text-zinc-600">No available times for this date.</p>
            ) : null}
            <label className="space-y-1 text-sm">
              <span className="font-medium text-zinc-800">3. Available time slots</span>
              <p className="text-xs text-zinc-500">Times shown in {barber.timezone}.</p>
              <select
                aria-label="3. Available time slots"
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 disabled:bg-zinc-100"
                disabled={!date || loadingSlots || slots.length === 0}
                required
                value={slotValue}
                onChange={(event) => setSlotValue(event.target.value)}
              >
                <option value="">{date ? "Select a time" : "Choose a date first"}</option>
                {slots.map((slot) => (
                  <option key={slot.startTime} value={slot.startTime}>
                    {formatTimeInTimeZone(slot.startTime, barber.timezone)}
                  </option>
                ))}
              </select>
            </label>
          </BookingStepCard>

          <BookingStepCard step={4} title="Enter client details">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="font-medium text-zinc-800">Name</span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-800">Email</span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                  required
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                />
              </label>

              <label className="space-y-1 text-sm">
                <span className="font-medium text-zinc-800">Phone</span>
                <input
                  className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900"
                  required
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
            </div>
          </BookingStepCard>

          <BookingStepCard step={5} title="Confirm booking">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">Review</p>
              <p>Service: {selectedService ? selectedService.name : "Not selected"}</p>
              <p>
                Time:{" "}
                {selectedSlot
                  ? `${formatDateTimeInTimeZone(selectedSlot.startTime, barber.timezone)} (${barber.timezone})`
                  : "Not selected"}
              </p>
            </div>

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
              Please arrive on time. Contact the barber directly if you need to cancel or reschedule.
            </p>

            <button
              className="w-full rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
              disabled={booking || !slotValue || !name || !email || !phone}
              type="submit"
            >
              {booking ? "Booking..." : "5. Confirm booking"}
            </button>
          </BookingStepCard>
        </form>
      )}

      {errorMessage ? <p className="text-sm text-red-700">{errorMessage}</p> : null}
      {successMessage ? <p className="text-sm text-emerald-700">{successMessage}</p> : null}
    </div>
  );
}
