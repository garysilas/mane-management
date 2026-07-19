const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  findUnique: vi.fn(),
  transaction: vi.fn(),
  txFindUnique: vi.fn(),
  txUpdate: vi.fn(),
  txCreate: vi.fn(),
  availabilityCount: vi.fn(),
  availabilityCreateMany: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    barber: {
      findUnique: mocks.findUnique,
    },
    $transaction: mocks.transaction,
  },
}));

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";

function buildBarber(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "barber-1",
    clerkUserId: "user-old",
    slug: "jayfades",
    name: "Jay Fades",
    businessName: null,
    email: "barber@example.com",
    phone: null,
    location: null,
    timezone: "America/New_York",
    createdAt: new Date("2026-07-14T00:00:00.000Z"),
    updatedAt: new Date("2026-07-14T00:00:00.000Z"),
    ...overrides,
  };
}

describe("getOrCreateCurrentBarber", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ userId: "user-new" });
    mocks.currentUser.mockResolvedValue({
      firstName: "Jay",
      lastName: "Fades",
      username: "jayfades",
      primaryEmailAddress: {
        emailAddress: "barber@example.com",
      },
      emailAddresses: [{ emailAddress: "barber@example.com" }],
    });
  });

  it("relinks an existing barber by email when the Clerk user id changes", async () => {
    const existingBarber = buildBarber();
    const relinkedBarber = buildBarber({ clerkUserId: "user-new" });

    mocks.findUnique.mockResolvedValueOnce(null);
    mocks.txFindUnique.mockResolvedValue(existingBarber);
    mocks.txUpdate.mockResolvedValue(relinkedBarber);
    mocks.availabilityCount.mockResolvedValue(0);
    mocks.transaction.mockImplementation(async (callback: (tx: unknown) => Promise<unknown>) =>
      callback({
        barber: {
          findUnique: mocks.txFindUnique,
          update: mocks.txUpdate,
          create: mocks.txCreate,
        },
        availabilityRule: {
          count: mocks.availabilityCount,
          createMany: mocks.availabilityCreateMany,
        },
      }),
    );

    const barber = await getOrCreateCurrentBarber();

    expect(barber).toEqual(relinkedBarber);
    expect(mocks.txFindUnique).toHaveBeenCalledWith({ where: { email: "barber@example.com" } });
    expect(mocks.txUpdate).toHaveBeenCalledWith({
      where: { id: "barber-1" },
      data: { clerkUserId: "user-new" },
    });
    expect(mocks.availabilityCreateMany).toHaveBeenCalledWith({
      data: [
        { barberId: "barber-1", dayOfWeek: 1, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 2, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 3, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 4, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 5, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
      ],
    });
    expect(mocks.txCreate).not.toHaveBeenCalled();
  });

  it("creates a new barber when no existing barber matches the Clerk user or email", async () => {
    const createdBarber = buildBarber({ clerkUserId: "user-new" });

    mocks.findUnique.mockImplementation(async ({ where }: { where: { clerkUserId?: string; slug?: string } }) => {
      if (where.clerkUserId === "user-new") {
        return null;
      }

      if (where.slug === "jayfades") {
        return null;
      }

      return null;
    });
    mocks.transaction
      .mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) =>
        callback({
          barber: {
            findUnique: mocks.txFindUnique.mockResolvedValueOnce(null),
            update: mocks.txUpdate,
            create: mocks.txCreate,
          },
          availabilityRule: {
            count: mocks.availabilityCount,
            createMany: mocks.availabilityCreateMany,
          },
        }),
      )
      .mockImplementationOnce(async (callback: (tx: unknown) => Promise<unknown>) => {
        mocks.txCreate.mockResolvedValueOnce(createdBarber);
        return callback({
          barber: {
            create: mocks.txCreate,
          },
          availabilityRule: {
            createMany: mocks.availabilityCreateMany,
          },
        });
      });

    const barber = await getOrCreateCurrentBarber();

    expect(barber).toEqual(createdBarber);
    expect(mocks.txCreate).toHaveBeenCalledWith({
      data: {
        clerkUserId: "user-new",
        slug: "jayfades",
        name: "Jay Fades",
        businessName: null,
        email: "barber@example.com",
        phone: null,
        location: null,
        timezone: "America/New_York",
      },
    });
    expect(mocks.availabilityCreateMany).toHaveBeenCalledWith({
      data: [
        { barberId: "barber-1", dayOfWeek: 1, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 2, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 3, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 4, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
        { barberId: "barber-1", dayOfWeek: 5, startTimeLocal: "09:00", endTimeLocal: "17:00", isActive: true },
      ],
    });
  });
});
