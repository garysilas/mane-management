# Scope: Mane Manager MVP

Mane Manager helps independent barbers run appointments and gives booking clients a simple path from choosing a service through managing a confirmed visit. This plan assumes one barber per workspace, shared public booking links, no active payments, and success measured by completed appointments managed without off platform work.

**Build approach:** Journey (finish one complete barber or booking client path before starting the next).
**Workflow:** Beta (`/check verify`, then `/test` after `/develop`). The project's default rigor tier; a feature's own tier tag overrides it.

_You are in charge. Every box below is a **suggestion**, not a gate: run any, skip any, and mark a feature `done` when you decide it is. The workflow records what you actually did, including skipped steps. The one thing it asks is that a load bearing decision be written down in a spec._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Barber identity and workspace | Existing product | existing |
| 2 | Business settings and availability | Existing product | existing |
| 3 | Service catalog | Existing product | existing |
| 4 | Public booking | Existing product | existing |
| 5 | Calendar and appointment status | Existing product | existing |
| 6 | Client records and notes | Existing product | existing |
| 7 | Confirmations and reminders | Existing product | existing |
| 8 | Retention signals | Existing product | existing |
| 9 | Waitlist capture | Existing product | existing |
| 10 | Barber creates an appointment | Journey 1 | planned |
| 11 | Barber changes an appointment | Journey 1 | planned |
| 12 | Client manages a booking | Journey 2 | planned |
| 13 | Client trust and accessibility | Launch readiness | planned |
| 14 | Product health and conversion signals | Launch readiness | planned |

## Existing product

### 1. Barber identity and workspace · existing
Barbers can sign in and reach a protected workspace that keeps business records separate by barber.
**Done when:** a signed in barber reaches only their own dashboard and protected records.
Code in `middleware.ts`, `lib/auth/current-barber.ts`, and `app/(dashboard)/`

### 2. Business settings and availability · existing
Barbers can maintain public business details, timezone, weekly working hours, time off, and a booking policy.
**Done when:** settings control the public profile and the appointment times clients can choose.
Code in `app/(dashboard)/settings/`, `components/forms/barber-settings-form.tsx`, `components/forms/availability-manager.tsx`, and `components/forms/time-off-manager.tsx`

### 3. Service catalog · existing
Barbers can create, edit, order, feature, group, activate, and deactivate bookable services.
**Done when:** active services appear on the public booking page in the barber's chosen order with useful price and duration details.
Code in `app/(dashboard)/services/`, `app/api/services/`, and `components/forms/service-manager.tsx`

### 4. Public booking · existing
Booking clients can view a barber, choose a service and date, select an open time, enter contact details, and confirm an appointment.
**Done when:** a valid booking creates one conflict safe appointment and clear success, empty, loading, and error states are shown.
Code in `app/(public)/[slug]/`, `components/booking/public-booking-form.tsx`, `app/api/public/[slug]/`, and `lib/bookings/create-booking.ts`

### 5. Calendar and appointment status · existing
Barbers can review upcoming and past appointments, cancel a future booking, and record completed visits or no shows.
**Done when:** the barber sees appointment details in their timezone and valid status changes are enforced.
Code in `app/(dashboard)/calendar/page.tsx`, `components/forms/appointment-status-actions.tsx`, and `app/api/appointments/[id]/route.ts`

### 6. Client records and notes · existing
Bookings build a barber owned client list with contact details, visit history, and private notes.
**Done when:** a barber can open a client profile, review visit history, and save notes without seeing another barber's records.
Code in `app/(dashboard)/clients/`, `app/api/clients/[id]/notes/route.ts`, and `lib/scheduling/appointments.ts`

### 7. Confirmations and reminders · existing
Booking confirmation delivery is best effort, and due appointment reminders can be dispatched and tracked through their delivery state.
**Done when:** configured channels send confirmation and reminder messages, failures do not undo a booking, and cancelled appointments are not reminded.
Code in `lib/email/resend.ts`, `lib/messaging/twilio.ts`, `lib/reminders/dispatch.ts`, `trigger/jobs/send-appointment-reminder.ts`, and `app/api/internal/reminders/dispatch/route.ts`

