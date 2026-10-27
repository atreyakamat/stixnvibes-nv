import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function adminLogin(page: Page) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill("demo@stixnvibes.com");
  await page.getByLabel("Password").fill("demo-admin");
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test("a stall QR brings its code and source into the order, analytics and stock", async ({ page }, info) => {
  const src = `stall-e2e-${info.project.name}`;
  // Scanning the stall QR: the code applies itself in the cart.
  await page.goto(`/?src=${src}&code=stall10`);
  // The page saves the code once it's running; wait for that before moving on.
  await expect.poll(() => page.evaluate(() => JSON.stringify({ ...localStorage, ...sessionStorage }))).toContain("STALL10");
  await page.goto("/shop/lofi-07");
  await page.getByRole("button", { name: "Increase quantity" }).click();
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await expect(page.getByText("STALL10", { exact: true })).toBeVisible();
  await expect(page.getByText("applied")).toBeVisible();
  await expect(page.getByTestId("cart-total")).toHaveText("₹18"); // ₹20 less 10%

  await page.getByLabel("Name", { exact: true }).fill("Meera");
  await page.getByLabel("Phone number").fill("9988776655");
  await page.getByLabel(/Instagram username/).fill("not a handle!");
  await page.getByText("Pick up at a stall").click();
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page.getByText("That doesn't look like an Instagram username.")).toBeVisible();
  await page.getByLabel(/Instagram username/).fill("@meera.makes");
  await page.getByRole("button", { name: "Place order" }).click();
  await expect(page).toHaveURL(/\/order\/SNV-/);
  const ref = /SNV-[A-Z0-9]{6}/.exec(page.url())![0];

  await adminLogin(page);
  await page.goto(`/admin/orders/${ref}`);
  await expect(page.getByRole("link", { name: "@meera.makes on Instagram" })).toHaveAttribute("href", "https://ig.me/m/meera.makes");
  await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/919988776655");
  await expect(page.getByText(src)).toBeVisible();
  await expect(page.getByRole("term").filter({ hasText: "Code STALL10" })).toBeVisible();

  // Confirming takes the 2 stickers off stock. Both browser projects share
  // one demo server, so read the count first.
  const stockOf = async () => {
    await page.goto("/admin/products?q=Lo-fi%2007");
    const text = await page.getByRole("row", { name: /Lo-fi 07/ }).getByText(/in stock/).textContent();
    return Number(/(\d+) in stock/.exec(text ?? "")![1]);
  };
  const before = await stockOf();
  await page.goto(`/admin/orders/${ref}`);
  await page.getByLabel("Status").selectOption("confirmed");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved.")).toBeVisible();
  expect(await stockOf()).toBe(before - 2);

  await page.goto("/admin/analytics?days=7");
  const row = page.getByRole("row", { name: new RegExp(src) });
  await expect(row).toBeVisible();
  await expect(row.getByRole("cell").nth(3)).toHaveText("1"); // confirmed
  await expect(page.getByRole("row", { name: /STALL10/ })).toBeVisible();
  await expect(page.getByTestId("funnel-Visits")).not.toHaveText(/^0/);
});

test("admin makes a code and prints its QR card", async ({ page }, info) => {
  const code = `E2E${info.project.name === "mobile" ? "M" : "D"}20`;
  await adminLogin(page);
  await page.goto("/admin/coupons");
  const form = page.locator("#new-code");
  await form.getByLabel("Code").fill(code.toLowerCase());
  await form.getByLabel("Type").selectOption("amount");
  await form.getByRole("textbox", { name: "₹ off" }).fill("20");
  await form.getByLabel(/Min order/).fill("150");
  await form.getByLabel(/Where you hand it out/).fill("Stall WordsUp");
  await form.getByRole("button", { name: "Add code" }).click();
  await expect(page.getByText(`Code ${code} added.`)).toBeVisible();
  await page.getByRole("listitem").filter({ hasText: code }).getByRole("link", { name: "QR card", exact: true }).click();
  await expect(page.getByRole("img", { name: "QR code" })).toBeVisible();
  await expect(page.getByText("₹20 off")).toBeVisible();
  await expect(page.getByText(`src=stall-wordsup&code=${code}`)).toBeVisible();

  // The cart explains the minimum instead of applying it.
  await page.goto("/shop/lofi-02");
  await page.getByRole("button", { name: "Add to cart" }).click();
  await page.goto("/cart");
  await page.getByRole("button", { name: "Have a code?" }).click();
  await page.getByLabel("Code", { exact: true }).fill(code);
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText(`${code} works on orders of ₹150 or more.`)).toBeVisible();
  await page.getByRole("button", { name: `Remove code ${code}` }).click();
  // The box stays open to try another code.
  await page.getByLabel("Code", { exact: true }).fill("NOPE99");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("We don't know the code NOPE99.")).toBeVisible();
});

test("a customer sends their own design and it lands in admin, ready for a Cricut sheet", async ({ page }, info) => {
  const size = `5 cm die cut (${info.project.name})`;
  await page.goto("/custom");
  await page.locator('input[type="file"]').setInputFiles(path.join(__dirname, "fixtures/photo.png"));
  await expect(page.getByText("Uploaded")).toBeVisible();
  await page.getByLabel("Make it as").selectOption("sticker");
  await page.getByLabel("Quantity").fill("30");
  await page.getByLabel(/Size and cut/).fill(size);
  await page.getByLabel("Name").fill("Club Robotics");
  await page.getByLabel("Phone (WhatsApp)").fill("9123456789");
  await page.getByRole("button", { name: "Send for a quote" }).click();
  await expect(page.getByText("Request sent")).toBeVisible();
  const ref = (await page.getByText(/^CUS-[A-Z0-9]{6}$/).textContent())!;

  await adminLogin(page);
  await page.goto("/admin/custom");
  await page.getByRole("link", { name: ref }).click();
  await expect(page.getByRole("heading", { name: ref })).toBeVisible();
  await expect(page.getByText(size)).toBeVisible();
  await expect(page.getByAltText("Design 1")).toBeVisible();
  await page.getByRole("link", { name: "Make a Cricut sheet from these designs" }).click();

  // One square design, 30 wanted: 5 cm stickers fit 12 or 13 to an A4 Print Then Cut sheet.
  await page.getByLabel("Sticker size (cm, long side)").fill("5");
  await expect(page.getByTestId("sheet-summary")).toHaveText("30 stickers on 3 sheets");
  await expect(page.getByText(/^Sheet 1: 1[23] stickers$/)).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download PNG" }).first().click();
  const file = await (await download).path();
  const { readFileSync } = await import("node:fs");
  const png = readFileSync(file);
  expect(png.subarray(1, 4).toString()).toBe("PNG");
  expect(png.includes(Buffer.from("pHYs"))).toBe(true);
  expect(png.readUInt32BE(16)).toBe(2160); // 7.2 in at 300 DPI
  expect(png.readUInt32BE(20)).toBe(3186); // 10.62 in
});
