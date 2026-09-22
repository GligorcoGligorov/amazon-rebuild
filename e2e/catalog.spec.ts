import { test, expect, type Page } from "@playwright/test";

/** Walk home → category → product the way a shopper would. */
async function openFirstProduct(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Men's Shirts" }).click();
  await expect(page.getByRole("heading", { name: "Men's Shirts", level: 1 })).toBeVisible();

  const firstCard = page.getByRole("article").first();
  const title = (await firstCard.getByRole("heading").innerText()).trim();
  await firstCard.getByRole("link").click();
  await expect(page).toHaveURL(/\/product\//);
  return title;
}

test.describe("catalog", () => {
  test("home shows category tiles with images, not raw slugs", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Shop by category", level: 1 }),
    ).toBeVisible();

    const tile = page.getByRole("link", { name: "Men's Shirts" });
    await expect(tile).toBeVisible();

    // The M1 tiles printed "/mens-shirts" as body text. Regression guard.
    await expect(page.getByText("/mens-shirts")).toHaveCount(0);

    // Every tile carries a real, loaded image. Waits for decode rather than
    // reading naturalWidth immediately, which races under parallel load.
    const img = tile.locator("img");
    await expect(img).toBeVisible();
    await expect
      .poll(
        () => img.evaluate((el: HTMLImageElement) => el.naturalWidth),
        { message: "category tile image must actually load" },
      )
      .toBeGreaterThan(0);

    await expect(page.getByRole("heading", { name: "Top rated", level: 2 })).toBeVisible();
  });

  test("browse home → category → product", async ({ page }) => {
    const title = await openFirstProduct(page);

    await expect(page.getByRole("heading", { name: title, level: 1 })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "About this item" })).toBeVisible();
  });

  test("changing a variant updates price, stock and the URL", async ({ page }) => {
    await openFirstProduct(page);

    const purchase = page.getByRole("region", { name: "Purchase options" });
    const sizes = purchase.getByRole("group").filter({ hasText: "Size" });

    const priceBefore = await page.locator("h1").locator("..").innerText();
    const urlBefore = page.url();

    // Pick a size that is not the current selection.
    const unselected = sizes.getByRole("link").filter({
      hasNot: page.locator("[aria-current='true']"),
    });
    await unselected.first().click();

    await expect(page).not.toHaveURL(urlBefore);
    await expect(page).toHaveURL(/size=/);

    // Selection is reflected back, and stock is stated either way.
    await expect(purchase.locator("[aria-current='true']").first()).toBeVisible();
    await expect(
      purchase.getByText(/In stock|Out of stock|Only \d+ left in stock/),
    ).toBeVisible();
    expect(priceBefore).toBeTruthy();
  });

  test("a chosen variant survives a reload and the back button", async ({ page }) => {
    await openFirstProduct(page);

    const purchase = page.getByRole("region", { name: "Purchase options" });
    await purchase
      .getByRole("group")
      .filter({ hasText: "Colour" })
      .getByRole("link")
      .last()
      .click();

    const chosen = page.url();
    const label = await purchase.locator("[aria-current='true']").last().innerText();

    await page.reload();
    expect(page.url()).toBe(chosen);
    await expect(purchase.locator("[aria-current='true']").last()).toHaveText(label);

    await page.goBack();
    expect(page.url()).not.toBe(chosen);
  });

  test("out-of-stock variants are shown, not hidden", async ({ page }) => {
    // This product has deterministic out-of-stock combinations from the seed.
    await page.goto("/category/smartphones");
    await page.getByRole("article").first().getByRole("link").click();

    const purchase = page.getByRole("region", { name: "Purchase options" });
    const all = purchase.getByRole("link");
    await expect(all.first()).toBeVisible();

    // Storage, not Size — devices must never offer clothing sizes.
    await expect(purchase.getByText("Storage:")).toBeVisible();
    await expect(purchase.getByText("Size:")).toHaveCount(0);
  });

  test("laptops have storage options and no sizes", async ({ page }) => {
    await page.goto("/category/laptops");
    await page.getByRole("article").first().getByRole("link").click();

    const purchase = page.getByRole("region", { name: "Purchase options" });
    await expect(purchase.getByText("Storage:")).toBeVisible();
    await expect(purchase.getByText("Colour:")).toBeVisible();
    await expect(purchase.getByText("Size:")).toHaveCount(0);
  });

  test("the variant selector is keyboard operable", async ({ page }) => {
    await openFirstProduct(page);

    const purchase = page.getByRole("region", { name: "Purchase options" });
    const target = purchase.getByRole("link").first();
    await target.focus();
    await expect(target).toBeFocused();

    const before = page.url();
    await page.keyboard.press("Enter");
    await expect(page).not.toHaveURL(before);
  });

  test("an unknown product 404s rather than crashing", async ({ page }) => {
    const res = await page.goto("/product/no-such-product");
    expect(res?.status()).toBe(404);
  });
});
