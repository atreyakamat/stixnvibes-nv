import { expect, test } from "@playwright/test";

test("admin publishes a waiting review with a reply", async ({ page }) => {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("demo@stixnvibes.com");
  await page.getByLabel("Password").fill("demo-admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto("/admin/reviews");
  const card = page.getByRole("article").filter({ hasText: "Kunal" });
  await expect(card).toBeVisible();
  await card.getByLabel(/Your public reply/).fill("Bigger sizes are coming next month!");
  await card.getByRole("button", { name: "Publish" }).click();
  // It leaves the waiting list once published.
  await expect(card).toHaveCount(0);

  await page.getByRole("link", { name: /^Live/ }).click();
  const live = page.getByRole("article").filter({ hasText: "Kunal" });
  await expect(live.getByLabel(/Your public reply/)).toHaveValue("Bigger sizes are coming next month!");
  await expect(page.getByRole("link", { name: "Waiting (0)" })).toBeVisible();
});
