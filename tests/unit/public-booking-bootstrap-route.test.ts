import { vi } from "vitest";

const mocks = vi.hoisted(() => ({
  barberFindUnique: vi.fn(),
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    barber: {
      findUnique: mocks.barberFindUnique,
    },
  },
}));

import { GET } from "@/app/api/public/[slug]/route";

describe("public booking bootstrap route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current public-facing barber settings for booking", async () => {
    mocks.barberFindUnique.mockResolvedValue({
      slug: "jayfades",
      name: "Jay",
      businessName: "Jay Fades",
      location: "Brooklyn",
      timezone: "America/New_York",
      services: [
        {
          id: "cm1234567890123456789012",
          name: "Haircut",
          description: "Classic cut",
          durationMinutes: 30,
          priceCents: 3500,
        },
      ],
    });

    const response = await GET(new Request("http://localhost/api/public/jayfades"), {
      params: Promise.resolve({ slug: "jayfades" }),
    });

    expect(response.status).toBe(200);
    expect(mocks.barberFindUnique).toHaveBeenCalledWith({
      where: { slug: "jayfades" },
      select: {
        slug: true,
        name: true,
        businessName: true,
        location: true,
        timezone: true,
        services: {
          where: {
            isActive: true,
          },
          orderBy: { createdAt: "asc" },
          select: {
            id: true,
            name: true,
            description: true,
            durationMinutes: true,
            priceCents: true,
          },
        },
      },
    });
    await expect(response.json()).resolves.toEqual({
      barber: {
        slug: "jayfades",
        name: "Jay",
        businessName: "Jay Fades",
        location: "Brooklyn",
        timezone: "America/New_York",
      },
      services: [
        {
          id: "cm1234567890123456789012",
          name: "Haircut",
          description: "Classic cut",
          durationMinutes: 30,
          priceCents: 3500,
        },
      ],
    });
  });
});
