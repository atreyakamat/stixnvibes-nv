# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-path.spec.ts >> Happy path >> navigates from homepage to /shop
- Location: tests\e2e\happy-path.spec.ts:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Shop everything StixNvibes/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /Shop everything StixNvibes/i })

```

```yaml
- link "Skip to content":
  - /url: "#main"
- banner:
  - navigation:
    - link "StixNVibes":
      - /url: /
      - img
      - text: StixNVibes
    - list:
      - listitem:
        - link "Shop":
          - /url: /shop
          - text: Shop
          - img
      - listitem:
        - link "New Arrivals":
          - /url: /shop?filter=new
      - listitem:
        - link "Best Sellers":
          - /url: /shop?filter=popular
      - listitem:
        - link "Custom Orders":
          - /url: /customize
      - listitem:
        - link "Offers":
          - /url: /shop?filter=offers
      - listitem:
        - link "About":
          - /url: /about
      - listitem:
        - link "FAQ":
          - /url: /faq
      - listitem:
        - link "Contact":
          - /url: /contact
    - button "Search":
      - img
    - button "Wishlist":
      - img
    - button "Account":
      - img
    - button "Open cart":
      - img
    - button "Toggle theme"
    - link "Customize":
      - /url: /customize
    - button "Open menu":
      - img
- main
- contentinfo:
  - link "StixNVibes":
    - /url: /
    - img
    - text: StixNVibes
  - paragraph: Premium stickers, posters, Spotify cards, frames and mystery packs. Customize, vibe, and stick it loud — Stix N Vibes.
  - text: Made sustainably
  - link "Instagram":
    - /url: https://instagram.com/stixnvibes
    - img
  - link "Twitter":
    - /url: https://twitter.com/stixnvibes
    - img
  - link "YouTube":
    - /url: https://youtube.com/@stixnvibes
    - img
  - link "WhatsApp":
    - /url: https://wa.me/919999999999
    - img
  - heading "Shop" [level=4]
  - list:
    - listitem:
      - link "Stickers":
        - /url: /shop/stickers
    - listitem:
      - link "Posters":
        - /url: /shop/posters
    - listitem:
      - link "Spotify Cards":
        - /url: /shop/spotify-cards
    - listitem:
      - link "Frames":
        - /url: /shop/frames
    - listitem:
      - link "Mystery Packs":
        - /url: /shop/mystery
  - heading "Company" [level=4]
  - list:
    - listitem:
      - link "About":
        - /url: /about
    - listitem:
      - link "Contact":
        - /url: /contact
    - listitem:
      - link "FAQ":
        - /url: /faq
    - listitem:
      - link "Custom Orders":
        - /url: /customize
  - heading "Support" [level=4]
  - list:
    - listitem:
      - link "Shipping":
        - /url: /policies/shipping
    - listitem:
      - link "Refunds":
        - /url: /policies/refund
    - listitem:
      - link "Privacy":
        - /url: /policies/privacy
    - listitem:
      - link "Terms":
        - /url: /policies/terms
  - heading "Reach Out" [level=4]
  - list:
    - listitem:
      - img
      - text: hello@stixnvibes.com
    - listitem:
      - img
      - text: Bengaluru, India
  - paragraph: © 2026 Stix N Vibes. Made with stickers & sunshine in India.
  - paragraph: Designed & built for vibes.Stick loud.
- button "Open live chat":
  - img
  - text: "!"
