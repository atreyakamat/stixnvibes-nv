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

Locator: getByText(/Anime Heroes Sticker Pack/)
Expected: visible
Error: strict mode violation: getByText(/Anime Heroes Sticker Pack/) resolved to 3 elements:
    1) <span class="truncate text-foreground/80">Anime Heroes Sticker Pack</span> aka locator('span').filter({ hasText: 'Anime Heroes Sticker Pack' })
    2) <h1 class="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl text-balance">Anime Heroes Sticker Pack</h1> aka getByRole('heading', { name: 'Anime Heroes Sticker Pack' })
    3) <p class="font-medium leading-tight truncate">Anime Heroes Sticker Pack</p> aka getByLabel('Shopping cart').getByText('Anime Heroes Sticker Pack')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText(/Anime Heroes Sticker Pack/)

```

# Page snapshot

```yaml
- generic [ref=e1]:
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
          - button "Search" [ref=e33] [cursor=pointer]:
            - img [ref=e34]
          - button "Wishlist" [ref=e37] [cursor=pointer]:
            - img [ref=e38]
          - button "Account" [ref=e40] [cursor=pointer]:
            - img [ref=e41]
          - button "Open cart" [ref=e44] [cursor=pointer]:
            - img [ref=e45]
            - generic [ref=e48]: "1"
          - button "Toggle theme" [ref=e49] [cursor=pointer]:
            - img [ref=e50]
          - link "Customize" [ref=e56] [cursor=pointer]:
            - /url: /customize
    - main [ref=e57]:
      - generic [ref=e58]:
        - navigation [ref=e59]:
          - link "Home" [ref=e60] [cursor=pointer]:
            - /url: /
          - img [ref=e61]
          - link "Shop" [ref=e63] [cursor=pointer]:
            - /url: /shop
          - img [ref=e64]
          - link "Stickers" [ref=e66] [cursor=pointer]:
            - /url: /shop?type=sticker_normal
          - img [ref=e67]
          - generic [ref=e69]: Anime Heroes Sticker Pack
        - generic [ref=e70]:
          - generic [ref=e71]:
            - generic [ref=e72]:
              - button "Open zoom view" [ref=e73] [cursor=pointer]:
                - img [ref=e74]
              - img "Anime Heroes Sticker Pack" [ref=e77]
              - generic [ref=e78]:
                - button "Image 1" [ref=e79] [cursor=pointer]
                - button "Image 2" [ref=e80] [cursor=pointer]
            - generic [ref=e81]:
              - button [ref=e82] [cursor=pointer]
              - button [ref=e83] [cursor=pointer]
          - generic [ref=e85]:
            - generic [ref=e86]:
              - generic [ref=e87]: Anime
              - generic [ref=e88]: Best Seller
              - generic [ref=e89]: New
              - generic [ref=e90]: "-33%"
            - heading "Anime Heroes Sticker Pack" [level=1] [ref=e91]
            - generic [ref=e92]:
              - generic [ref=e93]:
                - img [ref=e94]
                - img [ref=e96]
                - img [ref=e98]
                - img [ref=e100]
                - img [ref=e102]
              - generic [ref=e104]: "4.8"
              - generic [ref=e105]: ·
              - generic [ref=e106]: 1,423 reviews
            - generic [ref=e107]:
              - generic [ref=e108]: ₹199
              - generic [ref=e109]: ₹299
              - generic [ref=e110]: Save ₹100
            - paragraph [ref=e111]: A premium pack of 12 vinyl-coated stickers featuring your favourite anime heroes.
            - generic [ref=e113]:
              - img [ref=e114]
              - text: In stock · ships in 2-3 days
            - generic [ref=e116]:
              - generic [ref=e117]:
                - paragraph [ref=e118]: Size
                - generic [ref=e119]:
                  - button "A5" [ref=e120] [cursor=pointer]
                  - button "A4" [ref=e121] [cursor=pointer]
                  - button "A3" [ref=e122] [cursor=pointer]
                  - button "Custom" [ref=e123] [cursor=pointer]
              - generic [ref=e124]:
                - paragraph [ref=e125]: Finish
                - generic [ref=e126]:
                  - button "Matte" [ref=e127] [cursor=pointer]
                  - button "Glossy" [ref=e128] [cursor=pointer]
                  - button "Premium" [ref=e129] [cursor=pointer]
            - generic [ref=e130]:
              - generic [ref=e131]:
                - button "Decrease quantity" [ref=e132] [cursor=pointer]:
                  - img [ref=e133]
                - spinbutton "Quantity" [ref=e134]: "1"
                - button "Increase quantity" [ref=e135] [cursor=pointer]:
                  - img [ref=e136]
              - button "Wishlist" [ref=e137] [cursor=pointer]:
                - img [ref=e138]
                - text: Wishlist
            - generic [ref=e140]:
              - button "Added!" [active] [ref=e141] [cursor=pointer]:
                - img [ref=e142]
                - text: Added!
              - button "Buy Now" [ref=e144] [cursor=pointer]:
                - img [ref=e145]
                - text: Buy Now
            - button "Or order directly on WhatsApp" [ref=e147] [cursor=pointer]:
              - img [ref=e148]
              - text: Or order directly on WhatsApp
            - list [ref=e150]:
              - listitem [ref=e151]:
                - img [ref=e152]
                - text: Free shipping over ₹499
              - listitem [ref=e157]:
                - img [ref=e158]
                - text: Premium vinyl · waterproof
              - listitem [ref=e161]:
                - img [ref=e162]
                - text: 7-day easy returns
              - listitem [ref=e167]:
                - img [ref=e168]
                - text: Made with love in India
        - generic [ref=e170]:
          - heading "You'll probably love these too" [level=2] [ref=e171]
          - generic [ref=e172]:
            - article [ref=e173]:
              - generic [ref=e174]:
                - link "F1 Speed Sticker" [ref=e175] [cursor=pointer]:
                  - /url: /shop/f1-speed-sticker
                  - img "F1 Speed Sticker" [ref=e176]
                - generic [ref=e178]: New
                - button "Add to wishlist" [ref=e179] [cursor=pointer]:
                  - img [ref=e180]
                - button "Quick Add" [ref=e183] [cursor=pointer]:
                  - img [ref=e184]
                  - text: Quick Add
              - generic [ref=e185]:
                - generic [ref=e186]:
                  - generic [ref=e187]: Formula 1
                  - generic [ref=e188]:
                    - img [ref=e189]
                    - text: "4.7"
                    - generic [ref=e191]: (821)
                - heading "F1 Speed Sticker" [level=3] [ref=e192]:
                  - link "F1 Speed Sticker" [ref=e193] [cursor=pointer]:
                    - /url: /shop/f1-speed-sticker
                - paragraph [ref=e194]: UV-resistant, waterproof vinyl sticker for helmets, laptop & bottles.
                - generic [ref=e197]: ₹149
            - article [ref=e198]:
              - generic [ref=e199]:
                - link "Marvel Iron Sticker" [ref=e200] [cursor=pointer]:
                  - /url: /shop/marvel-iron-sticker
                  - img "Marvel Iron Sticker" [ref=e201]
                - generic [ref=e203]: Best Seller
                - button "Add to wishlist" [ref=e204] [cursor=pointer]:
                  - img [ref=e205]
                - button "Quick Add" [ref=e208] [cursor=pointer]:
                  - img [ref=e209]
                  - text: Quick Add
              - generic [ref=e210]:
                - generic [ref=e211]:
                  - generic [ref=e212]: Marvel
                  - generic [ref=e213]:
                    - img [ref=e214]
                    - text: "4.6"
                    - generic [ref=e216]: (542)
                - heading "Marvel Iron Sticker" [level=3] [ref=e217]:
                  - link "Marvel Iron Sticker" [ref=e218] [cursor=pointer]:
                    - /url: /shop/marvel-iron-sticker
                - paragraph [ref=e219]: Glossy finish marvel sticker, 4-inch, die-cut precision.
                - generic [ref=e222]: ₹99
            - article [ref=e223]:
              - generic [ref=e224]:
                - link "Pixel Gamer Pack" [ref=e225] [cursor=pointer]:
                  - /url: /shop/pixel-gamer-pack
                  - img "Pixel Gamer Pack" [ref=e226]
                - generic [ref=e227]:
                  - generic [ref=e228]: Best Seller
                  - generic [ref=e229]: New
                  - generic [ref=e230]: "-24%"
                - button "Add to wishlist" [ref=e231] [cursor=pointer]:
                  - img [ref=e232]
                - button "Quick Add" [ref=e235] [cursor=pointer]:
                  - img [ref=e236]
                  - text: Quick Add
              - generic [ref=e237]:
                - generic [ref=e238]:
                  - generic [ref=e239]: Gaming
                  - generic [ref=e240]:
                    - img [ref=e241]
                    - text: "4.9"
                    - generic [ref=e243]: (988)
                - heading "Pixel Gamer Pack" [level=3] [ref=e244]:
                  - link "Pixel Gamer Pack" [ref=e245] [cursor=pointer]:
                    - /url: /shop/pixel-gamer-pack
                - paragraph [ref=e246]: 14-piece retro & modern gaming sticker pack. Build your controller vibes.
                - generic [ref=e247]:
                  - generic [ref=e248]:
                    - generic [ref=e249]: ₹249
                    - generic [ref=e250]: ₹329
                  - generic [ref=e251]: Customizable
            - article [ref=e252]:
              - generic [ref=e253]:
                - link "Lo-Fi Quotes Sticker" [ref=e254] [cursor=pointer]:
                  - /url: /shop/lofi-quotes-sticker
                  - img "Lo-Fi Quotes Sticker" [ref=e255]
                - button "Add to wishlist" [ref=e256] [cursor=pointer]:
                  - img [ref=e257]
                - button "Quick Add" [ref=e260] [cursor=pointer]:
                  - img [ref=e261]
                  - text: Quick Add
              - generic [ref=e262]:
                - generic [ref=e263]:
                  - generic [ref=e264]: Quotes
                  - generic [ref=e265]:
                    - img [ref=e266]
                    - text: "4.5"
                    - generic [ref=e268]: (233)
                - heading "Lo-Fi Quotes Sticker" [level=3] [ref=e269]:
                  - link "Lo-Fi Quotes Sticker" [ref=e270] [cursor=pointer]:
                    - /url: /shop/lofi-quotes-sticker
                - paragraph [ref=e271]: Soft-tone matte sticker with carefully picked quotes that hit different at 2 AM.
                - generic [ref=e274]: ₹79
    - contentinfo [ref=e275]:
      - generic [ref=e276]:
        - generic [ref=e277]:
          - generic [ref=e278]:
            - link "Stix N Vibes" [ref=e279] [cursor=pointer]:
              - /url: /
              - img [ref=e281]
              - text: Stix
              - generic [ref=e283]: "N"
              - text: Vibes
            - paragraph [ref=e284]: Premium stickers, posters, Spotify cards, frames and mystery packs. Customize, vibe, and stick it loud — Stix N Vibes.
            - generic [ref=e285]:
              - link "Instagram" [ref=e286] [cursor=pointer]:
                - /url: https://instagram.com/stixnvibes
                - img [ref=e287]
              - link "Twitter" [ref=e290] [cursor=pointer]:
                - /url: https://twitter.com/stixnvibes
                - img [ref=e291]
              - link "YouTube" [ref=e293] [cursor=pointer]:
                - /url: https://youtube.com/@stixnvibes
                - img [ref=e294]
              - link "WhatsApp" [ref=e297] [cursor=pointer]:
                - /url: https://wa.me/919999999999
                - img [ref=e298]
          - generic [ref=e300]:
            - heading "Shop" [level=4] [ref=e301]
            - list [ref=e302]:
              - listitem [ref=e303]:
                - link "Stickers" [ref=e304] [cursor=pointer]:
                  - /url: /shop/stickers
              - listitem [ref=e305]:
                - link "Posters" [ref=e306] [cursor=pointer]:
                  - /url: /shop/posters
              - listitem [ref=e307]:
                - link "Spotify Cards" [ref=e308] [cursor=pointer]:
                  - /url: /shop/spotify-cards
              - listitem [ref=e309]:
                - link "Frames" [ref=e310] [cursor=pointer]:
                  - /url: /shop/frames
              - listitem [ref=e311]:
                - link "Mystery Packs" [ref=e312] [cursor=pointer]:
                  - /url: /shop/mystery
          - generic [ref=e313]:
            - heading "Company" [level=4] [ref=e314]
            - list [ref=e315]:
              - listitem [ref=e316]:
                - link "About" [ref=e317] [cursor=pointer]:
                  - /url: /about
              - listitem [ref=e318]:
                - link "Contact" [ref=e319] [cursor=pointer]:
                  - /url: /contact
              - listitem [ref=e320]:
                - link "FAQ" [ref=e321] [cursor=pointer]:
                  - /url: /faq
              - listitem [ref=e322]:
                - link "Custom Orders" [ref=e323] [cursor=pointer]:
                  - /url: /customize
          - generic [ref=e324]:
            - heading "Support" [level=4] [ref=e325]
            - list [ref=e326]:
              - listitem [ref=e327]:
                - link "Shipping" [ref=e328] [cursor=pointer]:
                  - /url: /policies/shipping
              - listitem [ref=e329]:
                - link "Refunds" [ref=e330] [cursor=pointer]:
                  - /url: /policies/refund
              - listitem [ref=e331]:
                - link "Privacy" [ref=e332] [cursor=pointer]:
                  - /url: /policies/privacy
              - listitem [ref=e333]:
                - link "Terms" [ref=e334] [cursor=pointer]:
                  - /url: /policies/terms
          - generic [ref=e335]:
            - heading "Reach Out" [level=4] [ref=e336]
            - list [ref=e337]:
              - listitem [ref=e338]:
                - img [ref=e339]
                - text: hello@stixnvibes.com
              - listitem [ref=e342]:
                - img [ref=e343]
                - text: Bengaluru, India
        - generic [ref=e346]:
          - paragraph [ref=e347]: © 2026 Stix N Vibes. Made with stickers & sunshine in India.
          - paragraph [ref=e348]:
            - text: Designed & built for vibes.
            - generic [ref=e349]: Stick loud.
    - dialog "Shopping cart" [ref=e350]:
      - complementary [ref=e352]:
        - generic [ref=e353]:
          - generic [ref=e354]:
            - heading "Cart" [level=2] [ref=e355]
            - paragraph [ref=e356]: 1 item
          - button "Close cart" [ref=e357] [cursor=pointer]:
            - img [ref=e358]
        - paragraph [ref=e362]:
          - img [ref=e363]
          - generic [ref=e368]:
            - text: You're
            - strong [ref=e369]: ₹300
            - text: away from free shipping
        - generic [ref=e372]:
          - list [ref=e373]:
            - listitem [ref=e374]:
              - img "Anime Heroes Sticker Pack" [ref=e375]
              - generic [ref=e376]:
                - paragraph [ref=e377]: Anime Heroes Sticker Pack
                - paragraph [ref=e378]: A4 · Matte
                - paragraph [ref=e379]: ₹199
                - generic [ref=e380]:
                  - generic [ref=e381]:
                    - button "Decrease" [ref=e382] [cursor=pointer]:
                      - img [ref=e383]
                    - generic [ref=e384]: "1"
                    - button "Increase" [ref=e385] [cursor=pointer]:
                      - img [ref=e386]
                  - button "Remove Anime Heroes Sticker Pack" [ref=e387] [cursor=pointer]:
                    - img [ref=e388]
          - generic [ref=e391]:
            - img [ref=e392]
            - paragraph [ref=e394]:
              - text: Add a
              - strong [ref=e395]: Mystery Pack
              - text: (₹299) and a free sticker is on us.
            - link "Browse mystery packs →" [ref=e396] [cursor=pointer]:
              - /url: /shop/mystery
        - generic [ref=e397]:
          - generic [ref=e398]:
            - textbox "Coupon code" [ref=e399]:
              - /placeholder: Coupon (try VIBE10)
            - button "Apply" [ref=e400] [cursor=pointer]
          - generic [ref=e401]:
            - generic [ref=e402]:
              - term [ref=e403]: Subtotal
              - definition [ref=e404]: ₹199
            - generic [ref=e405]:
              - term [ref=e406]: Shipping
              - definition [ref=e407]: ₹49
          - generic [ref=e408]:
            - generic [ref=e409]: Total
            - generic [ref=e410]: ₹248
          - link "Checkout" [ref=e411] [cursor=pointer]:
            - /url: /checkout
            - img [ref=e412]
            - text: Checkout
    - button "Open live chat" [ref=e415] [cursor=pointer]:
      - img [ref=e416]
      - generic [ref=e418]: "!"
  - alert [ref=e419]
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
  44 |     await expect(page.getByRole("dialog", { name: /Shopping cart/i })).toBeVisible({ timeout: 5_000 });
> 45 |     await expect(page.getByText(/Anime Heroes Sticker Pack/)).toBeVisible();
     |                                                               ^ Error: expect(locator).toBeVisible() failed
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