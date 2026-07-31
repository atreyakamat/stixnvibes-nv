# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-path.spec.ts >> Happy path >> filters by sticker type tab and updates the URL
- Location: tests\e2e\happy-path.spec.ts:23:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByRole('button', { name: /^Stickers$/i })

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - link "Skip to content" [ref=e2] [cursor=pointer]:
    - /url: "#main"
  - generic [ref=e3]:
    - banner [ref=e4]:
      - navigation [ref=e6]:
        - link "StixNVibes" [ref=e7] [cursor=pointer]:
          - /url: /
          - img [ref=e9]
          - generic [ref=e11]: StixNVibes
        - list [ref=e12]:
          - listitem [ref=e13]:
            - link "Shop" [ref=e15] [cursor=pointer]:
              - /url: /shop
              - text: Shop
              - img [ref=e16]
          - listitem [ref=e18]:
            - link "New Arrivals" [ref=e19] [cursor=pointer]:
              - /url: /shop?filter=new
          - listitem [ref=e20]:
            - link "Best Sellers" [ref=e21] [cursor=pointer]:
              - /url: /shop?filter=popular
          - listitem [ref=e22]:
            - link "Custom Orders" [ref=e23] [cursor=pointer]:
              - /url: /customize
          - listitem [ref=e24]:
            - link "Offers" [ref=e25] [cursor=pointer]:
              - /url: /shop?filter=offers
          - listitem [ref=e26]:
            - link "About" [ref=e27] [cursor=pointer]:
              - /url: /about
          - listitem [ref=e28]:
            - link "FAQ" [ref=e29] [cursor=pointer]:
              - /url: /faq
          - listitem [ref=e30]:
            - link "Contact" [ref=e31] [cursor=pointer]:
              - /url: /contact
        - generic [ref=e32]:
          - button "Search" [ref=e33]:
            - img [ref=e34]
          - button "Wishlist" [ref=e37]:
            - img [ref=e38]
          - button "Account" [ref=e40]:
            - img [ref=e41]
          - button "Open cart" [ref=e44]:
            - img [ref=e45]
          - button "Toggle theme" [ref=e48]
          - link "Customize" [ref=e49] [cursor=pointer]:
            - /url: /customize
          - button "Open menu" [ref=e50]:
            - img [ref=e51]
    - main
    - contentinfo [ref=e52]:
      - generic [ref=e53]:
        - generic [ref=e54]:
          - generic [ref=e55]:
            - link "StixNVibes" [ref=e56] [cursor=pointer]:
              - /url: /
              - img [ref=e58]
              - text: StixNVibes
            - paragraph [ref=e60]: Premium stickers, posters, Spotify cards, frames and mystery packs. Customize, vibe, and stick it loud — Stix N Vibes.
            - generic [ref=e61]:
              - img [ref=e62]
              - text: Made sustainably
            - generic [ref=e65]:
              - link "Instagram" [ref=e66] [cursor=pointer]:
                - /url: https://instagram.com/stixnvibes
                - img [ref=e67]
              - link "Twitter" [ref=e70] [cursor=pointer]:
                - /url: https://twitter.com/stixnvibes
                - img [ref=e71]
              - link "YouTube" [ref=e73] [cursor=pointer]:
                - /url: https://youtube.com/@stixnvibes
                - img [ref=e74]
              - link "WhatsApp" [ref=e77] [cursor=pointer]:
                - /url: https://wa.me/919999999999
                - img [ref=e78]
          - generic [ref=e80]:
            - heading "Shop" [level=4] [ref=e81]
            - list [ref=e82]:
              - listitem [ref=e83]:
                - link "Stickers" [ref=e84] [cursor=pointer]:
                  - /url: /shop/stickers
              - listitem [ref=e85]:
                - link "Posters" [ref=e86] [cursor=pointer]:
                  - /url: /shop/posters
              - listitem [ref=e87]:
                - link "Spotify Cards" [ref=e88] [cursor=pointer]:
                  - /url: /shop/spotify-cards
              - listitem [ref=e89]:
                - link "Frames" [ref=e90] [cursor=pointer]:
                  - /url: /shop/frames
              - listitem [ref=e91]:
                - link "Mystery Packs" [ref=e92] [cursor=pointer]:
                  - /url: /shop/mystery
          - generic [ref=e93]:
            - heading "Company" [level=4] [ref=e94]
            - list [ref=e95]:
              - listitem [ref=e96]:
                - link "About" [ref=e97] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e98]:
                - link "Contact" [ref=e99] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e100]:
                - link "FAQ" [ref=e101] [cursor=pointer]:
                  - /url: /faq
              - listitem [ref=e102]:
                - link "Custom Orders" [ref=e103] [cursor=pointer]:
                  - /url: /customize
          - generic [ref=e104]:
            - heading "Support" [level=4] [ref=e105]
            - list [ref=e106]:
              - listitem [ref=e107]:
                - link "Shipping" [ref=e108] [cursor=pointer]:
                  - /url: /policies/shipping
              - listitem [ref=e109]:
                - link "Refunds" [ref=e110] [cursor=pointer]:
                  - /url: /policies/refund
              - listitem [ref=e111]:
                - link "Privacy" [ref=e112] [cursor=pointer]:
                  - /url: /policies/privacy
              - listitem [ref=e113]:
                - link "Terms" [ref=e114] [cursor=pointer]:
                  - /url: /policies/terms
          - generic [ref=e115]:
            - heading "Reach Out" [level=4] [ref=e116]
            - list [ref=e117]:
              - listitem [ref=e118]:
                - img [ref=e119]
                - text: hello@stixnvibes.com
              - listitem [ref=e122]:
                - img [ref=e123]
                - text: Bengaluru, India
        - generic [ref=e126]:
          - paragraph [ref=e127]: © 2026 Stix N Vibes. Made with stickers & sunshine in India.
          - paragraph [ref=e128]: Designed & built for vibes.Stick loud.
    - button "Open live chat" [ref=e130]:
      - img [ref=e131]
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
  20 |     await expect(page.getByRole("heading", { name: /Shop everything StixNvibes/i })).toBeVisible();
  21 |   });
  22 | 
  23 |   test("filters by sticker type tab and updates the URL", async ({ page }) => {
  24 |     await page.goto("/shop", { waitUntil: "domcontentloaded" });
> 25 |     await page.getByRole("button", { name: /^Stickers$/i }).click();
     |                                                             ^ Error: locator.click: Test timeout of 30000ms exceeded.
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