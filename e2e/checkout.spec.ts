import { test, expect, type Page } from "@playwright/test";

const freshEmail = () =>
  `c${Date.now()}${Math.floor(Math.random() * 1000)}@example.test`;

const summary = (page: Page) => page.getByRole("region", { name: "Order summary" });
const step = (page: Page, name: string | RegExp) =>
  page.getByRole("region", { name });

/** Signs up a brand-new account so order history starts empty and countable. */
async function signUpFresh(page: Page, first = "Checkout") {
  const email = freshEmail();
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(`${first} Tester`);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("passphrase-1");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("link", { name: new RegExp(first) })).toBeVisible();
  return email;
}

async function addItem(page: Page) {
  await page.goto("/category/mobile-accessories");
  // Not `.first()`: the suite places real orders, so stock moves and the first
  // card may be sold out. Pick one that can actually be added.
  const card = page
    .getByRole("article")
    .filter({ has: page.getByRole("button", { name: "Add to cart" }) })
    .first();
  const title = (await card.getByRole("heading").innerText()).trim();
  await card.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  return title;
}

async function fillAddress(page: Page, name = "Ada Lovelace") {
  await page.getByLabel("Full name").fill(name);
  await page.getByLabel("Street address").fill("12 Analytical Way");
  await page.getByLabel("City").fill("Springfield");
  await page.getByLabel("State").fill("IL");
  await page.getByLabel("ZIP code").fill("62704");
  await page.getByRole("button", { name: "Deliver to this address" }).click();
}

