# Current State

Validation I ran:
- `npm test`: pass (18/18 unit tests)
- `npm run lint`: pass
- `npm run test:e2e`: fail (booking spec mocks old endpoint)
- `npm run build`: fails in this sandbox due blocked Google Fonts fetch (external network)

**Feature Status Table**
| Feature | Status | Evidence |
|---|---|---|
| Dashboard auth shell | Fully implemented | Protected layout + Clerk gating in [layout](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/layout.tsx:12) and [middleware](/Users/gary/Desktop/Mane%20Manager/mane-manager/middleware.ts:4). |
| Service CRUD (create/edit/activate/delete) | Fully implemented | API + UI are connected in [services API](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/services/route.ts:8), [service by id API](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/services/[id]/route.ts:13), [services page](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/services/page.tsx:9), [service form](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/forms/service-form.tsx:49). |
| Availability rule CRUD (weekly rules) | Fully implemented | End-to-end in [availability APIs](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/availability/route.ts:33), [availability by id API](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/availability/[id]/route.ts:37), [availability manager](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/forms/availability-manager.tsx:51). |
| Public booking bootstrap (barber + active services) | Fully implemented | [public bootstrap API](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/public/[slug]/route.ts:9) + [booking form load](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/booking/public-booking-form.tsx:82). |
| Slot generation engine | Partially implemented | Works for overlap logic, but UTC-only math in [slots route](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/public/[slug]/slots/route.ts:24), [engine](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/engine.ts:192), [time utils](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/utils/time.ts:11). |
| Booking creation safety | Partially implemented | Prevents overlap, but does not validate working-hours/time-off/past-time in [createAppointment](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts:70). |
| Calendar view | Fully implemented (read-only) | Data rendering is wired in [calendar page](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/calendar/page.tsx:31). |
| Clients + profile + notes | Partially implemented | Works, but notes are append-only text blob in [notes API](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/clients/[id]/notes/route.ts:57) and [client profile](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/clients/[id]/page.tsx:56). |
| Analytics dashboard | Partially implemented | Metrics query exists in [analytics](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/analytics/metrics.ts:5), but revenue depends on Payment rows never created by flows. |
| Payments feature | Stubbed / placeholder | Read-only page in [payments](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/payments/page.tsx:6); no payment create/update flow in app code. |
| Stripe webhook persistence | Stubbed / placeholder | Signature verified, but event switch has no side effects in [stripe webhook](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/webhooks/stripe/route.ts:19). |
| Reminder dispatch orchestration | Stubbed / placeholder | Reminder rows are created in [appointments](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts:138), Trigger task exists in [job](/Users/gary/Desktop/Mane%20Manager/mane-manager/trigger/jobs/send-appointment-reminder.ts:6), but no scheduling/dispatch path. |
| Time-off management | Stubbed / placeholder | Model is used by slots route, but no CRUD UI/API for `TimeOffBlock` (only schema/engine references). |
| Clerk webhook sync | Stubbed / placeholder | Verified webhook with empty switch body in [clerk webhook](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/webhooks/clerk/route.ts:8). |
| Legacy service manager UI | Stubbed / placeholder | Component exists in [service-manager](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/forms/service-manager.tsx:34) but is not referenced by routes. |
| E2E booking test coverage | Broken | Spec mocks `POST /api/appointments` in [booking-flow.spec.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/tests/e2e/booking-flow.spec.ts:41), but form posts to `/api/public/[slug]/book` in [public-booking-form](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/booking/public-booking-form.tsx:189). |

**Critical Issues**
1. Booking API accepts appointments outside availability/time-off and in the past (missing server-side schedule validation) in [createAppointment](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts:96).
2. Timezone handling is incorrect for non-UTC barbers and client locales (UTC day math + local browser rendering mismatch) in [slots route](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/public/[slug]/slots/route.ts:24), [engine](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/engine.ts:192), [booking UI time formatting](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/booking/public-booking-form.tsx:17).
3. Payments will not function in production: webhook does not persist anything and no payment write path exists ([stripe webhook](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/webhooks/stripe/route.ts:19), [analytics revenue dependency](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/analytics/metrics.ts:16)).
4. Reminders are recorded but never dispatched (data accumulates with no execution path) in [appointments](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts:161) and [trigger job](/Users/gary/Desktop/Mane%20Manager/mane-manager/trigger/jobs/send-appointment-reminder.ts:6).
5. QA guardrail is broken: e2e booking flow test is stale and currently failing ([spec](/Users/gary/Desktop/Mane%20Manager/mane-manager/tests/e2e/booking-flow.spec.ts:41)).
6. First-login slug generation has a concurrency race; can throw unique-constraint errors under parallel signup in [current-barber](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/auth/current-barber.ts:26).

