import { expect, test, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("demo@stixnvibes.com");
  await page.getByLabel("Password").fill("demo-admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("browse, buy with UPI, then admin verifies and ships", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /your stickers/i })).toBeVisible();

  await page.goto("/shop");
  await page.getByRole("link", { name: /Lo-fi sticker 03/ }).first().click();
  await expect(page.getByRole("heading", { level: 1, name: "Lo-fi sticker 03" })).toBeVisible();
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  const drawer = page.getByRole("dialog", { name: "Your cart" });
  await expect(drawer).toBeVisible();
  await drawer.getByRole("link", { name: "Checkout" }).click();

  await expect(page.getByTestId("checkout-total")).toHaveText("₹147");
  await page.getByLabel("Full name").fill("Asha Naik");
  await page.getByLabel("Mobile number").fill("98765 43210");
  await page.getByLabel("House, building, street").fill("House 12, Fontainhas");
  await page.getByLabel("City").fill("Panaji");
  await page.getByLabel("Pincode").fill("403001");
  await page.getByRole("button", { name: "Place order and pay" }).click();

  await expect(page.getByTestId("order-status")).toHaveText("Awaiting payment");
  const orderNumber = (await page.getByText(/^Order SNV-/).textContent())!.replace("Order ", "").trim();
  if (isMobile) await expect(page.getByRole("link", { name: "Open UPI app" })).toHaveAttribute("href", /^upi:\/\/pay\?pa=demo%40upi.*am=147\.00/);
  else await expect(page.getByRole("img", { name: /UPI QR code/ })).toBeVisible();

  // UTRs are unique per order, and demo data lives as long as the server.
  const utr = String(Date.now()).slice(-12).padStart(12, "4");
  await page.getByLabel("UPI reference number").fill(utr);
  await page.getByRole("button", { name: "I've paid" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Checking payment");

  // Cart is emptied after ordering.
  await expect(page.getByTestId("cart-count")).toHaveText("0");

  // Admin side.
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Email").fill("demo@stixnvibes.com");
  await page.getByLabel("Password").fill("demo-admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

  await page.goto(`/admin/orders/${orderNumber}`);
  await expect(page.getByText(utr).first()).toBeVisible();
  await page.getByRole("button", { name: "Mark paid" }).click();
  await expect(page.getByRole("button", { name: "Mark packed" })).toBeVisible();
  await page.getByRole("button", { name: "Mark packed" }).click();
  await page.getByLabel("Courier").fill("India Post");
  await page.getByLabel("Tracking number").fill("EK123456789IN");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  await page.getByRole("button", { name: "Mark shipped" }).click();
  await expect(page.getByRole("button", { name: "Mark delivered" })).toBeVisible();

  // Customer sees it through order tracking.
  await page.goto("/track");
  await page.getByLabel("Order number").fill(orderNumber.toLowerCase());
  await page.getByLabel("Phone number").fill("9876543210");
  await page.getByRole("button", { name: "Find my order" }).click();
  await expect(page.getByTestId("order-status")).toHaveText("Shipped");
  await expect(page.getByText("EK123456789IN")).toBeVisible();
});

test("admin can price a product and the shop picks it up", async ({ page }) => {
  await adminLogin(page);
  await page.goto("/admin/products/new");
  const name = `Test A4 poster ${Date.now().toString(36)}`;
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Category").selectOption("posters");
  await page.getByLabel("Option name").fill("A4");
  await page.getByLabel("Price ₹").fill("149");
  await page.getByLabel("Stock").fill("5");
  await page.getByPlaceholder(/paste an image link/).fill("/lofi/lofi-05.webp");
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page.getByRole("button", { name: "Create product" }).click();
  await expect(page.getByText("Product created.")).toBeVisible();

  await page.goto(`/shop/${name.toLowerCase().replace(/ /g, "-")}`);
  await expect(page.getByText("₹149").first()).toBeVisible();
  await expect(page.getByRole("button", { name: "Add to cart" })).toBeVisible();
});

test("custom request reaches admin", async ({ page }) => {
  await page.goto("/custom");
  await page.getByLabel("Name", { exact: true }).fill("Fest Team");
  await page.getByLabel("Phone, email or Instagram").fill("@festteam");
  await page.getByLabel("What do you want?").fill("100 logo stickers for our college fest in December");
  await page.getByRole("button", { name: "Ask for a quote" }).click();
  await expect(page.getByRole("heading", { name: "Got it!" })).toBeVisible();

  await adminLogin(page);
  await page.goto("/admin/custom");
  await expect(page.getByText("100 logo stickers for our college fest").first()).toBeVisible();
});

test("tampered cart prices are ignored", async ({ request }) => {
  const res = await request.post("/api/cart/quote", {
    data: { lines: [{ productId: "p-lofi-01", variantId: "v-lofi-01", qty: 2, price: 1 }], fulfilment: "pickup" },
  });
  const { quote } = await res.json();
  expect(quote.totalPaise).toBe(9800);
});

test("admin pages and APIs are locked without a session", async ({ request }) => {
  const res = await request.get("/admin/orders", { maxRedirects: 0 });
  expect([302, 303, 307]).toContain(res.status());
});
