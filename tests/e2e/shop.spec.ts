import path from "node:path";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("demo@stixnvibes.com");
  await page.getByLabel("Password").fill("demo-admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

/** Catches the wa.me link instead of leaving for WhatsApp. */
async function catchWhatsApp(context: BrowserContext) {
  const urls: string[] = [];
  await context.route("https://wa.me/**", (route) => {
    urls.push(route.request().url());
    return route.fulfill({ contentType: "text/html", body: "<title>WhatsApp</title>ok" });
  });
  return urls;
}

test("build a cart with offers and a music card, order on WhatsApp, then manage it in admin", async ({ page, context, isMobile }) => {
  const wa = await catchWhatsApp(context);

  await page.goto("/");
  await expect(page.getByRole("heading", { name: /your stickers/i })).toBeVisible();
  await expect(page.getByLabel("Offers").first()).toContainText("Buy 4 stickers, get 1 free");

  // Five stickers: the fifth is free.
  await page.goto("/shop/lofi-03");
  await expect(page.getByRole("heading", { level: 1, name: "Lo-fi 03" })).toBeVisible();
  await expect(page.getByTestId("price")).toHaveText("₹10");
  await page.getByText("Waterproof", { exact: true }).click();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByTestId("cart-total")).toHaveText("₹40");
  await expect(drawer).toContainText("Material: Waterproof");
  await drawer.getByRole("button", { name: "Close cart" }).first().click();

  // A music card needs its Spotify link; the photo is optional.
  await page.goto("/shop/music-card");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByText('Fill in "Spotify song link" first.')).toBeVisible();
  await page.getByLabel(/Spotify song link/).fill("https://open.spotify.com/track/abc");
  await page.getByLabel(/Your photo/).setInputFiles(path.join(__dirname, "fixtures/photo.png"));
  await expect(page.locator("img[src^='blob:']")).toBeVisible();
  await page.getByLabel(/Dedicated to/).fill("Riya");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByTestId("cart-count")).toHaveText("6");

  // Music cards have a minimum of 5, so checkout waits until there are 5.
  await page.goto("/cart");
  await expect(page.getByText("Music card: minimum 5 per order. Add 4 more to check out.")).toBeVisible();
  const place = page.getByRole("button", { name: "Place order on WhatsApp" });
  await expect(place).toBeDisabled();
  for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Increase quantity" }).nth(1).click();
  await expect(page.getByTestId("cart-total")).toHaveText("₹140");
  await expect(page.getByText("Add ₹110 more for free shipping")).toBeVisible();

  // Details are checked before anything is sent.
  await place.click();
  await expect(page.getByText("Add your name.")).toBeVisible();
  await expect(page.getByText("Add a 10-digit mobile number.")).toBeVisible();
  await page.getByLabel("Name", { exact: true }).fill("Asha");
  await page.getByLabel("WhatsApp number").fill("+91 98765 43210");
  await page.getByLabel("Address").fill("12 Rua de Ourem, Fontainhas");
  await page.getByLabel("City").fill("Panaji");
  await page.getByLabel("Pincode").fill("403001");
  await place.click();

  // Everyone lands on their order page; desktops also get WhatsApp in a new tab,
  // phones tap the big button there.
  await expect(page).toHaveURL(/\/order\/SNV-[A-Z0-9]{6}\?k=[\w-]+&new=1$/);
  const ref = /SNV-[A-Z0-9]{6}/.exec(page.url())![0];
  await expect(page.getByRole("heading", { name: ref })).toBeVisible();
  await expect(page.getByText("12 Rua de Ourem, Fontainhas, Panaji, Goa 403001")).toBeVisible();
  if (isMobile) await page.getByRole("link", { name: "Send order on WhatsApp" }).click();
  await expect.poll(() => wa.length).toBe(1);
  await expect(page.getByTestId("cart-count")).toHaveText("0");

  const text = new URL(wa[0]).searchParams.get("text")!;
  expect(new URL(wa[0]).pathname).toBe("/917744020601");
  expect(text).toContain("Lo-fi 03 × 5 = ₹50");
  expect(text).toContain("Buy 4 stickers, get 1 free: −₹10");
  expect(text).toContain("Spotify song link: https://open.spotify.com/track/abc");
  expect(text).toMatch(/Your photo: https?:\/\/\S+\/u\/[a-f0-9]{32}/);
  expect(text).toContain("Music card × 5 = ₹100");
  expect(text).toContain("Total: ₹140");
  expect(text).toContain("Shipping: please share the charge for my area");
  expect(text).toContain("Phone: 98765 43210");
  expect(text).toContain(`Order ref: ${ref}`);
  expect(text).toMatch(new RegExp(`Order page: https?://\\S+/order/${ref}\\?k=`));

  // A wrong key is a 404, not someone else's order.
  const bad = await page.request.get(`/order/${ref}?k=nope`);
  expect(bad.status()).toBe(404);

  // Admin sees the order, its photo and the numbers.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await adminLogin(page);
  await expect(page.getByTestId("stat-Orders sent to WhatsApp")).not.toHaveText("0");
  await page.getByRole("link", { name: ref }).click();
  await expect(page.getByRole("heading", { name: ref })).toBeVisible();
  await expect(page.getByText("Customer note")).toHaveCount(0);
  await expect(page.getByAltText("Your photo")).toBeVisible();
  await expect(page.getByText("12 Rua de Ourem, Fontainhas, Panaji, Goa 403001")).toBeVisible();
  await page.getByLabel("Status").selectOption("paid");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Saved.")).toBeVisible();

  // The customer shows up in Customers, built from their orders.
  await page.goto("/admin/customers");
  await page.getByRole("link", { name: "Asha" }).first().click();
  await expect(page.getByRole("heading", { name: "Asha" })).toBeVisible();
  await expect(page.getByRole("link", { name: ref })).toBeVisible();
});