```

# Test source

```ts
  1  | import { test, expect } from "@playwright/test";
  2  | 
  3  | /**
  4  |  * Critical happy-path smoke test:
  5  |  * homepage → shop → product detail → add to cart → cart drawer opens → checkout.
  6  |  */
  7  | test.describe("Happy path", () => {
  8  |   test("loads homepage and exposes brand hero", async ({ page }) => {
  9  |     await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  10 |     await expect(page).toHaveTitle(/Stix N Vibes/i, { timeout: 15_000 });
  11 |     // Hero tagline is spread across spans; match via the body regex.
  12 |     await expect(page.locator("body")).toContainText(/Stick loud/i, { timeout: 10_000 });
  13 |     await expect(page.getByRole("link", { name: /Shop Now/i })).toBeVisible();
  14 |   });
  15 | 
  16 |   test("navigates from homepage to /shop", async ({ page }) => {
  17 |     await page.goto("/", { waitUntil: "domcontentloaded", timeout: 30_000 });
  18 |     await page.getByRole("link", { name: /Shop Now/i }).first().click();
  19 |     await expect(page).toHaveURL(/\/shop/, { timeout: 10_000 });
> 20 |     await expect(page.getByRole("heading", { name: /Shop everything StixNvibes/i })).toBeVisible();
     |                                                                                      ^ Error: expect(locator).toBeVisible() failed
  21 |   });
  22 | 
  23 |   test("filters by sticker type tab and updates the URL", async ({ page }) => {
  24 |     await page.goto("/shop", { waitUntil: "domcontentloaded" });
  25 |     await page.getByRole("button", { name: /^Stickers$/i }).click();
  26 |     await expect.poll(async () => page.url()).toContain("type=sticker_normal");
  27 |     await expect(page.getByRole("heading", { name: "Anime Heroes Sticker Pack" })).toBeVisible({ timeout: 10_000 });
  28 |   });
  29 | 
  30 |   test("opens a product detail page with JSON-LD schema", async ({ page }) => {
  31 |     await page.goto("/shop/anime-heroes-sticker-pack", { waitUntil: "domcontentloaded" });
  32 |     await expect(page).toHaveTitle(/Anime Heroes Sticker Pack/i);
  33 |     const jsonLdText = await page.locator('script[type="application/ld+json"][id="product-jsonld-anime-heroes-sticker-pack"]').textContent();
  34 |     expect(jsonLdText).toBeTruthy();
  35 |     const parsed = JSON.parse(jsonLdText!);
  36 |     expect(parsed["@type"]).toBe("Product");
  37 |     expect(parsed.name).toBe("Anime Heroes Sticker Pack");
  38 |   });
  39 | 
  40 |   test("adds to cart and opens the cart drawer", async ({ page }) => {
  41 |     // Start with an empty localStorage so the drawer shows just the new item.
  42 |     await page.addInitScript(() => {
  43 |       window.localStorage.clear();
  44 |     });
  45 |     await page.goto("/shop/anime-heroes-sticker-pack", { waitUntil: "domcontentloaded" });
  46 |     await page.getByRole("button", { name: /Add to Cart/i }).click();
  47 |     const dialog = page.getByRole("dialog", { name: /shopping cart/i });
  48 |     await expect(dialog).toBeVisible({ timeout: 8_000 });
  49 |     // The item appears inside the dialog specifically.
  50 |     await expect(dialog.getByText("Anime Heroes Sticker Pack")).toBeVisible();
  51 |   });
  52 | 
  53 |   test("navigates to checkout with empty cart → shows empty state", async ({ page }) => {
  54 |     await page.addInitScript(() => { window.localStorage.clear(); });
  55 |     await page.goto("/checkout", { waitUntil: "domcontentloaded" });
  56 |     await expect(page.getByRole("heading", { name: /Your cart is empty/i })).toBeVisible();
  57 |   });
  58 | 
  59 |   test("loads FAQ page with FAQ JSON-LD", async ({ page }) => {
  60 |     await page.goto("/faq", { waitUntil: "domcontentloaded" });
  61 |     await expect(page).toHaveTitle(/FAQ/i);
  62 |     const jsonLdText = await page.locator('script[type="application/ld+json"][id="faq-jsonld"]').textContent();
  63 |     expect(jsonLdText).toBeTruthy();
  64 |     const parsed = JSON.parse(jsonLdText!);
  65 |     expect(parsed["@type"]).toBe("FAQPage");
  66 |     expect(parsed.mainEntity.length).toBeGreaterThan(5);
  67 |   });
  68 | 
  69 |   test("about page renders our brand tagline", async ({ page }) => {
  70 |     await page.goto("/about", { waitUntil: "domcontentloaded" });
  71 |     await expect(page.getByRole("heading", { name: /Stix N Vibes/i })).toBeVisible();
  72 |   });
  73 | 
  74 |   test("contact page shows WhatsApp entry", async ({ page }) => {
  75 |     await page.goto("/contact", { waitUntil: "domcontentloaded" });
  76 |     await expect(page.getByRole("heading", { name: /Say hi/i })).toBeVisible();
  77 |     await expect(page.getByText(/WhatsApp/i).first()).toBeVisible();
  78 |   });
  79 | 
  80 |   test("policies hub lists the canonical policies", async ({ page }) => {
  81 |     await page.goto("/policies", { waitUntil: "domcontentloaded" });
  82 |     for (const name of ["Privacy Policy", "Refund Policy", "Shipping Policy", "Terms & Conditions", "Cookie Policy"]) {
  83 |       await expect(page.getByRole("link", { name })).toBeVisible();
  84 |     }
  85 |   });
  86 | });
  87 | 
```