import { expect, test } from "@playwright/test";

test("public booking flow completes with mocked APIs", async ({ page }) => {
  await page.route("**/api/public/jayfades/services", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "cm1234567890123456789012",
          name: "Haircut",
          description: "Classic cut",
          durationMinutes: 30,
          priceCents: 3500,
        },
      ]),
    });
  });

  await page.route("**/api/public/jayfades/slots**", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          startTime: "2026-03-10T15:00:00.000Z",
          endTime: "2026-03-10T15:30:00.000Z",
        },
      ]),
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

  await page.getByLabel("2. Date").fill("2026-03-10");
  await page.getByRole("button", { name: "3. Find available times" }).click();

  await page.getByLabel("4. Available times").selectOption("2026-03-10T15:00:00.000Z");
  await page.getByLabel("5. Name").fill("Alex Client");
  await page.getByLabel("Email").fill("alex@example.com");
  await page.getByLabel("Phone").fill("+15555550100");

  await page.getByRole("button", { name: "6. Confirm booking" }).click();

  await expect(page.getByText("Booking confirmed. Confirmation sent.")).toBeVisible();
});
