# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-path.spec.ts >> Happy path >> adds to cart and opens the cart drawer
- Location: tests/e2e/happy-path.spec.ts:40:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: /Shopping cart/i })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('dialog', { name: /Shopping cart/i })

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
      - text: "1"
    - button "Toggle theme":
      - img
    - link "Customize":
      - /url: /customize
- main:
  - navigation:
    - link "Home":
      - /url: /
    - img
    - link "Shop":
      - /url: /shop
    - img
    - link "Stickers":
      - /url: /shop?type=sticker_normal
    - img
    - text: Anime Heroes Sticker Pack
  - button "Open zoom view":
    - img
  - img "Anime Heroes Sticker Pack"
  - button "Image 1"
  - button "Image 2"
  - button
  - button
  - text: Anime Best Seller New -33%
  - heading "Anime Heroes Sticker Pack" [level=1]
  - img
  - img
  - img
  - img
  - img
  - text: 4.8 · 1,423 reviews ₹199 ₹299 Save ₹100
  - paragraph: A premium pack of 12 vinyl-coated stickers featuring your favourite anime heroes.
  - img
  - text: In stock · ships in 2-3 days
  - paragraph: Size
  - button "A5"
  - button "A4"
  - button "A3"
  - button "Custom"
  - paragraph: Finish
  - button "Matte"
  - button "Glossy"
  - button "Premium"
  - button "Decrease quantity":
    - img
  - spinbutton "Quantity": "1"
  - button "Increase quantity":
    - img
  - button "Wishlist":
    - img
    - text: Wishlist
  - button "Add to Cart":
    - img
    - text: Add to Cart
  - button "Buy Now":
    - img
    - text: Buy Now
  - button "Or order directly on WhatsApp":
    - img
    - text: Or order directly on WhatsApp
  - list:
    - listitem:
      - img
      - text: Free shipping over ₹499
    - listitem:
      - img
      - text: Premium vinyl · waterproof
    - listitem:
      - img
      - text: 7-day easy returns
    - listitem:
      - img
      - text: Made with love in India
  - heading "You'll probably love these too" [level=2]
  - article:
    - link "F1 Speed Sticker":
      - /url: /shop/f1-speed-sticker
      - img "F1 Speed Sticker"
    - text: New
    - button "Add to wishlist":
      - img
    - button "Quick Add":
      - img
      - text: Quick Add
    - text: Formula 1
    - img
    - text: 4.7 (821)
    - heading "F1 Speed Sticker" [level=3]:
      - link "F1 Speed Sticker":
        - /url: /shop/f1-speed-sticker
    - paragraph: UV-resistant, waterproof vinyl sticker for helmets, laptop & bottles.
    - text: ₹149
  - article:
    - link "Marvel Iron Sticker":
      - /url: /shop/marvel-iron-sticker
      - img "Marvel Iron Sticker"
    - text: Best Seller
    - button "Add to wishlist":
      - img
    - button "Quick Add":
      - img
      - text: Quick Add
    - text: Marvel
    - img
    - text: 4.6 (542)
    - heading "Marvel Iron Sticker" [level=3]:
      - link "Marvel Iron Sticker":
        - /url: /shop/marvel-iron-sticker
    - paragraph: Glossy finish marvel sticker, 4-inch, die-cut precision.
    - text: ₹99
  - article:
    - link "Pixel Gamer Pack":
      - /url: /shop/pixel-gamer-pack
      - img "Pixel Gamer Pack"
    - text: Best Seller New -24%
    - button "Add to wishlist":
      - img
    - button "Quick Add":
      - img
      - text: Quick Add
    - text: Gaming
    - img
    - text: 4.9 (988)
    - heading "Pixel Gamer Pack" [level=3]:
      - link "Pixel Gamer Pack":
        - /url: /shop/pixel-gamer-pack
    - paragraph: 14-piece retro & modern gaming sticker pack. Build your controller vibes.
    - text: ₹249 ₹329 Customizable
  - article:
    - link "Lo-Fi Quotes Sticker":
      - /url: /shop/lofi-quotes-sticker
      - img "Lo-Fi Quotes Sticker"
    - button "Add to wishlist":
      - img
    - button "Quick Add":
      - img
      - text: Quick Add
    - text: Quotes
    - img
    - text: 4.5 (233)
    - heading "Lo-Fi Quotes Sticker" [level=3]:
      - link "Lo-Fi Quotes Sticker":
        - /url: /shop/lofi-quotes-sticker
    - paragraph: Soft-tone matte sticker with carefully picked quotes that hit different at 2 AM.
    - text: ₹79
