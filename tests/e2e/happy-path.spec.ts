import { test, expect } from "@playwright/test";

/**
 * Critical happy-path smoke test:
 * homepage → shop → product detail → add to cart → cart drawer opens → checkout.
 */
test.describe("Happy path", () => {
  test("loads homepage and exposes brand hero", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await expect(page).toHaveTitle(/Stix N Vibes/i, { timeout: 15_000 });
    // Hero tagline is spread across spans; match via the body regex.
    await expect(page.locator("body")).toContainText(/Stick loud/i, { timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Shop Now/i })).toBeVisible();
  });

  test("navigates from homepage to /shop", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });
    await page.getByRole("link", { name: /Shop Now/i }).first().click();
    await expect(page).toHaveURL(/\/shop/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Shop everything StixNvibes/i })).toBeVisible();
  });

  test("filters by sticker type tab and updates the URL", async ({ page }) => {
    await page.goto("/shop", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /^Stickers$/i }).click();
    await expect.poll(async () => page.url()).toContain("type=sticker_normal");
    await expect(page.getByRole("heading", { name: "Anime Heroes Sticker Pack" })).toBeVisible({ timeout: 10_000 });
  });

  test("opens a product detail page with JSON-LD schema", async ({ page }) => {
    await page.goto("/shop/anime-heroes-sticker-pack", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/Anime Heroes Sticker Pack/i);
    const jsonLdText = await page.locator('script[type="application/ld+json"][id="product-jsonld-anime-heroes-sticker-pack"]').textContent();
    expect(jsonLdText).toBeTruthy();
    const parsed = JSON.parse(jsonLdText!);
    expect(parsed["@type"]).toBe("Product");
    expect(parsed.name).toBe("Anime Heroes Sticker Pack");
  });

  test("adds to cart and opens the cart drawer", async ({ page }) => {
    // Start with an empty localStorage so the drawer shows just the new item.
    await page.addInitScript(() => {
      window.localStorage.clear();
    });
    await page.goto("/shop/anime-heroes-sticker-pack", { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: /Add to Cart/i }).click();
    const dialog = page.getByRole("dialog", { name: /shopping cart/i });
    await expect(dialog).toBeVisible({ timeout: 8_000 });
    // The item appears inside the dialog specifically.
    await expect(dialog.getByText("Anime Heroes Sticker Pack")).toBeVisible();
  });

  test("navigates to checkout with empty cart → shows empty state", async ({ page }) => {
    await page.addInitScript(() => { window.localStorage.clear(); });
    await page.goto("/checkout", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Your cart is empty/i })).toBeVisible();
  });

  test("loads FAQ page with FAQ JSON-LD", async ({ page }) => {
    await page.goto("/faq", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveTitle(/FAQ/i);
    const jsonLdText = await page.locator('script[type="application/ld+json"][id="faq-jsonld"]').textContent();
    expect(jsonLdText).toBeTruthy();
    const parsed = JSON.parse(jsonLdText!);
    expect(parsed["@type"]).toBe("FAQPage");
    expect(parsed.mainEntity.length).toBeGreaterThan(5);
  });

  test("about page renders our brand tagline", async ({ page }) => {
    await page.goto("/about", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Stix N Vibes/i })).toBeVisible();
  });

  test("contact page shows WhatsApp entry", async ({ page }) => {
    await page.goto("/contact", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: /Say hi/i })).toBeVisible();
    await expect(page.getByText(/WhatsApp/i).first()).toBeVisible();
  });

  test("policies hub lists the canonical policies", async ({ page }) => {
    await page.goto("/policies", { waitUntil: "domcontentloaded" });
    for (const name of ["Privacy Policy", "Refund Policy", "Shipping Policy", "Terms & Conditions", "Cookie Policy"]) {
      await expect(page.getByRole("link", { name })).toBeVisible();
    }
  });
});
