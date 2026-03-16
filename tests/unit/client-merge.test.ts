import { buildClientUpdateData, selectClientForBooking } from "@/lib/scheduling/appointments";

describe("client merge safeguards", () => {
  it("prefers the exact contact match when another client shares a phone number", () => {
    const client = selectClientForBooking({
      client: {
        name: "Alex Client",
        email: "alex@example.com",
        phone: "+15555550100",
      },
      emailMatches: [
        {
          id: "client-alex",
          name: "Alex Client",
          email: "alex@example.com",
          phone: "+15555550100",
          notes: null,
        },
      ],
      phoneMatches: [
        {
          id: "client-alex",
          name: "Alex Client",
          email: "alex@example.com",
          phone: "+15555550100",
          notes: null,
        },
        {
          id: "client-household",
          name: "Jordan Household",
          email: "jordan@example.com",
          phone: "+15555550100",
          notes: null,
        },
      ],
    });

    expect(client?.id).toBe("client-alex");
  });

  it("refuses to merge when email and phone point at different clients", () => {
    const client = selectClientForBooking({
      client: {
        name: "Alex Client",
        email: "alex@example.com",
        phone: "+15555550100",
      },
      emailMatches: [
        {
          id: "client-email",
          name: "Alex Existing",
          email: "alex@example.com",
          phone: null,
          notes: null,
        },
      ],
      phoneMatches: [
        {
          id: "client-phone",
          name: "Taylor Existing",
          email: null,
          phone: "+15555550100",
          notes: null,
        },
      ],
    });

    expect(client).toBeNull();
  });

  it("refuses to merge on an ambiguous shared phone number", () => {
    const client = selectClientForBooking({
      client: {
        name: "Alex Client",
        phone: "+15555550100",
      },
      emailMatches: [],
      phoneMatches: [
        {
          id: "client-one",
          name: "Alex Existing",
          email: null,
          phone: "+15555550100",
          notes: null,
        },
        {
          id: "client-two",
          name: "Jordan Existing",
          email: null,
          phone: "+15555550100",
          notes: null,
        },
      ],
    });

    expect(client).toBeNull();
  });

  it("fills missing contact details without overwriting the existing name on a soft match", () => {
    const data = buildClientUpdateData({
      existing: {
        id: "client-one",
        name: "Alex Existing",
        email: "alex@example.com",
        phone: null,
        notes: null,
      },
      client: {
        name: "Alex Updated",
        email: "alex@example.com",
        phone: "+15555550100",
      },
    });

    expect(data).toEqual({
      email: "alex@example.com",
      phone: "+15555550100",
      notes: null,
    });
  });

  it("allows a name update only when both contact fields match exactly", () => {
    const data = buildClientUpdateData({
      existing: {
        id: "client-one",
        name: "Alex Existing",
        email: "alex@example.com",
        phone: "+15555550100",
        notes: null,
      },
      client: {
        name: "Alex Updated",
        email: "alex@example.com",
        phone: "+15555550100",
      },
    });

    expect(data).toEqual({
      name: "Alex Updated",
      email: "alex@example.com",
      phone: "+15555550100",
      notes: null,
    });
  });
});