- contentinfo:
  - link "Stix N Vibes":
    - /url: /
    - img
    - text: Stix N Vibes
  - paragraph: Premium stickers, posters, Spotify cards, frames and mystery packs. Customize, vibe, and stick it loud — Stix N Vibes.
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
  - paragraph: Designed & built for vibes. Stick loud.
- button "Open live chat":
  - img
  - text: "!"
- alert
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
  9  |     await page.goto("/");
  10 |     await expect(page).toHaveTitle(/Stix N Vibes/);
  11 |     await expect(page.getByRole("heading", { name: /Stick Loud/i })).toBeVisible({ timeout: 10_000 });
  12 |     await expect(page.getByText(/Shop Now|Customize Yours/i)).toBeVisible();
  13 |   });
  14 | 
  15 |   test("navigates from homepage to /shop", async ({ page }) => {
  16 |     await page.goto("/");
  17 |     await page.getByRole("link", { name: /Shop Now/i }).first().click();
  18 |     await expect(page).toHaveURL(/\/shop/);
  19 |     await expect(page.getByRole("heading", { name: /Shop everything/i })).toBeVisible();
  20 |   });
  21 | 
  22 |   test("filters by sticker type tab and updates the URL", async ({ page }) => {
  23 |     await page.goto("/shop");
  24 |     await page.getByRole("button", { name: /^Stickers$/i }).click();
  25 |     // Wait for navigation update from replace
  26 |     await expect.poll(async () => page.url()).toContain("type=sticker_normal");
  27 |     await expect(page.getByText(/Anime Heroes Sticker Pack/)).toBeVisible();
  28 |   });
  29 | 
  30 |   test("opens a product detail page with JSON-LD schema", async ({ page }) => {
  31 |     await page.goto("/shop/anime-heroes-sticker-pack");
  32 |     await expect(page).toHaveTitle(/Anime Heroes Sticker Pack/i);
  33 |     const jsonLdText = await page.locator('script[type="application/ld+json"][id="product-jsonld-anime-heroes-sticker-pack"]').textContent();
  34 |     expect(jsonLdText).toBeTruthy();
  35 |     const parsed = JSON.parse(jsonLdText!);
  36 |     expect(parsed["@type"]).toBe("Product");
  37 |     expect(parsed.name).toBe("Anime Heroes Sticker Pack");
  38 |   });
  39 | 
  40 |   test("adds to cart and opens the cart drawer", async ({ page }) => {
  41 |     await page.goto("/shop/anime-heroes-sticker-pack");
  42 |     await page.getByRole("button", { name: /Add to Cart/i }).click();
  43 |     // Cart drawer should open via the snv:cart:add event
> 44 |     await expect(page.getByRole("dialog", { name: /Shopping cart/i })).toBeVisible({ timeout: 5_000 });
     |                                                                        ^ Error: expect(locator).toBeVisible() failed
  45 |     await expect(page.getByText(/Anime Heroes Sticker Pack/)).toBeVisible();
  46 |   });
  47 | 
  48 |   test("navigates to checkout with empty cart → shows empty state", async ({ page }) => {
  49 |     await page.goto("/checkout");
  50 |     await expect(page.getByRole("heading", { name: /Your cart is empty/i })).toBeVisible();
  51 |   });
  52 | 
  53 |   test("loads FAQ page with FAQ JSON-LD", async ({ page }) => {
  54 |     await page.goto("/faq");
  55 |     await expect(page).toHaveTitle(/FAQ/i);
  56 |     const jsonLdText = await page.locator('script[type="application/ld+json"][id="faq-jsonld"]').textContent();
  57 |     expect(jsonLdText).toBeTruthy();
  58 |     const parsed = JSON.parse(jsonLdText!);
  59 |     expect(parsed["@type"]).toBe("FAQPage");
  60 |     expect(parsed.mainEntity.length).toBeGreaterThan(5);
  61 |   });
  62 | 
  63 |   test("about page renders our brand tagline", async ({ page }) => {
  64 |     await page.goto("/about");
  65 |     await expect(page.getByRole("heading", { name: /Stix N Vibes/i })).toBeVisible();
  66 |   });
  67 | 
  68 |   test("contact page shows WhatsApp entry", async ({ page }) => {
  69 |     await page.goto("/contact");
  70 |     await expect(page.getByRole("heading", { name: /Say hi/i })).toBeVisible();
  71 |     await expect(page.getByText(/WhatsApp/i)).toBeVisible();
  72 |   });
  73 | 
  74 |   test("policies hub lists the canonical policies", async ({ page }) => {
  75 |     await page.goto("/policies");
  76 |     for (const name of ["Privacy Policy", "Refund Policy", "Shipping Policy", "Terms & Conditions", "Cookie Policy"]) {
  77 |       await expect(page.getByRole("link", { name })).toBeVisible();
  78 |     }
  79 |   });
  80 | });
  81 | 
```