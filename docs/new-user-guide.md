# New User Guide

This guide is for the next engineer who needs to understand the repo quickly, make safe changes, and avoid the current traps.

## What This Project Is

Mane Manager is a barber-focused scheduling MVP built with Next.js App Router, Prisma, and Clerk.

The current intended MVP surface is:

- authenticated dashboard pages for barber operations
- public booking pages at `/{slug}`
- service management
- weekly availability rules
- time-off blocks
- client views and append-only notes
- calendar views with basic appointment status actions
- operational analytics only

Payments are not part of the active MVP surface right now. The codebase still contains payment and Stripe scaffolding, but those features are intentionally hidden or gated.

## Read This First

Before you start building new product work, know these three things:

1. The booking write path is currently regressed.
   - `lib/scheduling/appointments.ts` is the first file you should inspect.
2. The Playwright booking test is mocked.
   - It is useful for UI flow, but it does not validate real booking writes.
3. Payments are preserved for later.
   - Do not re-expose them without implementing the full Stripe/payment lifecycle.

## Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- Clerk for auth
- Stripe for future payment work
- Twilio for SMS
- Resend for email
- Trigger.dev for background tasks
- Vitest for unit tests
- Playwright for browser tests

## Useful Commands

```bash
npm run dev
npm run lint
npm test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
```

What they currently mean in practice:

- `npm run lint`
  - passes, but leaves warnings in `lib/scheduling/appointments.ts`
- `npm test`
  - currently fails in booking validation / guardrail suites
- `npm run test:e2e`
  - depends on a clean local Next dev-server state and still uses mocked booking APIs

## Repo Layout

### `app/`

App Router pages and API routes.

- `app/page.tsx`
  - landing page
- `app/(public)/[slug]/page.tsx`
  - public booking page shell
- `app/(dashboard)/*`
  - protected dashboard pages
- `app/api/public/[slug]/*`
  - public booking APIs
- `app/api/services/*`
  - authenticated service CRUD
- `app/api/availability/*`
  - authenticated weekly availability CRUD
- `app/api/time-off/*`
  - authenticated time-off CRUD
- `app/api/appointments/[id]/route.ts`
  - appointment status updates
- `app/api/appointments/route.ts`
  - deprecated endpoint that now returns `410`
- `app/api/webhooks/*`
  - Clerk and Stripe webhook entry points

### `components/`

Mostly thin UI around route handlers and server data.

- `components/booking/*`
  - public booking UI
- `components/forms/*`
  - dashboard forms and action components
- `components/dashboard/sidebar.tsx`
  - dashboard navigation

Important note:

- `components/forms/service-form.tsx` is the active service editor
- `components/forms/service-manager.tsx` looks like older unused UI

### `lib/`

Most of the business logic lives here.

- `lib/auth/current-barber.ts`
  - auth lookup and lazy barber bootstrap
- `lib/bookings/create-booking.ts`
  - public booking wrapper around `createAppointment()`
- `lib/scheduling/*`
  - booking writes, availability logic, slot generation, conflicts
- `lib/utils/time.ts`
  - timezone-aware helpers
- `lib/analytics/metrics.ts`
  - dashboard/analytics operational counts
- `lib/email/resend.ts`
  - email wrapper, no-ops if env vars are missing
- `lib/messaging/twilio.ts`
  - SMS wrapper, no-ops if env vars are missing
- `lib/payments/stripe.ts`
  - Stripe client helper preserved for future work

### `prisma/`

- `prisma/schema.prisma`
  - source of truth for the data model
- `prisma/migrations/*`
  - schema migrations

### `trigger/`

- `trigger/jobs/send-appointment-reminder.ts`
  - reminder task definition
  - currently not wired to a dispatcher from stored reminder rows

### `tests/`

- `tests/unit/*`
  - strongest source of truth for scheduling behavior
- `tests/e2e/booking-flow.spec.ts`
  - useful UI coverage, but mocked

## Main Flows

### 1. Auth And Barber Bootstrap

Protected dashboard pages call `getOrCreateCurrentBarber()` from `lib/auth/current-barber.ts`.

What it does:

- reads the Clerk session
- finds a `Barber` row by `clerkUserId`
- creates one if missing
- seeds default Monday-Friday `09:00-17:00` availability
- generates a unique slug

This means onboarding is lazy. There is no dedicated setup wizard or Clerk-to-Prisma sync flow yet.

### 2. Public Booking

The public booking page is `/{slug}`.

Routes involved:

- `GET /api/public/[slug]`
- `GET /api/public/[slug]/services`
- `GET /api/public/[slug]/slots`
- `POST /api/public/[slug]/book`

Current flow:

1. Load barber profile and active services.
2. Pick a service and date.
3. Fetch available slots.
4. Submit booking details.
5. Attempt best-effort confirmation delivery.

Important caveat:

