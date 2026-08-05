import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for Stix N Vibes.
 * Spawns `npm run start` against the production build.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3009",
    trace: "on-first-retry",
    headless: true,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npx next dev -p 3009",
    url: "http://localhost:3009",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
