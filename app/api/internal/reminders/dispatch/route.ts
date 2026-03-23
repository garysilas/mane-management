import { NextResponse } from "next/server";

import { dispatchDueReminders } from "@/lib/reminders/dispatch";

function isAuthorized(request: Request, secret: string) {
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(request: Request) {
  const triggerSecret = process.env.TRIGGER_SECRET_KEY;

  if (!triggerSecret) {
    return NextResponse.json({ error: "Reminder dispatcher is not configured." }, { status: 500 });
  }

  if (!isAuthorized(request, triggerSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const summary = await dispatchDueReminders();
    console.info("Reminder dispatch completed.", summary);
    return NextResponse.json(summary);
  } catch (error) {
    console.error("Reminder dispatch failed.", error);
    return NextResponse.json({ error: "Unable to dispatch reminders." }, { status: 500 });
  }
}
