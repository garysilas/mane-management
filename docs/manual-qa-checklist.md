# Mane Manager Manual QA Checklist

Use this checklist to walk through the app after the Phase 5 booking, retention, service-tiering, policy, and waitlist improvements.

## Setup

- [x] Start the app locally with the expected Node path:

  ```bash
  export PATH=/home/hermes/.nvm/versions/node/v22.23.1/bin:$PATH
  npm run dev
  ```

- [x] Sign in through Clerk.
- [x] Confirm the dashboard loads without a server error.
- [x] Confirm you know your public booking slug from **Settings**; the public URL is `/{slug}`.

## Services: value copy, tiering, and display order

Go to **Services**.

- [x] Create or edit a service.
- [x] Confirm the form includes **What’s included / value notes**.
- [x] Add value-copy text such as: `Includes consultation, fade, razor line-up, and hot towel finish.`
- [x] Set **Category / tier** to something like `Essential`, `Premium`, or `Add-on`.
- [x] Set **Sort order** to a whole number.
- [x] Toggle **Featured on booking page** on for at least one service.
- [x] Save the service.
- [x] Confirm the service list shows:
  - [x] active/inactive badge
  - [x] featured badge when enabled
  - [x] category/tier badge when set
  - [x] value notes/description text
- [x] Create or edit a second service with a different sort order.
- [x] Confirm featured services are intended to appear before non-featured services on the public booking page.

## Settings: booking policy

Go to **Settings**.

- [x] Confirm the **Booking policy** textarea appears.
- [x] Enter a custom policy, for example: `Please arrive on time. Contact me at least 24 hours ahead to cancel or reschedule.`
- [x] Save settings.
- [x] Confirm the saved success message appears.
- [x] Refresh the page.
- [x] Confirm the booking policy persists.

## Public booking page: service cards

Open the public booking page at `/{slug}` in a signed-out or separate browser session if possible.

- [x] Confirm the barber profile loads.
- [x] Confirm active services load.
- [x] Confirm featured services show a **Featured** badge.
- [x] Confirm services with categories show category/tier badges.
- [x] Confirm services with value notes show an **Includes:** section.
- [x] Confirm price and duration are still visible.
- [x] Confirm the order matches featured first, then lower sort order.

## Public booking page: normal booking flow

On the public booking page:

- [x] Select a service.
- [x] Select a date with available slots.
- [x] Confirm slots load and show in the barber timezone.
- [x] Select a slot.
- [x] Enter client name.
- [x] Enter email.
- [x] Enter phone.
- [x] Confirm the final review card shows the selected service and time.
- [x] Confirm the custom booking policy appears before the confirm button.
- [x] Submit the booking.
- [x] Confirm a **Booking confirmed** success message appears.
- [x] Confirm the slot list refreshes after booking.

## Public booking page: waitlist flow

Use a date with no slots available, or temporarily reduce availability/time off so a date has no generated slots.

- [x] Select a service.
- [x] Select a date with no available slots.
- [x] Confirm the message says no available times for the date.
- [x] Confirm a waitlist box appears.
- [x] Enter client name plus email or phone in the client details step.
- [x] Enter a preferred window, such as `Morning`, `Afternoon`, or `After 5pm`.
- [x] Click **Join waitlist**.
- [x] Confirm a waitlist success message appears.
- [x] Try joining without name/contact details.
- [x] Confirm the app blocks submission and asks for required details.

## Business Health analytics

Go to **Analytics**.

- [x] Confirm the page title is **Business Health**.
- [x] Confirm the page explains retention and booking signals.
- [x] Confirm the following metric cards are present:
  - [x] Upcoming appointments
  - [x] Total clients
  - [x] Completed appointments
  - [x] Clients overdue
  - [x] Due back soon
  - [x] Repeat client rate
  - [x] Average days between visits
- [x] Confirm there is no revenue/payment metric shown in analytics.
- [x] Use overdue/due-back-soon counts as manual outreach prompts; bulk campaign sending is not part of the MVP.

## Calendar and clients sanity check

Go to **Calendar**.

- [x] Confirm upcoming appointments load.
- [x] Confirm past/history appointments load if present.
- [x] Confirm valid appointment status actions still work.

Go to **Clients**.

- [x] Confirm client list loads.
- [x] Open a client profile.
- [x] Confirm appointment history and notes still display.
- [x] Add a note if needed and confirm it persists.

## Availability and time off sanity check

Go to **Settings > Availability**.

- [x] Confirm weekly availability rules load.
- [x] Create or update an availability window.
- [x] Confirm overlapping active availability rules are blocked.
- [x] Add a time-off block.
- [x] Confirm public booking slots no longer show during that time-off block.
- [x] Delete the time-off block if it was only for testing.

## Payments remain gated

Go to `/payments`.

- [x] Confirm payments are explicitly marked as not included in the MVP.
- [x] Confirm there is no active payment capture flow.
- [x] Confirm analytics/dashboard do not show revenue as if Stripe is live.

## Regression checks

- [ ] Public booking page still works when a service has no description/category/featured flag.
- [ ] Public booking page still works when the barber has no custom booking policy.
- [ ] Service creation works with default tiering values.
- [ ] Service editing preserves existing category, featured status, and sort order.
- [ ] Waitlist endpoint does not accept requests without email or phone.
- [ ] Waitlist endpoint does not accept services that are not active for the barber.
- [ ] Booking still prevents double-booking and unavailable slots server-side.

## Known limitations to keep in mind

- [ ] Playwright booking coverage is mocked; it checks browser flow, not a real Prisma transaction.
- [ ] Reminder rows are created, but a full scheduled reminder dispatcher is still not wired end-to-end.
- [ ] Waitlist requests are captured in the database, but there is not yet a dashboard management page for reviewing/closing them.
- [ ] Payments and Stripe persistence remain future work.
