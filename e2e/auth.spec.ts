import { test, expect, type Page } from "@playwright/test";

const form = (page: Page) => page.locator("#auth-form");
/** Next's route announcer is also role="alert", so scope to the form. */
const formAlert = (page: Page) => form(page).getByRole("alert");

const DEMO_EMAIL = "demo@8xstore.dev";
const DEMO_PASSWORD = "demo1234";

/** A fresh address per run, so sign-up specs do not collide with each other. */
const freshEmail = () =>
  `t${Date.now()}${Math.floor(Math.random() * 1000)}@example.test`;

async function addSomethingToCart(page: Page) {
  await page.goto("/category/mobile-accessories");
  // Stock moves as the suite places orders, so pick an addable card.
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

test.describe("the auth wall", () => {
  test("guards checkout and orders, and nothing else", async ({ page }) => {
    // Open to guests — the whole point of D13.
    for (const path of ["/", "/search?q=watch", "/cart", "/category/laptops"]) {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.split("?")[0].replace("/", "\\/")));
    }

    for (const guarded of ["/checkout", "/orders", "/account"]) {
      await page.goto(guarded);
      await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/);
    }
  });

  test("signing in from checkout returns to checkout with the cart intact", async ({
    page,
  }) => {
    // A fresh account, not the shared demo one: the demo cart is whatever the
    // last visitor left in it, so counts here would not be deterministic.
    const email = freshEmail();
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Wall Walker");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("passphrase-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("link", { name: /Wall/ })).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    const title = await addSomethingToCart(page);

    await page.goto("/cart");
    await page.getByRole("link", { name: "Proceed to checkout" }).click();

    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fcheckout/);
    await expect(page.getByText("Your cart is saved")).toBeVisible();

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("passphrase-1");
    await page.getByRole("button", { name: "Sign in" }).click();

    // Back where they were going, not dumped on the home page. M6 replaced the
    // checkout stub with the accordion, so the summary is what states the cart.
    await expect(page).toHaveURL(/\/checkout$/);
    await expect(
      page.getByRole("region", { name: "Order summary" }),
    ).toContainText("Items (1)");

    // And the guest cart came with them.
    await page.goto("/cart");
    await expect(page.getByRole("listitem").first()).toContainText(title);
  });
});

test.describe("the demo account", () => {
  test("its credentials are on the page and fill the form in one click", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    await expect(page.getByText(DEMO_EMAIL)).toBeVisible();
    await expect(page.getByText(DEMO_PASSWORD)).toBeVisible();

    await page.getByRole("button", { name: "Use demo account" }).click();
    await expect(page.getByLabel("Email")).toHaveValue(DEMO_EMAIL);
    await expect(page.getByLabel("Password")).toHaveValue(DEMO_PASSWORD);

    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /Demo/ })).toBeVisible();
  });
});

test.describe("sign up, sign in, sign out", () => {
  test("a new account can be created and used", async ({ page }) => {
    const email = freshEmail();

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Ada Lovelace");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByRole("link", { name: /Ada/ })).toBeVisible();

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("link", { name: /Ada/ })).toBeVisible();
  });

  test("the cart survives sign-up, sign-out and sign-in", async ({ page }) => {
    const title = await addSomethingToCart(page);
    const email = freshEmail();

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Grace Hopper");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("passphrase-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("link", { name: /Grace/ })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("listitem").first()).toContainText(title);

    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    // Wait for sign-out to land: /sign-in redirects away while still signed in.
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("passphrase-1");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("link", { name: /Grace/ })).toBeVisible();

    // Signing back in must not appear to empty the cart.
    await page.goto("/cart");
    await expect(page.getByRole("listitem").first()).toContainText(title);
  });
});