- the booking UI flow exists
- the slot generation path exists
- the booking write transaction is currently the weakest part of the system and needs repair

### 3. Scheduling

Core files:

- `lib/scheduling/engine.ts`
- `lib/utils/time.ts`
- `lib/scheduling/appointments.ts`

Current responsibilities:

- merge weekly availability windows
- subtract time-off blocks
- generate bookable slots
- ignore cancelled appointments when checking overlaps
- update appointment lifecycle status for booked appointments

Good news:

- timezone helpers and slot-generation tests are in better shape than older docs implied
- availability and time-off APIs are implemented

Current problem:

- `createAppointment()` is not internally consistent right now and is the source of current test failures

### 4. Dashboard Operations

### Services

This is one of the cleanest parts of the app:

- create service
- edit service
- activate/deactivate service
- delete service when not blocked by appointment relations

### Availability And Time Off

Current state:

- weekly availability rules can be created, edited, toggled, and deleted
- time-off blocks can be created and deleted from the current UI
- the backend also supports updating time-off blocks, but there is no edit UI yet

Important caveat:

- the time-off form uses `datetime-local` and currently reflects the user’s device timezone, not an explicit barber-timezone picker

### Calendar

Current state:

- upcoming and historical appointments are listed
- `BOOKED` appointments can be:
  - cancelled if future
  - marked completed if past
  - marked no-show if past

Missing:

- reschedule flow
- manual appointment creation
- richer calendar interactions

### Clients

Current state:

- list clients
- open client profile
- review appointment history
- append notes

Important caveat:

- notes are stored as a single timestamped text blob on the `Client` record
- there is no edit/delete note flow
- client merge/deduping is still heuristic, not a full identity system

### Analytics

Current MVP analytics are intentionally basic:

- upcoming appointment count
- total clients
- completed appointment count

There is no revenue in dashboard or analytics UI anymore.

### Payments

Current behavior:

- sidebar entry is removed
- `/payments` exists but shows a gated MVP message
- Stripe and `Payment` model code remain in the repo

Treat payments as preserved scaffolding, not as active product functionality.

## Notifications And Integrations

### Email / SMS

`lib/email/resend.ts` and `lib/messaging/twilio.ts` are intentionally soft-failing wrappers:

- if the required env vars are missing, they return without throwing
- local development can therefore work without configured providers

### Reminder Rows

Booking writes create `Reminder` rows 24 hours before an appointment.

What does not exist yet:

- a dispatcher that picks up pending reminders
- status transitions from `PENDING` to `SENT` / `FAILED` in a real job pipeline

### Webhooks

Current state:

- Clerk webhook verifies signatures, then does nothing
- Stripe webhook verifies signatures, then does nothing with events

## Current Known Issues

### Booking write path regression

`lib/scheduling/appointments.ts` currently needs attention.

Symptoms:

- booking validation tests import symbols that no longer exist
- guardrail tests fail against the current time-off query behavior
- the transaction body references data that is not defined consistently

If you need one “fix this first” target, this is it.

### Mocked Playwright booking test

`tests/e2e/booking-flow.spec.ts` now targets the right public booking route, but it still intercepts and fulfills requests with mocks.

That means:

- it does not prove Prisma writes work
- it does not prove reminder records or confirmations behave correctly
- it does not catch regressions inside `createAppointment()`

### Legacy / preserved code

These areas still exist in the repo but should not be treated as current MVP features:

- `Payment` model + Stripe client helper
- Stripe webhook logic
- gated `/payments` page
- unused `components/forms/service-manager.tsx`

## Safe Starting Points

If you are new to the repo, start here in order:

1. `docs/current-state.md`
2. `prisma/schema.prisma`
3. `lib/auth/current-barber.ts`
4. `lib/utils/time.ts`
5. `lib/scheduling/engine.ts`
6. `lib/scheduling/appointments.ts`
7. `lib/bookings/create-booking.ts`
8. `components/booking/public-booking-form.tsx`
9. `app/(dashboard)/settings/availability/page.tsx`

## Rules Of Thumb For Changes

- If you touch booking logic, update unit tests first and verify the real write path.
- If you touch time or scheduling, inspect both `lib/utils/time.ts` and `lib/scheduling/engine.ts`.
- If you touch public booking, prefer `/api/public/[slug]/book`.
- Do not revive `/api/appointments` as a parallel booking write path without a clear reason.
- If you implement payments, do it end-to-end:
  - payment creation
  - webhook persistence
  - UI/reporting surfaces
- If you implement reminders, decide whether the `Reminder` table or a direct job pipeline is the source of truth.

## Bottom Line

This project is no longer a vague scaffold. It has a real dashboard surface, real scheduling models, real CRUD for services and weekly availability, real time-off records, and basic client/calendar operations.

The main gap is reliability at the booking write layer, not a lack of overall product shape. Fix that first, then use the rest of the repo as a solid base for the next iteration.