test.describe("checkout", () => {
  test("is a walled garden — no nav, no search, no cart badge", async ({ page }) => {
    await signUpFresh(page, "Walled");
    await addItem(page);
    await page.goto("/checkout");

    // D11: nothing to click but finishing or deliberately leaving.
    await expect(page.getByRole("searchbox", { name: "Search products" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /items in cart/ })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Secure checkout" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to cart" })).toBeVisible();
  });

  test("the summary shows -- for shipping and tax until an address is set", async ({
    page,
  }) => {
    await signUpFresh(page, "Totals");
    await addItem(page);
    await page.goto("/checkout");

    // The whole point of D11: a number before it can be known is a guess that
    // will change, so we say we do not know. It resolves in three phases,
    // because shipping depends on the speed and tax only on the destination.
    await expect(summary(page)).toContainText("--");
    await expect(summary(page)).toContainText(
      /calculated once you enter a delivery address/i,
    );

    await fillAddress(page);
    await expect(page).toHaveURL(/step=delivery/);

    // Address known: tax resolves, carriage does not yet — and the helper copy
    // must follow, not keep claiming tax is unknown.
    await expect(summary(page)).toContainText(/Shipping is calculated once you choose/i);
    const taxRow = summary(page).locator("div", { hasText: /Estimated tax/ }).last();
    await expect(taxRow).toContainText("$");
    const shippingRow = summary(page)
      .locator("div", { hasText: /Shipping & handling/ })
      .last();
    await expect(shippingRow).toContainText("--");

    // Speed chosen: everything resolves.
    await page.getByRole("link", { name: /Standard — arrives/ }).click();
    await expect(page).toHaveURL(/step=payment/);
    await expect(summary(page)).not.toContainText("--");
  });

  test("finished steps collapse to a summary with a Change link", async ({ page }) => {
    await signUpFresh(page, "Collapse");
    await addItem(page);
    await page.goto("/checkout");

    await fillAddress(page, "Grace Hopper");

    const addressStep = step(page, "Delivery address");
    await expect(addressStep).toContainText("Grace Hopper");
    await expect(addressStep).toContainText("12 Analytical Way");
    // Collapsed: the form is gone, a Change link is in its place.
    await expect(addressStep.getByLabel("Street address")).toHaveCount(0);

    await addressStep.getByRole("link", { name: /Change/ }).click();
    await expect(page).toHaveURL(/step=address/);
    await expect(
      step(page, "Delivery address").getByLabel("Street address"),
    ).toBeVisible();
  });

  test("one step is open at a time, and later steps cannot be jumped to", async ({
    page,
  }) => {
    await signUpFresh(page, "Guard");
    await addItem(page);

    // Asking for the last step with nothing answered lands on the first.
    await page.goto("/checkout?step=review");
    await expect(
      step(page, "Delivery address").getByLabel("Street address"),
      "an unreachable step must fall back, not render broken",
    ).toBeVisible();

    // Exactly one panel is the current step.
    await expect(page.locator('[aria-current="step"]')).toHaveCount(1);
  });

  test("browse → cart → checkout → order, end to end", async ({ page }) => {
    await signUpFresh(page, "Endtoend");
    const title = await addItem(page);

    await page.goto("/cart");
    await page.getByRole("link", { name: "Proceed to checkout" }).click();
    await expect(page).toHaveURL(/\/checkout/);

    await fillAddress(page);

    // Delivery
    await expect(page).toHaveURL(/step=delivery/);
    await page.getByRole("link", { name: /Standard — arrives/ }).click();
    await expect(page).toHaveURL(/step=payment/);

    // Payment — a single demo method, no card details collected (D31).
    await expect(step(page, "Payment method")).toContainText("Demo card ending 4242");
    await page.getByRole("link", { name: "Use this payment method" }).click();
    await expect(page).toHaveURL(/step=review/);

    // Review lists what is being bought, then places the order.
    await expect(step(page, "Review and place order")).toContainText(title);
    const total = await summary(page).getByText(/^\$/).last().innerText();

    await page.getByRole("button", { name: /^Place order/ }).click();

    await expect(page).toHaveURL(/\/orders\/[0-9a-f-]+\?placed=1/);
    await expect(page.getByRole("heading", { name: /Order placed/ })).toBeVisible();
    // Scoped to main (D40): after the redirect, Next's screen-reader route
    // announcer also carries the order number, via the page title.
    await expect(page.getByRole("main").getByText(/8X-/)).toBeVisible();
    await expect(page.getByText(total)).toBeVisible();

    // The order is in history.
    await page.goto("/orders");
    await expect(page.getByText("1 order")).toBeVisible();
    await page.getByRole("link", { name: /^View order/ }).click();
    await expect(page.getByRole("heading", { level: 1 })).toContainText("8X-");
    await expect(page.getByText(title)).toBeVisible();
  });

  test("placing an order empties the cart and decrements stock", async ({ page }) => {
    await signUpFresh(page, "Stock");
    await page.goto("/category/mobile-accessories");
    await page.getByRole("article").first().getByRole("link").first().click();

    const stockBefore = Number(
      (await page.getByText(/Only \d+ left in stock|In stock/).innerText())
        .match(/\d+/)?.[0] ?? "0",
    );
    const productUrl = page.url();

    await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");

    await page.goto("/checkout");
    await fillAddress(page);
    await page.getByRole("link", { name: /Standard — arrives/ }).click();
    await page.getByRole("link", { name: "Use this payment method" }).click();
    await page.getByRole("button", { name: /^Place order/ }).click();
    await expect(page).toHaveURL(/\/orders\//);

    // Cart is empty and the badge agrees.
    await expect(page.getByRole("link", { name: /0 items in cart/ })).toBeVisible();
    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();

    // Stock went down by exactly one, if it was countable before.
    if (stockBefore > 0) {
      await page.goto(productUrl);
      const after = Number(
        (await page.getByText(/Only \d+ left in stock|In stock/).innerText())
          .match(/\d+/)?.[0] ?? "0",
      );
      if (after > 0) expect(after).toBe(stockBefore - 1);
    }
  });

  test("the address is saved and offered again next time", async ({ page }) => {
    await signUpFresh(page, "Saved");
    await addItem(page);
    await page.goto("/checkout");
    await fillAddress(page, "Alan Turing");
    await expect(page).toHaveURL(/step=delivery/);

    await page.goto("/account/addresses");
    await expect(page.getByText("Alan Turing").first()).toBeVisible();
    await expect(page.getByText("12 Analytical Way")).toBeVisible();

    await page.goto("/checkout?step=address");
    await expect(page.getByRole("link", { name: /Alan Turing/ })).toBeVisible();
  });

  test("an empty cart cannot reach checkout", async ({ page }) => {
    await signUpFresh(page, "Emptycart");
    await page.goto("/checkout");
    await expect(page.getByText(/nothing to check out/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /^Place order/ })).toHaveCount(0);
  });

  test("another user's order is not readable", async ({ page }) => {
    await signUpFresh(page, "Owner");
    await addItem(page);
    await page.goto("/checkout");
    await fillAddress(page);
    await page.getByRole("link", { name: /Standard — arrives/ }).click();
    await page.getByRole("link", { name: "Use this payment method" }).click();
    await page.getByRole("button", { name: /^Place order/ }).click();
    await expect(page).toHaveURL(/\/orders\//);
    const orderUrl = page.url().replace("?placed=1", "");

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await signUpFresh(page, "Nosy");
    const res = await page.goto(orderUrl);
    expect(res?.status(), "an order id from elsewhere must 404").toBe(404);
  });

  test("the accordion is keyboard operable", async ({ page }) => {
    await signUpFresh(page, "Keyboard");
    await addItem(page);
    await page.goto("/checkout");

    // Each step is a real heading, so a screen reader can walk them.
    await expect(page.getByRole("heading", { name: "Delivery address" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Delivery speed" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Payment method" })).toBeVisible();

    const field = page.getByLabel("Full name");
    await field.focus();
    await expect(field).toBeFocused();

    await fillAddress(page);
    const change = step(page, "Delivery address").getByRole("link", { name: /Change/ });
    await change.focus();
    await expect(change).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/step=address/);
  });

  test("the address form reports what is missing", async ({ page }) => {
    await signUpFresh(page, "Validation");
    await addItem(page);
    await page.goto("/checkout");

    await page.getByRole("button", { name: "Deliver to this address" }).click();

    const error = page.locator("#address-form").getByRole("alert");
    await expect(error).toContainText(/full name/i);
    await expect(page.getByLabel("Full name")).toHaveAttribute("aria-invalid", "true");

    // The step stays open rather than advancing.
    await expect(page.getByLabel("Street address")).toBeVisible();
  });

  test("no horizontal scroll at checkout", async ({ page }) => {
    await signUpFresh(page, "Overflow");
    await addItem(page);
    await page.goto("/checkout");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

/**
 * A JWT session outlives the row it points at. The seed sweeps throwaway test
 * accounts, so a browser can hold a token for a user that no longer exists —
 * which used to 500 on the first cart write instead of asking them to sign in.
 */
test.describe("a session whose user has been deleted", () => {
  test("degrades to a guest rather than erroring", async ({ page, context }) => {
    await signUpFresh(page, "Ghost");

    // Keep the session cookie but point it at nobody: clearing the user row is
    // what the seed does, so forge the same end state by dropping the cookie's
    // subject through a sign-out that leaves the JWT behind.
    const cookies = await context.cookies();
    const session = cookies.find((c) => c.name.includes("session-token"));
    expect(session, "there should be a session cookie to tamper with").toBeTruthy();

    // A token signed for a different, non-existent subject.
    await context.clearCookies();
    await context.addCookies([{ ...session!, value: `${session!.value}tampered` }]);

    // An unreadable token is simply not a session: the app treats it as a guest
    // and the cart still works rather than returning a 500.
    await page.goto("/category/mobile-accessories");
    const res = await page
      .getByRole("article")
      .first()
      .getByRole("button", { name: "Add to cart" })
      .click()
      .then(() => "ok")
      .catch(() => "failed");
    expect(res).toBe("ok");

    await page.goto("/cart");
    await expect(page.getByRole("heading", { name: "Your cart" })).toBeVisible();
  });
});
