# Mane Manager

Barber-first business management platform MVP.

## Tech Stack
- Next.js (App Router) + React + TailwindCSS
- Node.js + TypeScript
- PostgreSQL + Prisma
- Clerk (auth)
- Stripe (payments)
- Twilio (SMS)
- Resend (email)
- Trigger.dev (jobs)

## Getting Started

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

## Project Structure

- `app/`: public booking route, dashboard routes, and API handlers
- `components/`: UI, booking, dashboard, and form components
- `lib/`: business logic, validators, db/auth integrations
- `prisma/schema.prisma`: source of truth for data models
- `trigger/jobs/`: background job definitions
- `tests/unit`: Vitest tests
- `tests/e2e`: Playwright tests

## Env Docs

- [Environment variables](./docs/environment.md)

## Current MVP Coverage

- Barber auth scaffolding with Clerk
- Service CRUD for barbers
- Public booking page at `/{slug}`
- Slot generation and server-side double-booking prevention
- Appointment creation + reminder records + confirmation hooks
- Basic dashboard pages for calendar/clients/payments/analytics/settings
