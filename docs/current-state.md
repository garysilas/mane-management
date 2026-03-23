# Current State

Last reviewed: 2026-03-23

This document is an honest handoff snapshot of the repository as it exists today. It is meant to answer three questions quickly:

1. What does the product currently do?
2. What is working versus partially wired versus broken?
3. Where should the next engineer start?

## Executive Summary

Mane Manager is a Next.js App Router MVP for barber scheduling and lightweight business operations. The current shipped surface is centered on:

- authenticated dashboard pages for services, calendar, clients, availability, time off, and basic analytics
- public booking pages at `/{slug}`
- Prisma-backed scheduling logic and domain models
- optional email/SMS confirmation hooks

Payments are intentionally not part of the active MVP surface. The codebase still contains Stripe and `Payment` scaffolding, but the UI now hides or gates those features instead of presenting them as working.

The biggest current problem is the booking write path. The public booking UI and slot lookup are in place, but `lib/scheduling/appointments.ts` is in a regressed state and the booking validation suites are failing. If you are picking up this project, fix and verify booking writes before treating the app as production-ready.

## Verification Snapshot

Commands run during this review:

- `npm run lint`
  - Result: passes with 5 warnings in `lib/scheduling/appointments.ts`
  - Warnings are unused imports left behind by an incomplete booking-validation refactor.
- `npm test`
  - Result: fails
  - Current output: 10 failing tests across `tests/unit/booking-validation.test.ts` and `tests/unit/appointment-booking-guardrails.test.ts`
  - The failures line up with the current code in `lib/scheduling/appointments.ts`, which references validation symbols that are no longer defined and uses a time-off query shape that the tests are not mocking.
- `npm run test:e2e -- tests/e2e/booking-flow.spec.ts`
  - Result: could not be rerun cleanly because `.next/dev/lock` was already held by another Next.js dev process
  - Also note: the Playwright spec is mocked. Even when it passes, it does not prove the real database-backed booking path works.

## Product Surface Today

### Public app

- `/{slug}` renders a public booking page
- `GET /api/public/[slug]` returns barber profile and active services
- `GET /api/public/[slug]/slots` returns generated slots for a service and date
- `POST /api/public/[slug]/book` is the intended booking write endpoint

### Dashboard

- `Dashboard`: operational summary counts only
- `Calendar`: upcoming + history lists, with status actions for booked appointments
- `Services`: create, edit, activate/deactivate, delete
- `Clients`: list, profile, appointment history, append-only notes
- `Settings`: barber slug/timezone/email readout plus link to availability management
- `Settings > Availability`: weekly availability CRUD and time-off management
- `Analytics`: same operational counts as dashboard, no revenue
- `Payments`: route still exists but now shows an explicit MVP gate

### Integrations

- Clerk: used for auth and lazy barber bootstrap
- Twilio / Resend: confirmation and reminder wrappers exist, but calls no-op if env vars are missing
- Stripe: webhook signature verification exists, but no persistence side effects
- Trigger.dev: reminder task exists, but no orchestration currently dispatches it from stored reminder rows

## Status By Area

| Area | Status | Notes |
|---|---|---|
| Dashboard auth shell | Working | Protected layout uses Clerk and lazy barber bootstrap via `getOrCreateCurrentBarber()`. |
| Barber bootstrap | Working | First authenticated request creates a `Barber` row and default Monday-Friday `09:00-17:00` availability. |
| Service CRUD | Working | UI and APIs are wired end-to-end. |
| Availability rule CRUD | Working | Create/update/delete with overlap protection for active rules. |
| Time-off management | Partially implemented | API supports create/update/delete, but current dashboard UI only creates, lists, and deletes blocks. |
| Public booking bootstrap | Working | Public page loads barber profile and active services correctly. |
| Slot generation | Working with test coverage | Uses timezone-aware date helpers and scheduling engine utilities; unit coverage currently passes. |
| Public booking write path | Regressed | `createAppointment()` currently references validation logic that is not present and is the source of failing tests. |
| Calendar operations | Partially implemented | Can cancel future booked appointments and mark past booked appointments as completed or no-show. No reschedule or manual create flow. |
| Clients and notes | Partially implemented | Client list/profile/history work; notes are appended into a single text blob instead of a structured note model. |
| Analytics | Working for MVP scope | Dashboard and analytics pages show operational counts only. Revenue has been removed. |
| Payments | Intentionally gated | Navigation entry removed, page shows an MVP notice, backend Stripe/payment scaffolding remains unused. |
| Reminder delivery | Stubbed / partial | Booking code creates `Reminder` rows and confirmation hooks exist, but scheduled reminder orchestration is not wired. |
| Clerk webhook sync | Stubbed | Signature verified, no persistence behavior. |
| Stripe webhook sync | Stubbed | Signature verified, event switch is effectively a no-op. |
| E2E coverage | Partial | Booking Playwright flow is mocked and does not hit the real booking transaction path. |

## Important Code Paths

These are the files worth understanding before making changes:

