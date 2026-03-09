import { NextResponse } from "next/server";

import { getOrCreateCurrentBarber } from "@/lib/auth/current-barber";
import { prisma } from "@/lib/db/prisma";
import { UnauthorizedError } from "@/lib/utils/errors";
import { clientIdSchema, clientNoteSchema } from "@/lib/validators/client";

type RouteProps = {
  params: Promise<{ id: string }>;
};

function formatNoteTimestamp(timestamp: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "numeric",
      minute: "2-digit",
    }).format(timestamp);
  } catch {
    return timestamp.toISOString();
  }
}

export async function POST(request: Request, { params }: RouteProps) {
  try {
    const barber = await getOrCreateCurrentBarber();

    const idValidation = clientIdSchema.safeParse(await params);
    if (!idValidation.success) {
      return NextResponse.json({ error: idValidation.error.issues[0]?.message ?? "Invalid client id." }, { status: 400 });
    }

    const payload = await request.json();
    const parsed = clientNoteSchema.safeParse(payload);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid payload." }, { status: 400 });
    }

    const existingClient = await prisma.client.findFirst({
      where: {
        id: idValidation.data.id,
        barberId: barber.id,
      },
      select: {
        id: true,
        notes: true,
      },
    });

    if (!existingClient) {
      return NextResponse.json({ error: "Client not found." }, { status: 404 });
    }

    const noteEntry = `[${formatNoteTimestamp(new Date(), barber.timezone)}] ${parsed.data.note}`;
    const nextNotes = existingClient.notes?.trim()
      ? `${existingClient.notes.trim()}\n\n${noteEntry}`
      : noteEntry;

    const updatedClient = await prisma.client.update({
      where: { id: existingClient.id },
      data: { notes: nextNotes },
      select: {
        id: true,
        notes: true,
      },
    });

    return NextResponse.json(updatedClient, { status: 201 });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    return NextResponse.json({ error: "Unable to add client note." }, { status: 500 });
  }
}
