import { expect, test, type Page } from "@playwright/test";

// The test server talks to tests/e2e/mock-youpi.mjs as its YouPI gateway.
const MOCK = "http://localhost:3199";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("demo@stixnvibes.com");
  await page.getByLabel("Password").fill("demo-admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

async function paymentSettings(page: Page) {
  await adminLogin(page);
  await page.goto("/admin/settings");
  await page.getByLabel(/UPI ID for online payments/).fill("stixnvibes@okicici");
  await page.getByLabel(/WhatsApp number for payment screenshots/).fill("+91 98765 01234");
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("Settings saved.")).toBeVisible();
}

async function pickupOrder(page: Page, slug: string, name: string) {
  await page.goto(`/shop/${slug}`);
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await page.getByLabel("Name", { exact: true }).fill(name);
  await page.getByLabel("Phone number").fill("9123456780");
  await page.getByText("Pick up at a stall").click();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/order\/SNV-/);
  return /SNV-[A-Z0-9]{6}/.exec(page.url())![0];
}

test("pays online through YouPI and the order turns paid, with a receipt", async ({ page }) => {
  await paymentSettings(page);
  const ref = await pickupOrder(page, "lofi-09", "Tara");

  await page.getByRole("button", { name: "Pay ₹10 now" }).click();
  await expect(page.getByRole("heading", { name: `Pay ₹10.00 for ${ref}` })).toBeVisible();
  await page.getByRole("button", { name: "Pay with mock UPI" }).click();

  await expect(page).toHaveURL(new RegExp(`/order/${ref}\\?k=.+&paid=1`));
  await expect(page.getByText("Paid, thank you. We're packing your order.")).toBeVisible();
  await expect(page.getByRole("button", { name: /Pay .* now/ })).toHaveCount(0);

  await page.getByRole("link", { name: "Download receipt" }).click();
  await expect(page.getByTestId("receipt-status")).toHaveText("Paid");
  await expect(page.getByText(ref, { exact: true })).toBeVisible();

  await page.goto(`/admin/orders/${ref}`);
  await expect(page.getByText(/UTR 998877665544/)).toBeVisible();
});

test("when YouPI is down the order page falls back to the QR and WhatsApp", async ({ page }) => {
  await page.request.post(`${MOCK}/__down`);
  try {
    await paymentSettings(page);
    const ref = await pickupOrder(page, "lofi-10", "Ishaan");
    await page.getByRole("button", { name: "Pay ₹10 now" }).click();
    await expect(page.getByRole("alert").filter({ hasText: "Online payment isn't available right now." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Pay with the UPI QR" })).toBeVisible();
    await expect(page.getByRole("img", { name: "UPI QR code" })).toBeVisible();

    const wa = page.getByRole("link", { name: "Send screenshot on WhatsApp" });
    await expect(wa).toHaveAttribute("href", new RegExp(`^https://wa\\.me/919876501234\\?text=.*${ref}`));
    const qr = page.getByRole("link", { name: "Download QR" });
    await expect(qr).toHaveAttribute("download", `stixnvibes-${ref}-upi-qr.png`);
    await expect(qr).toHaveAttribute("href", /^data:image\/png;base64,/);
  } finally {
    await page.request.post(`${MOCK}/__up`);
  }
});

test("forged or replayed webhooks are refused", async ({ request }) => {
  const body = JSON.stringify({ event: "SUCCESS", paymentId: "x", orderId: "SNV-AAAAAA", amountPaise: 1000 });
  const res = await request.post("/api/payments/youpi", {
    headers: { "Content-Type": "application/json", "X-Gateway-Signature": `sha256=${"0".repeat(64)}` },
    data: body,
  });
  expect(res.status()).toBe(401);
});
