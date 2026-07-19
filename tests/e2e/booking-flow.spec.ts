import { expect, test } from "@playwright/test";

test.use({ timezoneId: "America/Los_Angeles" });

test("public booking flow completes with mocked APIs", async ({ page }) => {
  await page.route("**/api/public/jayfades", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        barber: {
          slug: "jayfades",
          name: "Jay",
          businessName: "Jay Fades",
          location: "Brooklyn",
          timezone: "America/New_York",
        },
        services: [
          {
            id: "cm1234567890123456789012",
            name: "Haircut",
            description: "Classic cut",
            durationMinutes: 30,
            priceCents: 3500,
          },
        ],
      }),
    });
  });

  let slotRequestCount = 0;
  await page.route("**/api/public/jayfades/slots**", async (route) => {
    slotRequestCount += 1;

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        slotRequestCount === 1
          ? [
              {
                startTime: "2099-01-10T15:00:00.000Z",
                endTime: "2099-01-10T15:30:00.000Z",
              },
            ]
          : [],
      ),
    });
  });

  await page.route("**/api/public/jayfades/book", async (route) => {
    await route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({ id: "cm-appointment" }),
    });
  });

  await page.goto("/jayfades");

  await page.getByLabel("2. Date").fill("2099-01-10");

  await expect(page.getByText("Times shown in America/New_York.")).toBeVisible();
  await expect(page.locator('option[value="2099-01-10T15:00:00.000Z"]')).toHaveText("10:00 AM");

  await page.getByLabel("3. Available time slots").selectOption("2099-01-10T15:00:00.000Z");
  await expect(page.getByText("Time: Sat, Jan 10, 10:00 AM (America/New_York)")).toBeVisible();
  await page.getByLabel("Name").fill("Alex Client");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Phone").fill("+15555550100");

  await page.getByRole("button", { name: "5. Confirm booking" }).click();

  await expect(page.getByText("Booking confirmed.")).toBeVisible();
  await expect(page.getByText("No available times for this date.")).toBeVisible();
  await expect(page.locator('option[value="2099-01-10T15:00:00.000Z"]')).toHaveCount(0);
});