### 8. Retention signals · existing
Barbers can see core activity and simple client return signals, including overdue clients, clients due back soon, repeat rate, and visit interval.
**Done when:** dashboard counts and retention measures reflect the barber's completed and upcoming appointments.
Code in `app/(dashboard)/dashboard/page.tsx`, `app/(dashboard)/analytics/page.tsx`, and `lib/analytics/metrics.ts`

### 9. Waitlist capture · existing
When a selected date has no open time, a booking client can leave contact details and a preferred time window for barber follow up.
**Done when:** a valid request is stored for the correct barber and service, and the client sees a clear confirmation.
Code in `components/booking/public-booking-form.tsx`, `app/api/public/[slug]/waitlist/route.ts`, and `prisma/schema.prisma`

## Journey 1: Barber controls an appointment

### 10. Barber creates an appointment · needs a decision
Let a barber book a phone request, walk in, or returning client without sending the public link or leaving the calendar.
**Done when:** the barber can choose a service, client, and open time, add an optional note, resolve conflicts, and see the new appointment on the calendar.
- [ ] Design it (spec): `/architect barber creates an appointment`

### 11. Barber changes an appointment · needs a decision
Let a barber open an appointment and correct its service, time, client details, or note while keeping the schedule trustworthy.
**Done when:** the barber can view and edit one appointment, unavailable changes are rejected clearly, reminders follow the new time, and the calendar shows the result.
- [ ] Design it (spec): `/architect barber changes an appointment`

## Journey 2: Client controls a confirmed booking

### 12. Client manages a booking · needs a decision · GA
Give a booking client a secure path from confirmation messages to review, cancel, or reschedule their own future appointment.
**Done when:** only a client with valid booking access can view the appointment, cancel it, or move it to an open time, with clear expiry, conflict, error, and confirmation states.
- [ ] Design it (spec): `/architect client manages a booking`

## Launch readiness

### 13. Client trust and accessibility · needs a decision
Make the public booking and booking management journeys understandable, accessible, and clear about contact data and message consent.
**Done when:** both journeys meet the chosen accessibility target, work by keyboard and screen reader, explain data and notification use before submission, and link to current privacy and service terms.
- [ ] Design it (spec): `/architect client trust and accessibility`

### 14. Product health and conversion signals · needs a decision
Give the product owner enough evidence to find broken booking steps and learn whether visits move from selection to confirmation and completion.
**Done when:** important booking and management events are measured without sensitive contact data, failures are visible, and a small health view answers where clients stop.
- [ ] Design it (spec): `/architect product health and conversion signals`

## Deferred

Out of scope for the next build pass, kept so the plan stays honest.

* **Waitlist inbox and fulfillment:** let barbers review requests, offer open times, and close fulfilled or declined requests · needs a decision
* **Automated rebooking outreach:** contact clients who are due back or overdue and track the result · needs a decision
* **Payments and deposits:** collect deposits or full payment and manage refunds · needs a decision · GA
* **Multiple barbers and locations:** share services, calendars, clients, and roles across a business · needs a decision · GA
* **Public discovery:** add search metadata, structured business details, share cards, and a public marketing path · needs a decision
* **International markets:** support additional languages, currencies, phone formats, and right to left layouts · needs a decision

## Legend

**The decision box.** Every planned feature carries one task whose label ends with `(spec)`. Run `/architect` first when a feature needs a decision.

**Feature lifecycle:**

| State | Set by | The feature shows |
|---|---|---|
| `planned` and needs a decision | `/scope` | one box, `Design it (spec): /architect <feature>` |
| `in-progress` after design | `/architect` | the design box checked, the spec linked, build milestones, and the workflow closing steps |
| `in-progress` while building | `/develop` | build milestones checked as work lands, with a code pointer |
| `done` | You, with workflow help | completed or skipped steps recorded and the delivered code linked |
| `existing` | `/scope` | complete work that predates this workflow, with code pointers and no task list |
| `dropped` | `/scope` | work kept for history but removed from the active plan |

* **Next step** means the first unchecked box.
* **Needs a decision** means run `/architect` first. A feature without that tag can go straight to `/develop`.
* **Atomic build tasks** live in the spec. This file keeps only a small milestone rollup after design.
* **Workflow** sets the suggested steps after `/develop`. Prototype adds nothing. Alpha adds `/check verify`. Beta adds `/check verify` and `/test`. GA also adds `/check review` and `/document`.
* **A feature tier tag** overrides the project workflow for that feature.
* **Existing** means complete work that predates this workflow. It is different from `done`.
