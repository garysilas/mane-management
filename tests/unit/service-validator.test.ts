import { serviceSchema, serviceUpdateSchema } from "@/lib/validators/service";

describe("service validator", () => {
  it("accepts a valid service payload", () => {
    const parsed = serviceSchema.safeParse({
      name: "Haircut",
      description: "Classic haircut service",
      durationMinutes: 30,
      priceCents: 3500,
      isActive: true,
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects durations shorter than 5 minutes", () => {
    const parsed = serviceSchema.safeParse({
      name: "Lineup",
      durationMinutes: 4,
      priceCents: 1500,
      isActive: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects durations longer than 240 minutes", () => {
    const parsed = serviceSchema.safeParse({
      name: "Extended session",
      durationMinutes: 241,
      priceCents: 15000,
      isActive: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects non-positive prices", () => {
    const parsed = serviceSchema.safeParse({
      name: "Haircut",
      durationMinutes: 30,
      priceCents: 0,
      isActive: true,
    });

    expect(parsed.success).toBe(false);
  });

  it("requires at least one field for service updates", () => {
    const parsed = serviceUpdateSchema.safeParse({});

    expect(parsed.success).toBe(false);
  });
});
