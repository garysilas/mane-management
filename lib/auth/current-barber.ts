import { auth, currentUser } from "@clerk/nextjs/server";
import { Prisma, type Barber } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { slugify } from "@/lib/utils/slug";

const defaultAvailabilityTemplate = [
  { dayOfWeek: 1, startTimeLocal: "09:00", endTimeLocal: "17:00" },
  { dayOfWeek: 2, startTimeLocal: "09:00", endTimeLocal: "17:00" },
  { dayOfWeek: 3, startTimeLocal: "09:00", endTimeLocal: "17:00" },
  { dayOfWeek: 4, startTimeLocal: "09:00", endTimeLocal: "17:00" },
  { dayOfWeek: 5, startTimeLocal: "09:00", endTimeLocal: "17:00" },
] as const;

const MAX_BARBER_BOOTSTRAP_RETRIES = 3;

function buildDefaultAvailabilityRules(barberId: string) {
  return defaultAvailabilityTemplate.map((rule) => ({
    barberId,
    dayOfWeek: rule.dayOfWeek,
    startTimeLocal: rule.startTimeLocal,
    endTimeLocal: rule.endTimeLocal,
    isActive: true,
  }));
}

function isUniqueConstraintErrorForField(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.includes(field);
  }

  return target === field;
}

async function buildUniqueSlug(base: string): Promise<string> {
  const baseCandidate = base || "barber";
  let candidate = baseCandidate;
  let suffix = 1;

  while (true) {
    const existing = await prisma.barber.findUnique({ where: { slug: candidate } });
    if (!existing) {
      return candidate;
    }

    candidate = `${baseCandidate}-${suffix}`;
    suffix += 1;
  }
}

export async function getOrCreateCurrentBarber(): Promise<Barber> {
  const { userId } = await auth();

  if (!userId) {
    throw new UnauthorizedError();
  }

  const existing = await prisma.barber.findUnique({ where: { clerkUserId: userId } });
  if (existing) {
    return existing;
  }

  const user = await currentUser();
  if (!user) {
    throw new UnauthorizedError();
  }

  const email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress;
  if (!email) {
    throw new UnauthorizedError("Authenticated user is missing an email address in Clerk.");
  }

  const rawName = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  const name = rawName || user.username || "Barber";
  const baseSlug = slugify(user.username || rawName || userId.slice(0, 8)) || "barber";

  for (let attempt = 0; attempt < MAX_BARBER_BOOTSTRAP_RETRIES; attempt += 1) {
    const slug = await buildUniqueSlug(baseSlug);

    try {
      return await prisma.$transaction(async (tx) => {
        const barber = await tx.barber.create({
          data: {
            clerkUserId: userId,
            slug,
            name,
            businessName: null,
            email,
            phone: null,
            location: null,
            timezone: "America/New_York",
          },
        });

        await tx.availabilityRule.createMany({
          data: buildDefaultAvailabilityRules(barber.id),
        });

        return barber;
      });
    } catch (error) {
      if (isUniqueConstraintErrorForField(error, "clerkUserId")) {
        const createdBarber = await prisma.barber.findUnique({ where: { clerkUserId: userId } });
        if (createdBarber) {
          return createdBarber;
        }
      }

      if (isUniqueConstraintErrorForField(error, "slug") && attempt < MAX_BARBER_BOOTSTRAP_RETRIES - 1) {
        continue;
      }

      throw error;
    }
  }

  throw new Error("Unable to create barber profile.");
}
