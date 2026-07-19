# Mane Manager

Barber-first scheduling and lightweight business management MVP.

## Tech Stack

- Next.js (App Router) + React + TailwindCSS
- Node.js + TypeScript
- PostgreSQL + Prisma
- Clerk (auth)
- Twilio (SMS confirmation/reminder hooks)
- Resend (email confirmation/reminder hooks)
- Trigger.dev (future reminder jobs)
- Stripe scaffolding is preserved, but payments are intentionally gated for the MVP

## Getting Started

```bash
npm install
cp .env.example .env
npm run prisma:generate
npm run dev
```

For this VPS checkout, use the Linux Node path first if `~/.hermes/node/bin/node` shadows the real Node binary:

```bash
export PATH=/home/hermes/.nvm/versions/node/v22.23.1/bin:$PATH
```

## Project Structure

- `app/`: public booking route, dashboard routes, and API handlers
- `components/`: UI, booking, dashboard, and form components
- `lib/`: business logic, validators, db/auth integrations
- `prisma/schema.prisma`: source of truth for data models
- `prisma/migrations/`: database migrations
- `trigger/jobs/`: background job definitions
- `tests/unit`: Vitest tests
- `tests/e2e`: Playwright tests

## Env Docs

- [Environment variables](./docs/environment.md)

## Current MVP Coverage

- Barber auth scaffolding with Clerk and lazy barber bootstrap
- Service CRUD for barbers
- Service tiering fields: category/tier, featured flag, and public sort order
- Public booking page at `/{slug}`
- Public booking page service cards with value notes, category badges, and featured badges
- Slot generation and server-side double-booking prevention
- Appointment creation + reminder records + best-effort confirmation hooks
- Waitlist request capture when a client cannot find an available slot
- Dashboard pages for calendar, clients, services, analytics, settings, and availability/time off
- Business Health analytics with retention signals: overdue clients, due-back-soon clients, repeat client rate, and average days between visits
- Editable booking policy shown to clients before confirmation
- Payments route is still present but gated; Stripe/payment code remains preserved scaffolding, not active MVP functionality

## Phase 5 Product Improvements

Phase 5 added the follow-up product slices from the booking/retention plan:

### Waitlist MVP

- New `WaitlistRequest` Prisma model and migration.
- New public endpoint: `POST /api/public/[slug]/waitlist`.
- Public booking UI now offers a waitlist option when a chosen date has no available slots.
- Waitlist requests store client name, email/phone, selected service, preferred date, preferred window, and status.

### Service Tiering

- Services now support `category`, `isFeatured`, and `sortOrder`.
- Dashboard service form lets barbers set category/tier, featured status, and display order.
- Public booking service cards display featured/category badges.
- Public services sort by featured status, sort order, then creation date.

### Booking Policy

- Barber settings now include a booking policy field.
- The public booking confirmation step shows the custom booking policy when present.
- A default policy message is shown if the barber has not set one.

### Manual Rebooking Support

- Business Health analytics already surfaces overdue clients and due-back-soon clients for manual outreach.
- Bulk SMS/email campaign automation remains intentionally out of scope for the MVP.

## Verification

Latest verification after Phase 5 implementation:

```bash
export PATH=/home/hermes/.nvm/versions/node/v22.23.1/bin:$PATH
npx prisma generate
DATABASE_URL='postgresql://user:pass@localhost:5432/mane_manager' npx prisma validate
npm run test:unit
npm run lint
npm run build
npm run test:e2e -- tests/e2e/booking-flow.spec.ts
```

Results:

- Prisma Client generation: passed
- Prisma schema validation with placeholder `DATABASE_URL`: passed
- Unit tests: 23 files / 77 tests passed
- ESLint: passed
- Production build: passed
- Playwright booking-flow spec: passed after installing the Chromium browser with `npx playwright install chromium`

Note: the existing Playwright booking flow is still mocked. It verifies browser/UI behavior, not a real database-backed booking transaction.