**Incomplete Features**
- Missing backend logic:
  - Enforce availability/time-off and non-past booking constraints in booking creation.
  - Persist Stripe webhook events into `Payment` records and update status lifecycle.
  - Trigger reminder delivery from `Reminder` records.
- Missing UI connections:
  - No UI/API for `TimeOffBlock`.
  - Settings page is display-only (no timezone/slug/profile editing) in [settings page](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/settings/page.tsx:11).
  - Legacy [service-manager](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/forms/service-manager.tsx:34) is disconnected.
- Broken data flow:
  - Revenue analytics rely on `Payment` data that is never populated.
  - E2E test mocks obsolete endpoint, so regressions in real booking path are not covered.
- Edge cases not handled:
  - Cross-timezone booking date interpretation and DST.
  - Overwriting client identity on email/phone match in [findOrCreateClient](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts:31).
  - Concurrent slug generation race on new barber creation.

---

**Feature Status Table**

| Feature | Status | Missing Backend Logic | Missing UI Connections | Broken Data Flow | Edge Cases Not Handled |
|---|---|---|---|---|---|
| Auth + Barber bootstrap | Partially implemented | No webhook-driven sync; slug creation race handling | No onboarding/profile completion flow | Barber records rely on lazy creation only | Concurrent first logins can collide on slug |
| Public booking page (`/{slug}`) | Partially implemented | Booking write path does not re-check against availability rules/time-off windows | None for basic booking | Uses slot endpoint + separate book endpoint, but not fully consistent with other booking API | Timezone/day boundary and DST handling |
| Slot generation | Partially implemented | Timezone-aware slot computation missing | No timezone controls surfaced in booking UI | UTC math conflicts with local expectations | DST shifts, non-UTC barbers, cross-timezone clients |
| Appointment creation (`/api/public/[slug]/book`) | Partially implemented | No “past time” guard; no strict availability/time-off validation before create | No manual appointment controls in dashboard | Duplicate booking API variants create drift risk | Same-contact client merge collisions |
| Generic appointment API (`/api/appointments`) | Partially implemented | Duplicated logic not consolidated | Not used by current public UI | E2E mocks this old path while UI uses `/book` | Payload/response contract drift |
| Service CRUD | Fully implemented | — | — | End-to-end UI/API works | Minor: no bulk operations |
| Availability rules CRUD | Fully implemented | — | — | End-to-end UI/API works | No overnight spans (start < end only) |
| Time-off blocks | Stubbed / placeholder | No CRUD endpoints | No dashboard UI | Engine supports it, product cannot manage it | Real scheduling exceptions cannot be entered |
| Calendar page | Partially implemented | No update/cancel/reschedule actions | Read-only list only | Appointment status lifecycle not managed from UI | Operational workflow gaps for day-of changes |
| Clients + notes | Partially implemented | Notes stored as one text blob, no structured note model | No edit/delete note UI | Concurrent appends can be messy | Shared phone/email can overwrite wrong client record |
| Payments page | Stubbed / placeholder | No payment creation/update pipeline | Read-only display with no capture/refund flows | Usually empty because payment rows are never written | Reconciliation/reporting not possible |
| Stripe webhook | Stubbed / placeholder | Event handling has no persistence side effects | No UI status sync | Stripe events do not update local payment state | Retries/idempotency irrelevant because nothing persists |
| Analytics | Partially implemented | Revenue depends on payment statuses that are never populated | No drill-down/filters | Revenue likely remains zero in real use | Limited business insight |
| Reminder system (Trigger + Reminder table) | Stubbed / placeholder | No scheduling/dispatch orchestration from DB reminders | No reminder management UI | Reminders are created but not sent via job pipeline | Missed reminders in production |
| Clerk webhook | Stubbed / placeholder | Events verified but ignored | No admin/user sync UI | Identity changes not reflected in app DB | Deleted/updated Clerk users not reconciled |
| E2E booking test coverage | Broken | Test targets stale endpoint | — | Test does not validate real booking path | Real regressions can ship undetected |

---

**Critical Issues (Would Fail in Production)**

1. Booking can be created outside configured availability/time-off windows (server-side validation gap).
2. Timezone logic is UTC-centric; slot/date interpretation will be wrong for many real barbers/clients.
3. Payments are non-functional end-to-end: webhook does not persist, no payment write path, analytics revenue stays incorrect.
4. Reminder workflow is incomplete: reminders are recorded but not orchestrated for actual delivery.
5. E2E booking test is stale and failing against current API wiring, so key flow regressions are not reliably caught.
6. Slug generation has a race condition on concurrent first-time user creation.

---

**Incomplete Features**

- Missing backend logic:
  - Enforce availability + time-off + non-past checks at appointment create time.
  - Persist and update `Payment` records from Stripe events.
  - Dispatch reminder jobs from `Reminder` records.
  - Reconcile Clerk user lifecycle events into app data.
