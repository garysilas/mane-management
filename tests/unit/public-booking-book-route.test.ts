import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findBookingBarberBySlug: vi.fn(),
  createConfirmedBooking: vi.fn(),
}));

vi.mock("@/lib/bookings/create-booking", async () => {
  const actual = await vi.importActual<typeof import("@/lib/bookings/create-booking")>("@/lib/bookings/create-booking");

  return {
    ...actual,
    findBookingBarberBySlug: mocks.findBookingBarberBySlug,
    createConfirmedBooking: mocks.createConfirmedBooking,
  };
});

import { AppointmentStatus } from "@prisma/client";

import { POST } from "@/app/api/public/[slug]/book/route";
import { ConflictError } from "@/lib/utils/errors";

const validPayload = {
  serviceId: "cm1234567890123456789012",
  startTime: "2026-03-11T15:00:00.000Z",
  name: "Alex Client",
  email: "alex@example.com",
  phone: "+15555550100",
  notes: "Prefers a taper",
};

const barber = {
  id: "barber-1",
  name: "Jay",
  businessName: "Jay Fades",
  timezone: "America/New_York",
};

function buildRequest(payload: unknown) {
  return new Request("http://localhost/api/public/jayfades/book", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("public booking write route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid booking payloads before looking up the barber", async () => {
    const response = await POST(buildRequest({ ...validPayload, serviceId: "not-a-cuid" }), {
      params: Promise.resolve({ slug: "jayfades" }),
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: expect.any(String) });
    expect(mocks.findBookingBarberBySlug).not.toHaveBeenCalled();
    expect(mocks.createConfirmedBooking).not.toHaveBeenCalled();
  });

  it("returns 404 when the public booking slug does not match a barber", async () => {
    mocks.findBookingBarberBySlug.mockResolvedValue(null);

    const response = await POST(buildRequest(validPayload), {
      params: Promise.resolve({ slug: "missing-barber" }),
    });

    expect(response.status).toBe(404);
    expect(mocks.findBookingBarberBySlug).toHaveBeenCalledWith("missing-barber");
    expect(mocks.createConfirmedBooking).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Barber not found." });
  });

  it("creates a confirmed booking for a valid public booking request", async () => {
    const appointment = {
      id: "appointment-1",
      status: AppointmentStatus.BOOKED,
      startTime: "2026-03-11T15:00:00.000Z",
      endTime: "2026-03-11T15:30:00.000Z",
    };

    mocks.findBookingBarberBySlug.mockResolvedValue(barber);
    mocks.createConfirmedBooking.mockResolvedValue(appointment);

    const response = await POST(buildRequest({ ...validPayload, name: "  Alex Client  " }), {
      params: Promise.resolve({ slug: "jayfades" }),
    });

    expect(response.status).toBe(201);
    expect(mocks.findBookingBarberBySlug).toHaveBeenCalledWith("jayfades");
    expect(mocks.createConfirmedBooking).toHaveBeenCalledWith(barber, {
      ...validPayload,
      name: "Alex Client",
    });
    await expect(response.json()).resolves.toEqual(appointment);
  });

  it("returns 409 when booking creation rejects an unavailable slot", async () => {
    mocks.findBookingBarberBySlug.mockResolvedValue(barber);
    mocks.createConfirmedBooking.mockRejectedValue(new ConflictError("This time slot is no longer available."));

    const response = await POST(buildRequest(validPayload), {
      params: Promise.resolve({ slug: "jayfades" }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "This time slot is no longer available." });
  });
});
