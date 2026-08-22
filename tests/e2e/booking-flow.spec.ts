import { expect, test } from "@playwright/test";

import {
  cleanupBookingFixture,
  createBookingFixture,
  getBookedAppointment,
  type BookingFixture,
} from "./support/booking-fixture";

test.use({ timezoneId: "America/Los_Angeles" });

let fixture: BookingFixture | undefined;

test.beforeAll(async () => {
  fixture = await createBookingFixture();
});

test.afterAll(async () => {
  if (fixture) {
    await cleanupBookingFixture(fixture);
  }
});

test("public booking flow creates a real appointment", async ({ page }) => {
  const bookingFixture = fixture;
  if (!bookingFixture) {
    throw new Error("The database booking fixture was not created.");
  }

  await page.goto(`/${bookingFixture.slug}`);
  await expect(page.getByText("Playwright Fades")).toBeVisible();

  await page.getByLabel("2. Date").fill(bookingFixture.bookingDate);

  await expect(page.getByText("Times shown in UTC.")).toBeVisible();
  await expect(page.locator(`option[value="${bookingFixture.slotStartTime}"]`)).toHaveText("3:00 PM");

  await page.getByLabel("3. Available time slots").selectOption(bookingFixture.slotStartTime);
  await page.getByLabel("Name").fill(bookingFixture.clientName);
  await page.getByLabel("Email").fill(bookingFixture.clientEmail);
  await page.getByLabel("Phone").fill(bookingFixture.clientPhone);

  const bookingResponsePromise = page.waitForResponse(
    (response) =>
      response.url().endsWith(`/api/public/${bookingFixture.slug}/book`) &&
      response.request().method() === "POST",
  );

  await page.getByRole("button", { name: "5. Confirm booking" }).click();

  const bookingResponse = await bookingResponsePromise;
  expect(bookingResponse.status()).toBe(201);
  await expect(page.getByText("Booking confirmed.")).toBeVisible();
  await expect(page.locator(`option[value="${bookingFixture.slotStartTime}"]`)).toHaveCount(0);

  const appointment = await getBookedAppointment(bookingFixture);
  expect(appointment).not.toBeNull();
  expect(appointment).toMatchObject({
    barberId: bookingFixture.barberId,
    serviceId: bookingFixture.serviceId,
    status: "BOOKED",
    bookingSource: "PUBLIC_PAGE",
    startTime: new Date(bookingFixture.slotStartTime),
    endTime: new Date(bookingFixture.slotEndTime),
    client: {
      name: bookingFixture.clientName,
      email: bookingFixture.clientEmail,
      phone: bookingFixture.clientPhone,
    },
  });
  expect(appointment?.reminders).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ channel: "EMAIL", type: "APPOINTMENT_REMINDER", status: "PENDING" }),
      expect.objectContaining({ channel: "SMS", type: "APPOINTMENT_REMINDER", status: "PENDING" }),
    ]),
  );
  expect(appointment?.reminders).toHaveLength(2);
});