test("UPI QR on the order page for a stall pickup", async ({ page, context }) => {
  await catchWhatsApp(context);
  await adminLogin(page);
  await page.goto("/admin/settings");
  await page.getByLabel(/UPI ID for online payments/).fill("stixnvibes@okicici");
  await page.getByRole("button", { name: /Save/ }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();

  await page.goto("/shop/lofi-05");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await page.getByLabel("Name", { exact: true }).fill("Kabir");
  await page.getByLabel("WhatsApp number").fill("9123456780");
  await page.getByText("Pick up at a stall").click();
  await expect(page.getByLabel("Address")).toHaveCount(0);
  await page.getByRole("button", { name: "Place order on WhatsApp" }).click();
  await expect(page).toHaveURL(/\/order\/SNV-/);
  await expect(page.getByRole("heading", { name: "Pay with UPI" })).toBeVisible();
  await expect(page.getByRole("img", { name: "UPI QR code" })).toBeVisible();
  await expect(page.getByText("Paying to stixnvibes@okicici.")).toBeVisible();
});

test("a festival campaign from a template runs with its banner, then switches off", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/offers");
  await page.getByRole("link", { name: /Valentine's: 20% off music cards/ }).click();
  const form = page.locator("#new-offer");
  await expect(form.getByLabel("Name customers see")).toHaveValue("Valentine's: 20% off music cards");
  // Start it now instead of in February.
  await form.getByLabel(/Starts/).fill("");
  await form.getByLabel(/Ends/).fill("");
  await form.getByRole("button", { name: "Add offer" }).click();
  await expect(form.getByText("Saved.")).toBeVisible();

  await page.goto("/shop/music-card");
  await expect(page.getByText("Valentine's week: 20% off music cards. Dedicate a song.")).toBeVisible();

  // Switch it off so other tests see normal prices.
  await page.goto("/admin/offers");
  const card = page.locator("li", { has: page.locator('input[value="Valentine\'s: 20% off music cards"]') }).last();
  await card.getByLabel("Active").uncheck();
  await card.getByRole("button", { name: "Save" }).click();
  await expect(card.getByText("Saved.")).toBeVisible();
});

test("admin adds a poster with options and it shows in the shop", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/products/new?type=poster");
  const name = `Test poster ${Date.now().toString(36)}`;
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel(/^Price ₹/).fill("120");
  // The poster template has Size (A4, A3, framed) and Print; make A3 cost ₹60 more.
  await page.getByLabel("Price change in rupees").nth(1).fill("60");
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Product created.")).toBeVisible();

  await page.goto("/shop?type=poster");
  await page.getByRole("link", { name: new RegExp(name) }).click();
  await expect(page.getByTestId("price")).toHaveText("₹120");
  await page.locator("label", { hasText: /^A3 \+/ }).click();
  await expect(page.getByTestId("price")).toHaveText("₹180");
});

test("wall cards drop to ₹25 each from 6, with free shipping over ₹250", async ({ page }) => {
  await page.goto("/shop/wall-cards");
  await expect(page.getByTestId("price")).toHaveText("₹30");
  for (let i = 0; i < 5; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await expect(drawer.getByTestId("cart-total")).toHaveText("₹150");
  await expect(drawer).toContainText("6+ wall cards at ₹25 each");
  await expect(drawer).toContainText("Add 5 more wall cards to pay ₹20 each.");
  for (let i = 0; i < 5; i++) await drawer.getByRole("button", { name: "Increase quantity" }).click();
  await expect(drawer.getByTestId("cart-total")).toHaveText("₹220");
  await page.goto("/shop/lofi-01");
  for (let i = 0; i < 2; i++) await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(drawer.getByTestId("cart-total")).toHaveText("₹250");
  await expect(drawer.getByText("Free", { exact: true })).toBeVisible();
});
