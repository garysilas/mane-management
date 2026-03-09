import { clientIdSchema, clientNoteSchema } from "@/lib/validators/client";

describe("client validator", () => {
  it("accepts a valid client id payload", () => {
    const parsed = clientIdSchema.safeParse({ id: "cm4kik02z0000886h4x1f4yte" });

    expect(parsed.success).toBe(true);
  });

  it("rejects an invalid client id", () => {
    const parsed = clientIdSchema.safeParse({ id: "123" });

    expect(parsed.success).toBe(false);
  });

  it("accepts a valid note payload", () => {
    const parsed = clientNoteSchema.safeParse({ note: "Client prefers a low taper with scissors on top." });

    expect(parsed.success).toBe(true);
  });

  it("rejects an empty note", () => {
    const parsed = clientNoteSchema.safeParse({ note: "   " });

    expect(parsed.success).toBe(false);
  });

  it("rejects notes longer than 1000 chars", () => {
    const parsed = clientNoteSchema.safeParse({ note: "a".repeat(1001) });

    expect(parsed.success).toBe(false);
  });
});
