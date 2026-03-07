import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const event = await verifyWebhook(request);

    switch (event.type) {
      case "user.created":
      case "user.updated":
      case "user.deleted":
        break;
      default:
        break;
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Invalid Clerk webhook", error);
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }
}