- Missing UI connections:
  - Time-off management UI/API.
  - Payment lifecycle UI (capture/refund/status).
  - Reminder visibility/controls.
  - Calendar action workflows (reschedule/cancel/complete).
- Broken data flow:
  - Duplicate booking endpoints causing contract drift.
  - Analytics revenue depends on payment data that is never produced.
  - Automated booking E2E test does not exercise the live booking endpoint.
- Edge cases not handled:
  - DST and timezone boundaries.
  - Shared/changed contact info causing incorrect client merges.
  - Concurrent signup slug collisions.

---

**Intended Product**
A barber-focused business management app with:
- Public, no-login booking pages per barber slug.
- A barber dashboard for services, availability, calendar, client management, payments, reminders, and analytics.
- Integrated auth (Clerk), messaging (SMS/email), and payments (Stripe).
- Reliable scheduling logic (availability + time off + conflict prevention) as the core of the product.

**Current State**
- Implemented well:
  - Service CRUD (create/edit/activate/delete).
  - Availability rule CRUD.
  - Public booking flow (select service/date/slot, submit booking).
  - Conflict prevention at booking time.
  - Basic client pages and note appending.
  - Read-only calendar and basic metrics views.
- Partially implemented:
  - Scheduling correctness (timezone/date semantics are still weak).
  - Appointment lifecycle (no real cancel/reschedule/complete workflows).
  - Analytics (depends on payments that are not actually populated).
- Stubbed/placeholders:
  - Stripe webhook business logic.
  - Payment creation/update pipeline.
  - Reminder orchestration (records exist, job exists, wiring missing).
  - Clerk webhook sync.
  - Time-off management UI/API.
- Broken:
  - E2E booking test is out of sync with the active booking endpoint.

**Gap Analysis**
Missing core features for a usable MVP:
1. Correct scheduling in real-world timezones and DST.
2. Server-side booking guards for availability/time-off/past-time (not just overlap).
3. Appointment operations for barbers: cancel, reschedule, mark complete/no-show.
4. Time-off management (vacations/blocked windows).
5. Production-ready customer communications:
   - Confirmation and reminder flow with delivery state.
6. Clear payment strategy:
   - Either fully working Stripe/payment records, or remove payments from MVP scope.
7. Basic business settings editing (profile/timezone/booking settings).
8. Reliable end-to-end test coverage on the real booking API path.

**Recommended Simplifications**
- Keep only one booking write endpoint (`/api/public/[slug]/book` or `/api/appointments`), not both.
- Keep only one service management UI (`service-form` flow); remove/archive legacy `service-manager`.
- Choose one reminder model for MVP:
  - Immediate send only, or queued reminders only. Avoid hybrid half-wired approach.
- Choose one user provisioning model:
  - Lazy `getOrCreateCurrentBarber` or webhook sync, not both partially.
- If payments are not MVP-critical, remove/hide payments + revenue surfaces until implemented.
- Collapse duplicate “dashboard metrics” and “analytics” pages into one basic reporting view.
- Defer unused schema complexity until needed (extra payment/reminder modes that have no workflow yet).

---

**Priority Task List (ordered)**

1. **Unify booking path and fix failing E2E**
`What to build:` Keep one canonical booking endpoint (recommend `/api/public/[slug]/book`) and remove/redirect duplicate logic in `/api/appointments`; update Playwright mocks to the real endpoint.  
`Why it matters:` Right now core-flow tests are broken and not testing production behavior.  
`Files to modify:` [tests/e2e/booking-flow.spec.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/tests/e2e/booking-flow.spec.ts), [app/api/appointments/route.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/appointments/route.ts), [app/api/public/[slug]/book/route.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/public/[slug]/book/route.ts).  
`Success criteria:` `npm run test:e2e` passes; only one booking code path remains.

2. **Enforce booking guardrails at write time**
`What to build:` In appointment creation, reject past times and reject bookings outside active availability/time-off windows (not just overlap checks).  
`Why it matters:` Prevents invalid appointments that create operational failure for real barbers.  
`Files to modify:` [lib/scheduling/appointments.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts), [lib/scheduling/engine.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/engine.ts), [app/api/public/[slug]/book/route.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/public/[slug]/book/route.ts).  
`Success criteria:` Outside-hours, time-off, and past-time bookings are rejected with clear errors; unit tests added and passing.

3. **Make slots timezone-correct end-to-end**
`What to build:` Generate slots from barber-local day/timezone and render slot times consistently; handle DST transitions correctly.  
`Why it matters:` This is the highest risk for missed appointments in production.  
`Files to modify:` [app/api/public/[slug]/slots/route.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/public/[slug]/slots/route.ts), [lib/utils/time.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/utils/time.ts), [components/booking/public-booking-form.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/booking/public-booking-form.tsx).  
`Success criteria:` A 9:00 AM rule in barber timezone always yields 9:00 AM bookable slots for that barber’s day, including DST dates.

