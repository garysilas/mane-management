import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  barberFindUnique: vi.fn(),
  waitlistRequestCreate: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    barber: {
      findUnique: mocks.barberFindUnique,
    },
    waitlistRequest: {
      create: mocks.waitlistRequestCreate,
    },
  },
}));

import { POST } from "@/app/api/public/[slug]/waitlist/route";

const validPayload = {
  serviceId: "cm1234567890123456789012",
  clientName: "Alex Client",
  email: "alex@example.com",
  phone: null,
  preferredDate: "2026-04-03T12:00:00.000Z",
  preferredWindow: "After 5pm",
};

function buildRequest(payload: unknown) {
  return new Request("http://localhost/api/public/jayfades/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

describe("public waitlist route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects invalid payloads before looking up the barber", async () => {
    const response = await POST(buildRequest({ ...validPayload, email: null, phone: null }), {
      params: Promise.resolve({ slug: "jayfades" }),
    });

    expect(response.status).toBe(400);
    expect(mocks.barberFindUnique).not.toHaveBeenCalled();
    expect(mocks.waitlistRequestCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when the public slug is missing", async () => {
    mocks.barberFindUnique.mockResolvedValue(null);

    const response = await POST(buildRequest(validPayload), {
      params: Promise.resolve({ slug: "missing" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Barber not found." });
    expect(mocks.waitlistRequestCreate).not.toHaveBeenCalled();
  });

  it("creates a waitlist request for an active public service", async () => {
    const waitlistRequest = {
      id: "waitlist-1",
      status: "OPEN",
      preferredDate: new Date("2026-04-03T12:00:00.000Z"),
    };

    mocks.barberFindUnique.mockResolvedValue({
      id: "barber-1",
      services: [{ id: "cm1234567890123456789012" }],
    });
    mocks.waitlistRequestCreate.mockResolvedValue(waitlistRequest);

    const response = await POST(buildRequest({ ...validPayload, clientName: "  Alex Client  " }), {
      params: Promise.resolve({ slug: "jayfades" }),
    });

    expect(response.status).toBe(201);
    expect(mocks.barberFindUnique).toHaveBeenCalledWith({
      where: { slug: "jayfades" },
      select: {
        id: true,
        services: {
          where: { isActive: true },
          select: { id: true },
        },
      },
    });
    expect(mocks.waitlistRequestCreate).toHaveBeenCalledWith({
      data: {
        barberId: "barber-1",
        serviceId: "cm1234567890123456789012",
        clientName: "Alex Client",
        email: "alex@example.com",
        phone: null,
        preferredDate: new Date("2026-04-03T12:00:00.000Z"),
        preferredWindow: "After 5pm",
      },
      select: {
        id: true,
        status: true,
        preferredDate: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      id: "waitlist-1",
      status: "OPEN",
      preferredDate: "2026-04-03T12:00:00.000Z",
    });
  });

  it("returns 404 when the selected service is not active for the barber", async () => {
    mocks.barberFindUnique.mockResolvedValue({ id: "barber-1", services: [] });

    const response = await POST(buildRequest(validPayload), {
      params: Promise.resolve({ slug: "jayfades" }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Service not found." });
    expect(mocks.waitlistRequestCreate).not.toHaveBeenCalled();
  });
});
