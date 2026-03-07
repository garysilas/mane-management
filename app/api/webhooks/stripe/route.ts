import { NextResponse } from "next/server";

import { getStripeClient } from "@/lib/payments/stripe";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe webhook signature or secret" }, { status: 400 });
  }

  try {
    const payload = await request.text();
    const stripe = getStripeClient();

    const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);

    switch (event.type) {
      case "payment_intent.succeeded":
      case "payment_intent.payment_failed":
      case "checkout.session.completed":
      default:
        break;
    }

    return NextResponse.json({ received: true, type: event.type });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Stripe webhook error";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
