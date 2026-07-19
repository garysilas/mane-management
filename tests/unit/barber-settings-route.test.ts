import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrCreateCurrentBarber: vi.fn(),
  barberUpdate: vi.fn(),
}));

vi.mock("@/lib/auth/current-barber", () => ({
  getOrCreateCurrentBarber: mocks.getOrCreateCurrentBarber,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    barber: {
      update: mocks.barberUpdate,
    },
  },
}));

import { PATCH } from "@/app/api/barber/route";
import { UnauthorizedError } from "@/lib/utils/errors";

describe("barber settings route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrCreateCurrentBarber.mockResolvedValue({ id: "barber-1" });
  });

  it("persists editable settings for the current barber", async () => {
    mocks.barberUpdate.mockResolvedValue({
      businessName: "Jay Fades",
      location: null,
      timezone: "America/Los_Angeles",
      bookingPolicy: "Please cancel at least 24 hours ahead.",
      slug: "jayfades",
      email: "jay@example.com",
    });

    const response = await PATCH(
      new Request("http://localhost/api/barber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: "  Jay Fades  ",
          location: "   ",
          timezone: "America/Los_Angeles",
          bookingPolicy: "  Please cancel at least 24 hours ahead.  ",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(mocks.barberUpdate).toHaveBeenCalledWith({
      where: { id: "barber-1" },
      data: {
        businessName: "Jay Fades",
        location: null,
        timezone: "America/Los_Angeles",
        bookingPolicy: "Please cancel at least 24 hours ahead.",
      },
      select: {
        businessName: true,
        location: true,
        timezone: true,
        bookingPolicy: true,
        slug: true,
        email: true,
      },
    });
    await expect(response.json()).resolves.toEqual({
      businessName: "Jay Fades",
      location: null,
      timezone: "America/Los_Angeles",
      bookingPolicy: "Please cancel at least 24 hours ahead.",
      slug: "jayfades",
      email: "jay@example.com",
    });
  });

  it("rejects invalid timezones", async () => {
    const response = await PATCH(
      new Request("http://localhost/api/barber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: "Jay Fades",
          location: "Brooklyn",
          timezone: "Mars/Phobos",
          bookingPolicy: "Please arrive on time.",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.barberUpdate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Invalid timezone." });
  });

  it("returns 401 when the barber lookup is unauthorized", async () => {
    mocks.getOrCreateCurrentBarber.mockRejectedValue(new UnauthorizedError());

    const response = await PATCH(
      new Request("http://localhost/api/barber", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: "Jay Fades",
          location: "Brooklyn",
          timezone: "America/New_York",
          bookingPolicy: "Please arrive on time.",
        }),
      }),
    );

    expect(response.status).toBe(401);
    expect(mocks.barberUpdate).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
