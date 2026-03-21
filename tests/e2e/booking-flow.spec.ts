import { expect, test } from "@playwright/test";

import { cleanupBookingFixture, createBookingFixture, getBookedAppointment } from "./support/booking-fixture";

test("public booking flow completes through the live booking APIs", async ({ page }) => {
  const fixture = await createBookingFixture();

  try {
    await page.goto(`/${fixture.slug}`);

    await page.getByLabel("2. Date").fill(fixture.bookingDate);
    await page.getByLabel("3. Available time slots").selectOption(fixture.slotStartTime);
    await page.getByLabel("Name").fill(fixture.clientName);
    await page.getByLabel("Email").fill(fixture.clientEmail);
    await page.getByLabel("Phone").fill(fixture.clientPhone);

    const bookingRequest = page.waitForResponse(
      (response) =>
        response.url().endsWith(`/api/public/${fixture.slug}/book`) &&
        response.request().method() === "POST" &&
        response.status() === 201,
    );

    await page.getByRole("button", { name: "5. Confirm booking" }).click();

    await bookingRequest;

    await expect(page.getByText("Booking confirmed.")).toBeVisible();

    await expect(
      page.locator(`select[aria-label="3. Available time slots"] option[value="${fixture.slotStartTime}"]`),
    ).toHaveCount(0);

    const appointment = await getBookedAppointment(fixture);

    expect(appointment).not.toBeNull();
    expect(appointment?.startTime.toISOString()).toBe(fixture.slotStartTime);
    expect(appointment?.endTime.toISOString()).toBe(fixture.slotEndTime);
    expect(appointment?.client.name).toBe(fixture.clientName);
    expect(appointment?.client.email).toBe(fixture.clientEmail);
    expect(appointment?.client.phone).toBe(fixture.clientPhone);
    expect(appointment?.reminders).toHaveLength(2);
  } finally {
    await cleanupBookingFixture(fixture);
  }
});
