# API routes

## Overview

This area contains Next.js route handlers for dashboard operations, public booking, reminders, and provider webhooks. Handlers stay thin and delegate reusable rules to `lib`.

## Key files

| File | Owns |
|---|---|
| `app/api/public/[slug]/book/route.ts` | Canonical public booking write endpoint |
| `app/api/public/[slug]/slots/route.ts` | Public slot lookup in the barber timezone |
| `app/api/internal/reminders/dispatch/route.ts` | Secret protected reminder dispatch entry point |
| `app/api/webhooks/clerk/route.ts` | Clerk signature verification and event entry point |

## Conventions

* Await dynamic route `params`, because Next.js provides them as a promise.
* Parse JSON, path values, and query values with the matching schema in `lib/validators`.
* Return JSON errors with explicit status codes. Use 400, 401, 404, and 409 for expected failures, then a generic 500 response.
* Authenticated routes call `getOrCreateCurrentBarber()` and include `barberId` in every database filter.
* Public routes resolve the barber by slug and confirm that related services belong to that barber.
* Keep booking writes in `lib/bookings` and `lib/scheduling`, not inside route handlers.

## Gotchas

* `POST /api/appointments` is retired and returns 410. Use `POST /api/public/[slug]/book`.
* Clerk and Stripe webhook routes verify signatures, but their event switches do not persist provider state yet.
* The reminder dispatch route requires the bearer value from `TRIGGER_SECRET_KEY`.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
