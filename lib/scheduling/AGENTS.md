# Scheduling

## Overview

This area owns availability windows, slot generation, booking validation, client matching, appointment creation, and status changes. It is the main source of truth for scheduling behavior.

## Key files

| File | Owns |
|---|---|
| `lib/scheduling/engine.ts` | Pure window merging, time off subtraction, overlap checks, and slot generation |
| `lib/scheduling/appointments.ts` | Booking transactions, client matching, reminders, and appointment status changes |
| `lib/scheduling/availability-rules.ts` | Weekly availability overlap checks |
| `lib/utils/time.ts` | Timezone conversion and local calendar helpers used by this area |

## Conventions

* Keep pure scheduling math in `engine.ts` and database orchestration in `appointments.ts`.
* Use half open overlap logic, `startA < endB && endA > startB`, so adjacent appointments are valid.
* Interpret weekly availability in the barber timezone. Do not use the device timezone for server decisions.
* Cancelled appointments do not block slot generation.
* Validate the chosen slot again inside the booking transaction. Never trust a slot returned by an earlier read.
* Create the appointment and its reminder rows in the same transaction.

## Gotchas

* Booking uses a serializable Prisma transaction and retries conflict code `P2034`. Preserve this when changing the write path.
* Completed and no show states are valid only for past appointments. Cancellation also cancels pending reminders.
* Client matching uses compatible email and phone candidates. Ambiguous matches create a new client instead of merging records.
* Tests under `tests/unit` are the strongest executable record of boundary and timezone behavior.

_Drafted by /audit from the repo, worth a quick human pass. Edit freely: once a line stops matching this draft, later runs treat it as curated and will flag rather than overwrite it._