- `lib/scheduling/appointments.ts`
  - Central booking write path and appointment status updates.
  - Currently the highest-risk file in the repo.
- `lib/bookings/create-booking.ts`
  - Wrapper used by public booking routes.
  - Adds best-effort confirmation delivery on top of `createAppointment()`.
- `lib/scheduling/engine.ts`
  - Availability merging, time-off subtraction, slot generation, overlap logic.
- `lib/utils/time.ts`
  - Timezone-aware helpers used by slot generation and public booking display.
- `lib/auth/current-barber.ts`
  - Lazy barber provisioning and default availability seeding.
- `app/api/public/[slug]/book/route.ts`
  - Canonical booking endpoint.
- `app/api/appointments/route.ts`
  - Explicitly deprecated. Returns `410` and points callers to `/api/public/[slug]/book`.
- `app/(dashboard)/settings/availability/page.tsx`
  - Entry point for weekly availability and time-off management.
- `components/booking/public-booking-form.tsx`
  - Main user-facing booking UI.

## Known Problems And Risks

### 1. Booking writes are currently the top issue

The public booking path is not in a clean state:

- `tests/unit/booking-validation.test.ts` imports `getBookingValidationError` and `BOOKING_VALIDATION_ERRORS`, but those exports are not currently present in `lib/scheduling/appointments.ts`
- `createAppointment()` now queries `tx.timeOffBlock.findFirst(...)`, while the guardrail test mocks were written for `findMany(...)`
- the transaction body references `timeOffBlocks` even though that variable is not defined in the current implementation

Practical takeaway: do not assume public booking is working because slot lookup and the mocked Playwright flow look healthy.

### 2. The Playwright booking test is not a full end-to-end test

`tests/e2e/booking-flow.spec.ts` now targets the live public booking endpoint path (`/api/public/jayfades/book`), which is good. However:

- it still fulfills the network requests with mocks
- it does not hit Prisma
- it does not exercise `createAppointment()`
- it does not verify reminders, notifications, or client merge behavior

It is useful for UI flow, but not for booking backend correctness.

### 3. Time-off is only partially surfaced in the dashboard

The backend can create, update, and delete `TimeOffBlock` records. The UI currently:

- creates blocks
- lists blocks
- deletes blocks

There is no edit flow in the dashboard yet, even though the `PUT /api/time-off/[id]` route exists.

### 4. Time-off input uses the client device timezone

`components/forms/time-off-manager.tsx` uses `datetime-local` inputs and explicitly tells the user that times use the current device timezone. That means:

- the input experience is not barber-timezone aware
- a barber editing schedule data while traveling could create confusing time-off blocks

This is not a backend blocker, but it is an important product behavior to understand before changing scheduling UX.

### 5. Reminders and webhooks are mostly scaffolding

Current state:

- booking writes attempt best-effort immediate confirmation delivery
- `Reminder` rows are created 24 hours before appointments
- Trigger.dev reminder task exists
- no scheduler/dispatcher currently consumes the stored reminder rows
- Clerk and Stripe webhooks verify signatures but do not reconcile state into Prisma

### 6. Payments are preserved for later, not active now

Current state:

- `Payment` model remains in Prisma
- Stripe client helper and webhook route remain
- `/payments` is still a valid route, but it is intentionally gated
- dashboard and analytics no longer show revenue

This is deliberate. Do not re-expose payments or revenue in the MVP unless you are implementing the full end-to-end flow.

## Suggested Next Steps

Recommended order for the next engineer:

1. Repair `lib/scheduling/appointments.ts`
   - Restore or replace booking validation logic.
   - Make the transaction code internally consistent again.
   - Get the failing booking unit suites passing.
2. Re-verify public booking against the real backend
   - Run the unit suite cleanly.
   - Run Playwright with a clean dev server state.
   - Add at least one non-mocked integration test if possible.
3. Decide reminder strategy
   - Either wire `Reminder` rows into a dispatcher/Trigger flow, or explicitly defer and document them as persistence-only.
4. Decide whether to expand settings/profile management
   - `Settings` is still mostly read-only outside availability/time-off.
5. Leave payments gated until real persistence exists
   - If payments become active work, implement creation, webhook persistence, and reporting together.

## Quick File Map

- `app/(dashboard)/*`
  - protected pages
- `app/api/public/[slug]/*`
  - public booking APIs
- `app/api/services/*`
  - service CRUD
- `app/api/availability/*`
  - weekly availability CRUD
- `app/api/time-off/*`
  - time-off CRUD
- `app/api/appointments/[id]/route.ts`
  - appointment status updates
- `components/forms/*`
  - most dashboard interactivity
- `lib/scheduling/*`
  - booking and slot logic
- `lib/bookings/create-booking.ts`
  - public booking wrapper
- `trigger/jobs/send-appointment-reminder.ts`
  - unused reminder task definition

## Bottom Line

The repo is in decent shape as an MVP scheduling application around services, availability, time off, clients, and basic dashboard operations. The current blocker is not product scope; it is booking correctness. Fix the booking write path first, then verify it cleanly. Everything else should be planned around that.
