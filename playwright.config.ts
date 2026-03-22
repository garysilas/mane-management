import { defineConfig, devices } from "@playwright/test";

const port = 3005;
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command:
      `RESEND_API_KEY="" RESEND_FROM_EMAIL="" TWILIO_ACCOUNT_SID="" ` +
      `TWILIO_AUTH_TOKEN="" TWILIO_FROM_PHONE="" npm run dev -- --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