4. **Add time-off block management**
`What to build:` Minimal CRUD for `TimeOffBlock` in dashboard settings.  
`Why it matters:` Barbers need vacations/lunch breaks/closures; schema already supports it but product does not.  
`Files to modify:` [app/(dashboard)/settings/availability/page.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/settings/availability/page.tsx), [components/forms/availability-manager.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/forms/availability-manager.tsx), plus new routes under `app/api/time-off/*`.  
`Success criteria:` Creating a time-off block immediately removes affected slots and blocks booking attempts.

5. **Ship appointment lifecycle actions in calendar**
`What to build:` Allow barber actions: cancel, complete, no-show (reschedule can be next iteration).  
`Why it matters:` Without status controls, daily operations are incomplete.  
`Files to modify:` [app/(dashboard)/calendar/page.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/calendar/page.tsx), [lib/scheduling/appointments.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts), plus new `app/api/appointments/[id]/route.ts`.  
`Success criteria:` Status changes from dashboard persist and reflect in calendar/clients/metrics immediately.

6. **Add editable barber settings (timezone, business name, location)**
`What to build:` A simple settings form + API to update barber profile fields used by booking and display.  
`Why it matters:` Timezone correctness and public profile quality depend on editable settings.  
`Files to modify:` [app/(dashboard)/settings/page.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/settings/page.tsx), [app/api/public/[slug]/route.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/api/public/[slug]/route.ts), plus new `app/api/barber/route.ts`.  
`Success criteria:` Settings changes persist and are visible on public booking page and slot logic.

7. **Make reminders actually deliver**
`What to build:` Wire reminder execution so `Reminder` rows transition from `PENDING` to `SENT`/`FAILED` (use existing Trigger job with minimal orchestration).  
`Why it matters:` Reminder promises without delivery hurt trust quickly.  
`Files to modify:` [lib/scheduling/appointments.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/lib/scheduling/appointments.ts), [trigger/jobs/send-appointment-reminder.ts](/Users/gary/Desktop/Mane%20Manager/mane-manager/trigger/jobs/send-appointment-reminder.ts), plus dispatcher entrypoint.  
`Success criteria:` Due reminders are sent once, statuses update correctly, retries do not duplicate sends.

8. **De-scope non-working payments/advanced analytics until real**
`What to build:` Hide or clearly gate payments/revenue features until payment persistence exists.  
`Why it matters:` Removes broken UX and keeps MVP focused on scheduling value.  
`Files to modify:` [components/dashboard/sidebar.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/components/dashboard/sidebar.tsx), [app/(dashboard)/payments/page.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/payments/page.tsx), [app/(dashboard)/analytics/page.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/analytics/page.tsx), [app/(dashboard)/dashboard/page.tsx](/Users/gary/Desktop/Mane%20Manager/mane-manager/app/(dashboard)/dashboard/page.tsx).  
`Success criteria:` No “empty” or misleading payment/revenue screens in MVP release.

---

**MVP Definition**

A usable MVP is:
1. Barber can sign in, set services, working hours, time-off, and timezone.
2. Barber can share public booking URL and receive valid bookings only.
3. Client can book with clear confirmations.
4. Barber can run daily ops from calendar (cancel/complete/no-show) and view clients.
5. System is reliable for time correctness and conflict prevention.
6. Product does not expose unfinished features (payments/advanced analytics) as if complete.

---

**Suggested Development Order**

1. Task 1 (canonical booking + E2E)  
2. Task 2 (booking guardrails)  
3. Task 3 (timezone correctness)  
4. Task 4 (time-off CRUD)  
5. Task 5 (appointment lifecycle actions)  
6. Task 6 (editable barber settings)  
7. Task 7 (reminder delivery)  
8. Task 8 (de-scope/gate non-MVP surfaces)

This order gives fastest path to real user value: accurate booking first, daily operations second, polish/scope discipline third.

---

## MVP Execution Tracker

### Current Task
- [ ] Task 1: Canonical booking path + E2E fix
- [ ] Task 2: Booking guardrails
- [ ] Task 3: Timezone correctness
- [ ] Task 4: Time-off CRUD
- [ ] Task 5: Appointment lifecycle actions
- [ ] Task 6: Editable barber settings
- [ ] Task 7: Reminder delivery
- [ ] Task 8: Hide/de-scope payments

### Rules
- Only work on one task at a time
- Each task must have acceptance criteria
- Each task must end with tests and a short handoff summary
- No unrelated refactors during task execution