test.describe("error messages", () => {
  test("a wrong password says so without revealing the account exists", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill("definitely-wrong");
    await page.getByRole("button", { name: "Sign in" }).click();

    const error = formAlert(page);
    await expect(error).toBeVisible();
    await expect(error).toContainText(/do not match an account/);

    // The email is kept, so it does not have to be retyped.
    await expect(page.getByLabel("Email")).toHaveValue(DEMO_EMAIL);
  });

  test("an unknown email gives the same message as a wrong password", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("nobody@example.test");
    await page.getByLabel("Password").fill("whatever-1234");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(formAlert(page)).toContainText(/do not match an account/);
  });

  test("an email already in use says to sign in instead", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Someone Else");
    await page.getByLabel("Email").fill(DEMO_EMAIL);
    await page.getByLabel("Password").fill("longenough1");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(formAlert(page)).toContainText(/already uses that email/);
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
  });

  test("a short password says how short it is", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Short Password");
    await page.getByLabel("Email").fill(freshEmail());
    await page.getByLabel("Password").fill("abc");
    await page.getByRole("button", { name: "Create account" }).click();

    const error = formAlert(page);
    await expect(error).toContainText(/at least 8 characters/i);
    await expect(error).toContainText(/yours has 3/i);
  });

  test("a malformed email is rejected before anything else", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Bad Email");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("longenough1");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(formAlert(page)).toContainText(/valid email/i);
  });

  test("errors are tied to their field for screen readers", async ({ page }) => {
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Aria Check");
    await page.getByLabel("Email").fill(freshEmail());
    await page.getByLabel("Password").fill("abc");
    await page.getByRole("button", { name: "Create account" }).click();

    const password = page.getByLabel("Password");
    await expect(password).toHaveAttribute("aria-invalid", "true");
    const describedBy = await password.getAttribute("aria-describedby");
    expect(describedBy).toContain("password-error");
  });
});

/**
 * Regression suite for a real bug found on the deployed site: the cart was
 * keyed only by the session cookie, so after sign-out the browser still
 * pointed at the cart that now belonged to user A. A signed-out visitor saw
 * A's items, and the next account created in that browser inherited them.
 *
 * Fixed by making ownership exclusive — see D30.
 */
test.describe("cart ownership across accounts", () => {
  test("a cart never follows the browser from one account to another", async ({
    page,
  }) => {
    const emailA = freshEmail();
    const emailB = freshEmail();
    const password = "passphrase-1";

    // --- A fills a cart as a guest, then signs up ------------------------
    // Starting as a guest matters: this is the path where the cart gets
    // claimed by an account, and where the original bug lived.
    const itemA = await addSomethingToCart(page);
    await expect(page.getByRole("link", { name: /1 item in cart/ })).toBeVisible();

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Alpha Tester");
    await page.getByLabel("Email").fill(emailA);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("link", { name: /Alpha/ })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("listitem").first()).toContainText(itemA);

    // --- A signs out: the browser must forget the cart -------------------
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await expect(
      page.getByRole("link", { name: /0 items in cart/ }),
      "a signed-out visitor must not see the last user's cart",
    ).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();

    // --- B signs up in the same browser ----------------------------------
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Bravo Tester");
    await page.getByLabel("Email").fill(emailB);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("link", { name: /Bravo/ })).toBeVisible();

    await page.goto("/cart");
    await expect(
      page.getByText("Your cart is empty"),
      "a new account must not inherit the previous user's cart",
    ).toBeVisible();

    // --- back to A: their own cart is still there -------------------------
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();

    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(emailA);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    // Wait for the session to land before navigating, or /cart renders as a guest.
    await expect(page.getByRole("link", { name: /Alpha/ })).toBeVisible();

    await page.goto("/cart");
    await expect(
      page.getByRole("listitem").first(),
      "signing back in must restore the user's own saved cart",
    ).toContainText(itemA);
    await expect(page.getByRole("link", { name: /1 item in cart/ })).toBeVisible();
  });

  test("a guest cart is consumed by the account it merges into", async ({ page }) => {
    const email = freshEmail();
    const title = await addSomethingToCart(page);
    await expect(page.getByRole("link", { name: /1 item in cart/ })).toBeVisible();

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Merge Once");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("passphrase-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("link", { name: /Merge/ })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByRole("listitem").first()).toContainText(title);

    // Sign out: the item stays with the account, not with the browser.
    await page.goto("/account");
    await page.getByRole("button", { name: "Sign out" }).click();
    await expect(page.getByRole("link", { name: /0 items in cart/ })).toBeVisible();

    // A second account created here starts empty — the guest cart was spent.
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Second Account");
    await page.getByLabel("Email").fill(freshEmail());
    await page.getByLabel("Password").fill("passphrase-1");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("link", { name: /Second/ })).toBeVisible();

    await page.goto("/cart");
    await expect(page.getByText("Your cart is empty")).toBeVisible();
  });
});
