# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: happy-path.spec.ts >> Happy path >> adds to cart and opens the cart drawer
- Location: tests\e2e\happy-path.spec.ts:40:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('dialog', { name: /shopping cart/i })
Expected: visible
Timeout: 8000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 8000ms
  - waiting for getByRole('dialog', { name: /shopping cart/i })

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
  - text: 4.8·1,423 reviews ₹199₹299 Save ₹100
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
    - listitem:
      - img
      - text: Latex eco-inks · recyclable mailer
  - heading "Technical Specifications" [level=2]
  - text: Material Composition100% Polyvinyl Chloride (PVC) Premium Vinyl Weather & Water ResistanceIP68 Waterproof, Dishwasher Safe & UV Proof Adhesive TechnologyHigh-Tack Pressure Sensitive Acrylic (Residue-Free) Print Resolution1200 DPI Ultra-HD Japanese Eco-Solvent Ink Thickness Gauge6.0 mil (150 microns) Heavy Duty Vinyl Layer Origin & CraftsmanshipHand-Finished Studio Craft in Bengaluru, India
  - heading "Customer Reviews" [level=2]
  - img
  - img
  - img
  - img
  - img
  - text: 4.8 out of 5(1423 verified reviews)
  - link "Contact the team":
    - /url: /contact
  - text: R
  - heading "Rohan Mehta" [level=4]
  - text: Verified Buyer
  - img
  - img
  - img
  - img
  - img
  - paragraph: "\"The holographic finish on this sticker pack is mind-blowing! Absolutely zero bubbles when applying to my MacBook Pro.\""
  - text: P
  - heading "Priya Sharma" [level=4]
  - text: Verified Buyer
  - img
  - img
  - img
  - img
  - img
  - paragraph: "\"Delivery was super fast (2 days to Mumbai). Print detail and vinyl quality are top notch!\""
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
    - text: 4.7(821)
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
    - text: 4.6(542)
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
    - text: 4.9(988)
    - heading "Pixel Gamer Pack" [level=3]:
      - link "Pixel Gamer Pack":
        - /url: /shop/pixel-gamer-pack
    - paragraph: 14-piece retro & modern gaming sticker pack. Build your controller vibes.
    - text: ₹249₹329 Customizable
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
    - text: 4.5(233)
    - heading "Lo-Fi Quotes Sticker" [level=3]:
      - link "Lo-Fi Quotes Sticker":
        - /url: /shop/lofi-quotes-sticker
    - paragraph: Soft-tone matte sticker with carefully picked quotes that hit different at 2 AM.
    - text: ₹79
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
  20 |     await expect(page.getByRole("heading", { name: /Shop everything StixNvibes/i })).toBeVisible();
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
> 48 |     await expect(dialog).toBeVisible({ timeout: 8_000 });
     |                          ^ Error: expect(locator).toBeVisible() failed
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