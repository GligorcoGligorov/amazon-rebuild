import { test, expect, type Page } from "@playwright/test";

const drawer = (page: Page) => page.getByRole("dialog");
const addButton = (page: Page) =>
  page.getByRole("button", { name: "Add to cart", exact: true });

/**
 * The chosen value for a dimension, read from the legend ("Size: S") rather
 * than the selected chip — the chip carries sr-only text like "— selected".
 */
async function chosenOption(page: Page, label: string) {
  const legend = await page
    .getByRole("region", { name: "Purchase options" })
    .getByRole("group")
    .filter({ hasText: label })
    .locator("legend")
    .innerText();
  return legend.split(":").slice(1).join(":").trim();
}

async function openProduct(page: Page, category = "mens-shirts") {
  await page.goto(`/category/${category}`);
  await page.getByRole("article").first().getByRole("link").first().click();
  await expect(page).toHaveURL(/\/product\//);
}

test.describe("add to cart", () => {
  test("opens a drawer and does not leave the page", async ({ page }) => {
    await openProduct(page);
    const productUrl = page.url();

    await addButton(page).first().click();

    // D8: Amazon navigates to a full interstitial page. We must not.
    await expect(drawer(page)).toBeVisible();
    expect(page.url()).toBe(productUrl);

    await expect(drawer(page)).toContainText("Added to cart");
    // Both next steps are offered — Amazon's mobile version offers neither.
    await expect(drawer(page).getByRole("link", { name: "View cart" })).toBeVisible();
    await expect(drawer(page).getByRole("link", { name: "Checkout" })).toBeVisible();
  });

  test("the drawer names the exact variant that was added", async ({ page }) => {
    await openProduct(page);

    const size = await chosenOption(page, "Size");

    await addButton(page).first().click();
    await expect(drawer(page)).toContainText(size);
  });

  test("the header badge updates without a reload", async ({ page }) => {
    await openProduct(page);
    await expect(page.getByRole("link", { name: /0 items in cart/ })).toBeVisible();

    await addButton(page).first().click();
    await expect(drawer(page)).toBeVisible();

    await expect(page.getByRole("link", { name: /1 item in cart/ })).toBeVisible();
  });

  test("the drawer traps focus, closes on Escape and restores focus", async ({
    page,
  }) => {
    await openProduct(page);

    const trigger = addButton(page).first();
    await trigger.click();
    await expect(drawer(page)).toBeVisible();

    // Focus starts inside the drawer.
    await expect(drawer(page).getByRole("button", { name: "Close" })).toBeFocused();

    // Tabbing cycles within the drawer rather than escaping behind it.
    for (let i = 0; i < 6; i++) {
      await page.keyboard.press("Tab");
      const inside = await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[role="dialog"]')),
      );
      expect(inside, "focus must stay inside the drawer").toBe(true);
    }

    await page.keyboard.press("Escape");
    await expect(drawer(page)).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("a no-option product adds straight from the grid", async ({ page }) => {
    await page.goto("/category/mobile-accessories");
    const card = page.getByRole("article").first();
    const title = (await card.getByRole("heading").innerText()).trim();

    await card.getByRole("button", { name: "Add to cart" }).click();

    await expect(drawer(page)).toBeVisible();
    await expect(drawer(page)).toContainText(title);
    await expect(page).toHaveURL(/\/category\/mobile-accessories$/);
  });
});

test.describe("cart page", () => {
  test("mobile puts the subtotal and checkout above the line items", async ({
    page,
    viewport,
  }) => {
    test.skip((viewport?.width ?? 0) > 500, "mobile only");

    await openProduct(page);
    await addButton(page).first().click();
    await drawer(page).getByRole("link", { name: "View cart" }).click();

    await expect(page).toHaveURL(/\/cart$/);

    const checkout = await page
      .getByRole("link", { name: "Proceed to checkout" })
      .boundingBox();
    const firstItem = await page.getByRole("listitem").first().boundingBox();

    // The single clearest thing Amazon's mobile cart gets right.
    expect(checkout!.y, "checkout must come before the line items").toBeLessThan(
      firstItem!.y,
    );
    expect(checkout!.y, "and be in the first viewport").toBeLessThan(viewport!.height);
  });

  test("quantity goes up, down, and the line total follows", async ({ page }) => {
    await openProduct(page);
    await addButton(page).first().click();
    await drawer(page).getByRole("link", { name: "View cart" }).click();

    await expect(page.getByText("Subtotal (1 item)")).toBeVisible();

    await page.getByRole("button", { name: /^Increase quantity/ }).click();
    await expect(page.getByText("Subtotal (2 items)")).toBeVisible();
    await expect(page.getByText("each")).toBeVisible();

    await page.getByRole("button", { name: /^Decrease quantity/ }).click();
    await expect(page.getByText("Subtotal (1 item)")).toBeVisible();
  });

  test("the minus becomes a remove control at quantity one", async ({ page }) => {
    await openProduct(page);
    await addButton(page).first().click();
    await drawer(page).getByRole("link", { name: "View cart" }).click();

    // At 1 there is no decrease button — removing is the same gesture — and
    // exactly one control removes the line, not two.
    await expect(page.getByRole("button", { name: /^Decrease quantity/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Remove/ })).toHaveCount(1);

    await page.getByRole("button", { name: /^Remove .* from cart/ }).click();
    await expect(page.getByText("Your cart is empty")).toBeVisible();
  });

  test("the cart survives a reload", async ({ page }) => {
    await openProduct(page);
    await addButton(page).first().click();
    await drawer(page).getByRole("link", { name: "View cart" }).click();

    const subtotal = await page.getByText(/^Subtotal/).innerText();
    await page.reload();

    await expect(page.getByText(subtotal)).toBeVisible();
    await expect(page.getByRole("listitem").first()).toBeVisible();
  });

  test("line items spell out the chosen variant", async ({ page }) => {
    await openProduct(page);

    const colour = await chosenOption(page, "Colour");

    await addButton(page).first().click();
    await drawer(page).getByRole("link", { name: "View cart" }).click();

    await expect(page.getByRole("listitem").first()).toContainText(colour);
  });

  test("the empty cart offers a way out", async ({ page }) => {
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();
    await page.getByRole("link", { name: "Browse categories" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("checkout sends a guest to sign in, and the cart follows", async ({ page }) => {
    // M5 put the auth wall in front of /checkout (D13). Before that this went
    // straight through; the wall is the product change, not a regression.
    await openProduct(page);
    await addButton(page).first().click();
    await drawer(page).getByRole("link", { name: "Checkout" }).click();

    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fcheckout/);

    await page.getByRole("button", { name: "Use demo account" }).click();
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page).toHaveURL(/\/checkout$/);
    // M6 replaced the checkout stub with the accordion; the heading and the
    // summary are what prove the cart came along.
    await expect(
      page.getByRole("heading", { name: "Secure checkout", level: 1 }),
    ).toBeVisible();
    await expect(
      page.getByRole("region", { name: "Order summary" }),
    ).toContainText(/Items \(\d+\)/);
  });

  test("no horizontal scroll on the cart", async ({ page }) => {
    await openProduct(page);
    await addButton(page).first().click();
    await drawer(page).getByRole("link", { name: "View cart" }).click();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

/** The drawer is an enhancement; adding must still work without JavaScript. */
test.describe("cart without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("adding, changing quantity and removing all still work", async ({ page }) => {
    await page.goto("/category/mobile-accessories");
    await page.getByRole("article").first().getByRole("button", { name: "Add to cart" }).click();

    await page.goto("/cart");
    await expect(page.getByText("Subtotal (1 item)")).toBeVisible();

    await page.getByRole("button", { name: /^Increase quantity/ }).click();
    await expect(page.getByText("Subtotal (2 items)")).toBeVisible();

    await page.getByRole("button", { name: /^Remove/ }).first().click();
    await expect(page.getByText("Your cart is empty")).toBeVisible();
  });
});
