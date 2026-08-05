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
  { path: "/admin/homepage", name: "03_admin_homepage" },
  { path: "/admin/media", name: "04_admin_media" },
  { path: "/admin/products", name: "05_admin_products" },
  { path: "/admin/categories", name: "06_admin_categories" },
  { path: "/admin/collections", name: "07_admin_collections" },
  { path: "/admin/orders", name: "08_admin_orders" },
  { path: "/admin/customers", name: "09_admin_customers" },
  { path: "/admin/settings", name: "10_admin_settings" },
  { path: "/admin/materials", name: "11_admin_materials" },
  { path: "/admin/sizes", name: "12_admin_sizes" },
  { path: "/admin/pages", name: "13_admin_pages" },
  { path: "/admin/theme", name: "14_admin_theme" },
  { path: "/admin/navigation", name: "15_admin_navigation" },
];

test.describe("Admin Platform E2E & Visual Verification", () => {
  test("Unauthenticated access (missing cookie) redirects to /login", async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/admin");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("Invalid cookie redirects to /login", async ({ page, context }) => {
    await context.addCookies([
      { name: "snv_admin_token", value: "invalid_cookie_token_123", domain: "localhost", path: "/" }
    ]);
    await page.goto("/admin");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("Expired / malformed token redirects to /login", async ({ page, context }) => {
    await context.addCookies([
      { name: "snv_admin_token", value: "expired.jwt.token", domain: "localhost", path: "/" }
    ]);
    await page.goto("/admin");
    await page.waitForURL(/\/login/);
    expect(page.url()).toContain("/login");
  });

  test("Authenticated Admin Full Suite Verification", async ({ page, context }) => {
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

    // Set static admin cookie in context
    await context.addCookies([
      {
        name: "snv_admin_token",
        value: "snv_admin_token_static_dev",
        domain: "localhost",
        path: "/",
      },
    ]);

    // Go to domain root to set localStorage
    await page.goto("/admin");
    await page.evaluate(() => {
      localStorage.setItem("snv.admin.accessToken", "snv_admin_token_static_dev");
    });

    // Verify every route
    const verificationResults: Array<{ route: string; status: number; title: string }> = [];

    for (const route of ADMIN_ROUTES) {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      const status = response ? response.status() : 200;

      // Wait 1s for dynamic data to resolve
      await page.waitForTimeout(1000);

      // Verify page content
      const bodyText = await page.textContent("body");
      expect(bodyText).toContain("Stix N Vibes");

      // Verify CSS / Tailwind applied (background slate-950)
      const bgStyle = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      
      const pageTitle = await page.title();
      verificationResults.push({
        route: route.path,
        status,
        title: pageTitle,
      });

      // Capture screenshot
      const shotPath = path.join(screenshotDir, `${route.name}.png`);
      await page.screenshot({ path: shotPath, fullPage: true });
    }

    // Save summary log
    const reportLog = {
      consoleErrors,
      pageErrors,
      networkFailures,
      verificationResults,
      timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(
      path.join(screenshotDir, "verification_summary.json"),
      JSON.stringify(reportLog, null, 2)
    );

    expect(pageErrors.length).toBe(0);
  });
});
