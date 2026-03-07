# Environment Variables

Copy `.env.example` to `.env` and set values before running the app.

## Core
- `DATABASE_URL`: PostgreSQL connection string.
- `APP_URL`: Base URL for local/dev deployment.

## Clerk
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `CLERK_WEBHOOK_SIGNING_SECRET`

## Stripe
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

## Twilio
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_PHONE`

## Resend
- `RESEND_API_KEY`
- `RESEND_FROM_EMAIL`

## Trigger.dev
- `TRIGGER_SECRET_KEY`
