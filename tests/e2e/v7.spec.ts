import { expect, test, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("demo@stixnvibes.com");
  await page.getByLabel("Password").fill("demo-admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("stall mode rings up a sale with no signal and syncs it later", async ({ page, context }) => {
  await adminLogin(page);
  await expect(page.getByTestId("goal-profit")).toBeVisible();
  await page.goto("/admin/stall");
  await expect(page.getByTestId("sync-status")).toHaveText("Synced");

  await context.setOffline(true);
  await expect(page.getByTestId("sync-status")).toHaveText(/Offline/);
  await page.getByRole("button", { name: "Add Lo-fi 04" }).click();
  const picker = page.getByRole("dialog", { name: "Options for Lo-fi 04" });
  if (await picker.waitFor({ timeout: 1500 }).then(() => true, () => false)) await picker.getByRole("button", { name: /^Add/ }).click();
  await expect(page.getByTestId("stall-total")).not.toHaveText("₹0");
  await page.getByRole("button", { name: "Cash", exact: true }).click();
  await page.getByRole("dialog", { name: "Cash payment" }).getByRole("textbox").fill("100");
  await expect(page.getByText(/Change ₹/)).toBeVisible();
  await page.getByRole("button", { name: "Cash received" }).click();
  await expect(page.getByTestId("sync-status")).toHaveText("Offline · 1 to sync");
  await expect(page.getByTestId("stall-total")).toHaveText("₹0");

  // Signal's back: the queue goes up, once.
  await context.setOffline(false);
  await expect(page.getByTestId("sync-status")).toHaveText("Synced", { timeout: 15_000 });
  await expect(page.getByLabel("Recent sales").getByText("✓")).toHaveCount(1);
});

test("blog, library and college pages", async ({ page }) => {
  await page.goto("/blog");
  await page.getByRole("link", { name: /Are our stickers waterproof/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Are our stickers waterproof?" })).toBeVisible();

  await page.goto("/gallery");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.locator("main img").first()).toBeVisible();

  await page.goto("/c/xaviers");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("St. Xavier's College");
  await expect(page.getByTestId("college-code")).toContainText("STALL10");
});

test("bundle builder fills a pack and adds it to the cart", async ({ page }) => {
  await page.goto("/bundle");
  await expect(page.getByTestId("bundle-status")).toContainText("Tap stickers to fill a pack of 5");
  await page.getByRole("button", { name: "Surprise me" }).click();
  await expect(page.getByTestId("bundle-status")).toContainText("1 pack done");
  await page.getByRole("button", { name: "Add 5 to cart" }).click();
  await expect(page.getByTestId("cart-count").first()).toHaveText("5");
});

test("an order gets its India Post number and the customer sees it", async ({ page }) => {
  await page.goto("/shop/lofi-05");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await page.getByLabel("Name", { exact: true }).fill("Meera");
  await page.getByLabel("Phone number").fill("9123456781");
  await page.getByLabel("Address").fill("4 Church Square");
  await page.getByLabel("City").fill("Margao");
  await page.getByLabel("Pincode").fill("403601");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/order\/SNV-/);
  const orderPage = page.url();
  const ref = /SNV-[A-Z0-9]{6}/.exec(orderPage)![0];

  await adminLogin(page);
  await page.goto(`/admin/orders/${ref}`);
  await page.getByLabel(`Tracking number for ${ref}`).fill("ee 123 456 789 in");
  await expect(page.getByLabel(`Tracking number for ${ref}`)).toHaveValue("EE123456789IN");
  await page.getByRole("button", { name: "Save & mark shipped" }).click();
  await expect(page.getByText("Marked shipped.")).toBeVisible();

  await page.goto(orderPage);
  await expect(page.getByTestId("tracking")).toContainText("EE123456789IN");
});

test("catalogue feed, health check and backup", async ({ request }) => {
  const feed = await request.get("/api/feeds/catalog");
  expect(feed.ok()).toBe(true);
  expect(feed.headers()["content-type"]).toContain("text/csv");
  const csv = await feed.text();
  expect(csv.split("\n")[0]).toContain("id,title,description,availability,condition,price,link,image_link");
  expect(csv).toContain(" INR");

  const health = await request.get("/api/health");
  expect(await health.json()).toEqual({ ok: true, store: "demo" });

  expect((await request.get("/api/integrations/backup")).status()).toBe(401);
  const backup = await request.get("/api/integrations/backup", { headers: { Authorization: "Bearer e2e-only-backup-token-not-real-0123456789" } });
  const body = await backup.json();
  expect(body.version).toBe(1);
  expect(body.data.products.length).toBeGreaterThan(0);
});
