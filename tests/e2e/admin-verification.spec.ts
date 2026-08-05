import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const screenshotDir = path.join(process.cwd(), "artifacts_screenshots");
if (!fs.existsSync(screenshotDir)) {
  fs.mkdirSync(screenshotDir, { recursive: true });
}

const ADMIN_ROUTES = [
  { path: "/admin", name: "01_admin_ops" },
  { path: "/admin/dashboard", name: "02_admin_dashboard" },
  { path: "/admin/products", name: "03_admin_products" },
  { path: "/admin/categories", name: "04_admin_categories" },
  { path: "/admin/collections", name: "05_admin_collections" },
  { path: "/admin/orders", name: "06_admin_orders" },
  { path: "/admin/customers", name: "07_admin_customers" },
  { path: "/admin/settings", name: "08_admin_settings" },
  { path: "/admin/materials", name: "09_admin_materials" },
  { path: "/admin/sizes", name: "10_admin_sizes" },
  { path: "/admin/pages", name: "11_admin_pages" },
];

test.describe("Admin Platform E2E & Visual Verification", () => {
  test("Unauthenticated access redirects to /login", async ({ page }) => {
    // Clear cookies & storage
    await page.context().clearCookies();
    await page.goto("/admin");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("Authenticated Admin Full Suite Verification", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const networkFailures: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(`[Console Error] ${msg.text()}`);
      }
    });

    page.on("pageerror", (err) => {
      pageErrors.push(`[Page Error] ${err.message}`);
    });

    page.on("response", (response) => {
      if (response.status() >= 400 && !response.url().includes("/favicon")) {
        networkFailures.push(`[HTTP ${response.status()}] ${response.url()}`);
      }
    });

    // Login via UI or localStorage + cookie
    await page.goto("/login");
    await page.fill('input[type="email"]', "admin@stixnvibes.com");
    await page.fill('input[type="password"]', "admin123");
    await page.click('button[type="submit"]');

    // Wait for redirect to /admin
    await page.waitForURL(/\/admin/);

    // Also set token explicitly in localStorage and cookie to ensure all API calls pass
    await page.evaluate(() => {
      localStorage.setItem("snv.admin.accessToken", "snv_admin_token_static_dev");
      document.cookie = "snv_admin_token=snv_admin_token_static_dev; path=/";
    });

    // Verify each route
    for (const route of ADMIN_ROUTES) {
      await page.goto(route.path, { waitUntil: "networkidle" });

      // Verify header / brand presence
      const brandText = await page.textContent("body");
      expect(brandText).toContain("Stix N Vibes");

      // Take screenshot
      const shotPath = path.join(screenshotDir, `${route.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
    }

    // Write log report
    const reportLog = {
      consoleErrors,
      pageErrors,
      networkFailures,
      routesTested: ADMIN_ROUTES.length,
    };
    fs.writeFileSync(
      path.join(screenshotDir, "verification_summary.json"),
      JSON.stringify(reportLog, null, 2)
    );

    expect(pageErrors.length).toBe(0);
  });
});
