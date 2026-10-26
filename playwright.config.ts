import { defineConfig, devices } from "@playwright/test";

const YOUPI_SECRET = "e2e-only-webhook-secret-not-real";

// Runs against a production build in demo mode (in-memory data, demo admin).
export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://localhost:3100", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      // Stands in for YouPI PG on the home lab.
      command: "node tests/e2e/mock-youpi.mjs",
      url: "http://localhost:3199",
      reuseExistingServer: true,
      env: { YOUPI_WEBHOOK_SECRET: YOUPI_SECRET },
    },
    {
      command: "npm run build && npx next start -p 3100",
      url: "http://localhost:3100",
      timeout: 240_000,
      reuseExistingServer: true,
      env: { SHOP_DEMO_MODE: "true", YOUPI_URL: "http://localhost:3199", YOUPI_MERCHANT_ID: "e2e-merchant", YOUPI_WEBHOOK_SECRET: YOUPI_SECRET },
    },
  ],
});
