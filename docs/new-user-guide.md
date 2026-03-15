# New User Guide

## What this project is

Mane Manager is an MVP for barber-focused business management built on Next.js App Router. The implemented core is:

- authenticated barber dashboard pages
- public booking pages at `/{slug}`
- service management
- weekly availability rules
- slot generation and appointment conflict checks
- basic client, payment, and analytics views

The project already includes schema and scaffolding for payments, reminders, and background jobs, but parts of that surface are still placeholders.

## Stack at a glance

- Next.js 16 App Router
- React 19
- TypeScript
- Prisma + PostgreSQL
- Clerk for auth
- Stripe, Twilio, Resend, Trigger.dev integrations
- Vitest for unit tests
- Playwright for e2e

Useful commands:

```bash
npm run dev
npm test
npm run test:e2e
npm run prisma:generate
npm run prisma:migrate
```

## Directory map

### `app/`

App Router pages and API routes.

- `app/page.tsx`: simple landing page with links into the dashboard and a sample public booking slug.
- `app/(public)/[slug]/page.tsx`: public booking page shell.
- `app/(dashboard)/*`: dashboard pages for services, clients, analytics, payments, calendar, and settings.
- `app/api/public/[slug]/*`: public booking bootstrap, services, slot lookup, and booking creation.
- `app/api/services/*`: authenticated service CRUD.
- `app/api/availability/*`: authenticated availability rule CRUD.
- `app/api/clients/[id]/notes/route.ts`: append a timestamped note onto a client record.
- `app/api/webhooks/*`: Clerk and Stripe webhook entry points.

### `components/`

Mostly thin UI wrappers around the route handlers.

- `components/booking/*`: public booking UI.
- `components/forms/*`: service forms, availability manager, client note form, row actions.
- `components/dashboard/sidebar.tsx`: sidebar navigation for the protected area.

Two forms coexist for services:

- `components/forms/service-form.tsx` is the active one used by the routed create/edit pages.
- `components/forms/service-manager.tsx` looks like an older all-in-one CRUD component and is not currently used.

### `lib/`

Most of the real business logic sits here.

- `lib/auth/current-barber.ts`: resolves the Clerk user to a `Barber` row and lazily creates one if missing.
- `lib/db/prisma.ts`: Prisma singleton.
- `lib/scheduling/*`: slot generation, overlap detection, appointment creation.
- `lib/validators/*`: Zod schemas for public booking, services, availability, and client notes.
- `lib/analytics/metrics.ts`: simple aggregate counts and revenue totals.
- `lib/email/resend.ts`, `lib/messaging/twilio.ts`, `lib/payments/stripe.ts`: integration wrappers.

### `prisma/`

Schema and migrations.

- `prisma/schema.prisma` is the source of truth for the domain model.
- `prisma/migrations/20260307185731_init/migration.sql` is the initial migration.

### `trigger/`

Background job definitions.

- `trigger/jobs/send-appointment-reminder.ts` defines a reminder task, but it is not wired into booking creation yet.

### `tests/`

- `tests/unit/*`: current source of truth for scheduling and validator behavior.
- `tests/e2e/booking-flow.spec.ts`: Playwright coverage for the public booking page, but it has drift from the current API shape.

## Domain model

The Prisma schema is straightforward and worth reading before changing anything:

- `Barber`: the owner account, keyed to Clerk by `clerkUserId`, with `slug` and `timezone`.
- `Service`: barber-defined offerings with duration, price, and active status.
- `Client`: barber-scoped customer record.
- `Appointment`: links barber, client, and service with start/end times and status.
- `AvailabilityRule`: recurring weekly working hours stored as `dayOfWeek` plus `HH:mm` strings.
- `TimeOffBlock`: one-off blocked windows.
- `Payment`: one payment per appointment.
- `Reminder`: pending/sent reminder records tied to an appointment.

## Main flows

### 1. Barber bootstrap and auth

Protected dashboard pages call `getOrCreateCurrentBarber()` in `lib/auth/current-barber.ts`.

What it does:

- reads the Clerk session
- finds the `Barber` row by `clerkUserId`
- if missing, creates a new barber row
- seeds default Monday-Friday `09:00-17:00` availability rules
- generates a unique slug from the Clerk profile

This means the real onboarding path is lazy. The first authenticated dashboard/API request creates the barber profile instead of a dedicated signup flow or Clerk webhook sync.

### 2. Public booking

The public booking page lives at `/{slug}` and is backed by four routes:

- `GET /api/public/[slug]`: returns barber profile and active services.
- `GET /api/public/[slug]/services`: active services only.
- `GET /api/public/[slug]/slots`: generates open time slots for a service/date.
- `POST /api/public/[slug]/book`: validates input and creates the appointment.

The browser flow in `components/booking/public-booking-form.tsx` is:

1. Load barber + service bootstrap.
2. Let the client choose a service and date.
3. Fetch slots for that service/date.
4. Submit booking details.
5. Refresh slots after success.

### 3. Scheduling and conflict prevention

The scheduling engine is in `lib/scheduling/engine.ts`.

Important responsibilities:

- merge overlapping availability windows
- subtract time-off windows
- round slot starts up to the configured interval
- reject overlaps against existing appointments
- ignore cancelled appointments when checking conflicts

`lib/scheduling/appointments.ts` is the booking write path. It:

- loads the barber and active service
- computes `endTime` from service duration
- reads overlapping existing appointments
- checks availability inside a serializable transaction
- finds or creates a client record
- creates the appointment
- creates reminder rows scheduled 24 hours before the appointment

