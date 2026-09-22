import { test, expect } from "@playwright/test";

/*
 * Two assertions from M1 were changed here, because the product deliberately
 * changed — not because the tests were wrong (CLAUDE.md standing rule):
 *
 *  - "N categories, read live from the database" was M1 scaffolding copy and no
 *    longer exists. DB-backed rendering is now proven by asserting on seeded
 *    category names and a loaded remote image instead.
 *  - Category names moved from <h2> body text to tile links, because M2
 *    replaced the slug-printing placeholders with real tiles.
 *
 * Everything else — shell, tokens, overflow, keyboard, cart link — is kept.
 */

test.describe("home page", () => {
  test("renders categories read from the database", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Shop by category", level: 1 }),
    ).toBeVisible();

    // Seeded rows, so this only passes if the page reached Postgres.
    for (const name of ["Men's Shirts", "Laptops", "Smartphones"]) {
      await expect(page.getByRole("link", { name })).toBeVisible();
    }

    await expect(page.getByRole("heading", { name: "Top rated", level: 2 })).toBeVisible();
  });

  test("header and footer are present, and the page does not scroll sideways", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("link", { name: "8xstore" })).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();

    // Amazon serves a 1000px-wide desktop page into a 375px viewport. Ours
    // must never do that — see research/FINDINGS.md.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test("design tokens actually resolve to colours", async ({ page }) => {
    await page.goto("/");

    // Regression guard. The first M1 deploy rendered a white-on-white header
    // because the token classes used Tailwind v3 syntax that v4 silently drops.
    // Role and text assertions all passed while the page was unreadable, so
    // this asserts the computed result rather than the markup.
    const header = page.getByRole("banner");
    const { background, color } = await header.evaluate((el) => {
      const s = getComputedStyle(el);
      return { background: s.backgroundColor, color: s.color };
    });

    const parse = (c: string) => (c.match(/[\d.]+/g) ?? []).map(Number);
    const [br, bg, bb, ba = 1] = parse(background);
    const [tr, tg, tb] = parse(color);

    expect(ba, "header background must not be transparent").toBeGreaterThan(0);

    const lum = (r: number, g: number, b: number) =>
      (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    expect(
      Math.abs(lum(br, bg, bb) - lum(tr, tg, tb)),
      "header text and background must contrast",
    ).toBeGreaterThan(0.4);
  });

  test("the cart link leads somewhere real", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: /items in cart/ }).click();

    // Every link in the header must resolve. M4 fills this page in.
    await expect(page).toHaveURL(/\/cart$/);
    await expect(
      page.getByRole("heading", { name: "Your cart", level: 1 }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse categories" })).toBeVisible();
  });

  test("is keyboard navigable from the skip link to the cart", async ({ page }) => {
    await page.goto("/");

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "8xstore" })).toBeFocused();

    // M3 made the search box real, so it is now in the tab order between the
    // logo and the cart — it was a disabled shell that focus skipped before.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("searchbox", { name: "Search products" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("button", { name: "Search" })).toBeFocused();

    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /items in cart/ })).toBeFocused();
  });
});
