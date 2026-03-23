const mocks = vi.hoisted(() => ({
  getOrCreateCurrentBarber: vi.fn(),
  findMany: vi.fn(),
  create: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/auth/current-barber", () => ({
  getOrCreateCurrentBarber: mocks.getOrCreateCurrentBarber,
}));

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    timeOffBlock: {
      findMany: mocks.findMany,
      create: mocks.create,
      findFirst: mocks.findFirst,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}));

import { DELETE, PUT } from "@/app/api/time-off/[id]/route";
import { GET, POST } from "@/app/api/time-off/route";
import { UnauthorizedError } from "@/lib/utils/errors";

const barberId = "barber-1";
const timeOffBlockId = "c123456789012345678901234";

describe("time-off routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrCreateCurrentBarber.mockResolvedValue({ id: barberId });
  });

  it("lists time-off blocks for the current barber", async () => {
    mocks.findMany.mockResolvedValue([
      {
        id: timeOffBlockId,
        startTime: new Date("2026-03-10T14:00:00.000Z"),
        endTime: new Date("2026-03-10T15:00:00.000Z"),
        reason: "Lunch",
      },
    ]);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { barberId },
      orderBy: { startTime: "asc" },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });
    await expect(response.json()).resolves.toEqual([
      {
        id: timeOffBlockId,
        startTime: "2026-03-10T14:00:00.000Z",
        endTime: "2026-03-10T15:00:00.000Z",
        reason: "Lunch",
      },
    ]);
  });

  it("creates a time-off block for the current barber", async () => {
    mocks.create.mockResolvedValue({
      id: timeOffBlockId,
      startTime: new Date("2026-03-10T14:00:00.000Z"),
      endTime: new Date("2026-03-10T15:00:00.000Z"),
      reason: null,
    });

    const response = await POST(
      new Request("http://localhost/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: "2026-03-10T14:00:00.000Z",
          endTime: "2026-03-10T15:00:00.000Z",
          reason: "   ",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.create).toHaveBeenCalledWith({
      data: {
        barberId,
        startTime: new Date("2026-03-10T14:00:00.000Z"),
        endTime: new Date("2026-03-10T15:00:00.000Z"),
        reason: null,
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });
  });

  it("rejects invalid time-off payloads", async () => {
    const response = await POST(
      new Request("http://localhost/api/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startTime: "2026-03-10T15:00:00.000Z",
          endTime: "2026-03-10T14:00:00.000Z",
        }),
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("updates an existing time-off block", async () => {
    mocks.findFirst.mockResolvedValue({
      id: timeOffBlockId,
      startTime: new Date("2026-03-10T14:00:00.000Z"),
      endTime: new Date("2026-03-10T15:00:00.000Z"),
      reason: null,
    });
    mocks.update.mockResolvedValue({
      id: timeOffBlockId,
      startTime: new Date("2026-03-10T14:00:00.000Z"),
      endTime: new Date("2026-03-10T15:00:00.000Z"),
      reason: "Vacation",
    });

    const response = await PUT(
      new Request("http://localhost/api/time-off/c123456789012345678901234", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Vacation" }),
      }),
      { params: Promise.resolve({ id: timeOffBlockId }) },
    );

    expect(response.status).toBe(200);
    expect(mocks.update).toHaveBeenCalledWith({
      where: { id: timeOffBlockId },
      data: {
        startTime: new Date("2026-03-10T14:00:00.000Z"),
        endTime: new Date("2026-03-10T15:00:00.000Z"),
        reason: "Vacation",
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        reason: true,
      },
    });
  });

  it("deletes an existing time-off block", async () => {
    mocks.findFirst.mockResolvedValue({ id: timeOffBlockId });
    mocks.delete.mockResolvedValue(undefined);

    const response = await DELETE(new Request("http://localhost/api/time-off/c123456789012345678901234"), {
      params: Promise.resolve({ id: timeOffBlockId }),
    });

    expect(response.status).toBe(204);
    expect(mocks.delete).toHaveBeenCalledWith({ where: { id: timeOffBlockId } });
  });

  it("returns 401 when the barber lookup is unauthorized", async () => {
    mocks.getOrCreateCurrentBarber.mockRejectedValue(new UnauthorizedError());

    const response = await GET();

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });
});