The conflict prevention story is strongest part of the current business logic. The unit tests cover availability window subtraction, slot generation, and cancelled-appointment behavior.

### 4. Dashboard flows

Implemented dashboard behavior is uneven:

- `dashboard`: summary metrics from `lib/analytics/metrics.ts`
- `calendar`: lists upcoming and past appointments
- `services`: create, edit, activate/deactivate, delete
- `clients`: list clients and view appointment history
- `clients/[id]`: append timestamped notes into the client record
- `settings/availability`: CRUD for weekly availability rules
- `payments`: read-only list of payment rows
- `analytics`: read-only duplicate of the dashboard aggregates

Several dashboard pages are real read/write screens, but payments and analytics are mainly display layers over sparse data.

## Business logic worth understanding first

### `lib/auth/current-barber.ts`

This file controls account bootstrap, slug creation, and default availability seeding. Any change to barber creation or onboarding should start here.

### `lib/scheduling/engine.ts`

This is the core scheduling engine. If slots, overlaps, recurring availability, or time off change, update this file and its unit tests together.

### `lib/scheduling/appointments.ts`

This is where booking safety lives. It is the write path to study before changing public booking, manual booking, reminders, or client deduping.

### `app/api/public/[slug]/slots/route.ts`

This route shows how availability rules, time off blocks, and existing appointments are assembled before calling the engine.

### `app/api/public/[slug]/book/route.ts`

This is the current public booking endpoint the UI actually calls.

### `app/api/services/*` and `app/api/availability/*`

These are the main authenticated CRUD examples in the app. If you need a pattern for new protected APIs, these routes are the best reference.

## Brittle areas and gaps

These are the places I would treat carefully as a new contributor.

### Timezone handling is the biggest risk

Availability rules are stored as local clock strings like `09:00`, and the `Barber` model also stores a timezone. But the scheduling engine and slot route currently build and compare windows against UTC dates and UTC midnight.

Consequences:

- slot generation does not actually apply the barber timezone
- public booking dates are interpreted as `YYYY-MM-DDT00:00:00.000Z`
- displayed slot times depend on the browser locale, not the barber timezone
- DST and non-UTC barbers are likely wrong

This affects `lib/utils/time.ts`, `lib/scheduling/engine.ts`, and `app/api/public/[slug]/slots/route.ts`.

### Booking endpoint drift already exists

There are two booking creation routes:

- `app/api/appointments/route.ts`
- `app/api/public/[slug]/book/route.ts`

They are nearly duplicated, and the Playwright spec still mocks `POST /api/appointments` even though the public form submits to `POST /api/public/[slug]/book`.

That is a maintenance trap and a sign the tests have fallen behind the app shape.

### Payments are mostly schema-level right now

The schema, page, and Stripe webhook route exist, but there is no code creating `Payment` rows and the Stripe webhook handler does not persist anything yet.

Effects:

- `payments` page may stay empty forever unless rows are inserted elsewhere
- analytics revenue stays zero unless payments are manually created
- `stripePaymentIntentId` is unused

### Reminders are recorded but not orchestrated

Booking creation inserts `Reminder` rows, and there is a Trigger.dev task for sending reminders, but nothing currently schedules or dispatches that task from the booking flow.

Also note that booking confirmation messages are sent immediately from the request path through Twilio/Resend, while reminder rows are only persisted.

### Time off exists in the model but not in the product

`TimeOffBlock` is part of the schema and slot generation path, but there is no dashboard UI or CRUD API for barbers to manage it.

That means the engine supports a feature the product cannot realistically use yet.

### Client deduping is simplistic

`findOrCreateClient()` treats a matching email or phone as the same person and overwrites that client’s name/contact/notes on booking.

That is convenient for an MVP but brittle if:

- family members share a phone number
- a client reuses an email for someone else
- one booking comes with partial data and another with fuller data

### Client notes are stored as a single blob

Notes are appended into `Client.notes` as timestamped text instead of a separate note table.

That makes editing, searching, auditing, and concurrent note updates awkward.

### Clerk webhook is a stub

`app/api/webhooks/clerk/route.ts` verifies the signature but does not synchronize anything into Prisma.

Today, the real source of truth is lazy creation from `getOrCreateCurrentBarber()`, not webhook-driven provisioning.

### Slug creation can race

`buildUniqueSlug()` loops with `findUnique()` calls before the transaction creates the barber. Under concurrent first-login requests for the same base slug, this can still lose a race on the unique constraint.

There is no retry path for that case yet.

## How to work safely in this codebase

- If you change scheduling behavior, update `tests/unit/slot-generation.test.ts`, `tests/unit/barber-availability.test.ts`, and `tests/unit/appointment-conflicts.test.ts`.
- If you touch booking endpoints, update the Playwright spec at `tests/e2e/booking-flow.spec.ts`.
- If you implement payments, wire all three layers together: payment creation, webhook persistence, and analytics queries.
- If you implement reminders, decide whether the source of truth is the `Reminder` table, immediate request-time sends, or Trigger.dev jobs. The code currently mixes these ideas.
- Treat `timezone` as unfinished until slot generation and display are explicitly timezone-aware.

## Current verification status

I ran the unit suite with `npm test`; all 18 unit tests passed.

I also attempted `npm run test:e2e`, but the run did not complete cleanly in this environment because the local Next.js dev server could not be started consistently from Playwright. Independent of that environment issue, the spec also appears stale because it mocks the old booking endpoint.
