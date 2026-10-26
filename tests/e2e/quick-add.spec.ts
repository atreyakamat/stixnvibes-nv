import { expect, test } from "@playwright/test";

test("adds to cart straight from collection and shop cards, with sizes and frames", async ({ page }) => {
  await page.goto("/collections/lo-fi");
  await page.getByRole("button", { name: "Add Lo-fi 04 to cart" }).click();
  await expect(page.getByRole("button", { name: "Add Lo-fi 04 to cart" })).toHaveText("Added ✓");
  await expect(page.getByTestId("cart-count").first()).toHaveText("1");

  // A framed A3 poster from its card: the price follows the pick.
  await page.goto("/shop?type=poster");
  await page.getByLabel("Size for Your poster").selectOption({ label: "Size: A3 framed" });
  await expect(page.getByRole("button", { name: "Add Your poster to cart" })).toHaveText("Add · ₹400");
  await page.getByRole("button", { name: "Add Your poster to cart" }).click();

  // Music cards need a song link first, so their card sends you to the product page.
  await page.goto("/shop?type=music-card");
  await expect(page.getByRole("link", { name: "Personalise & add" })).toHaveAttribute("href", "/shop/music-card");

  await page.goto("/cart");
  await expect(page.getByText("Size: A3 framed")).toBeVisible();
  await expect(page.getByText("Lo-fi 04")).toBeVisible();
});
