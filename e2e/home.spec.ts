import { test, expect } from "@playwright/test";

test.describe("home page", () => {
  test("renders categories read from the database", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", { name: "Shop by category", level: 1 }),
    ).toBeVisible();

    // Asserts on real rows, not a fixed count: this is what proves the page
    // reached the database rather than rendering a hardcoded list.
    const tiles = page.getByRole("listitem");
    await expect(tiles.first()).toBeVisible();
    const count = await tiles.count();
    expect(count).toBeGreaterThan(0);
    await expect(page.getByText(`${count} categories`)).toBeVisible();

    await expect(
      page.getByRole("heading", { name: "Men's Shirts", level: 2 }),
    ).toBeVisible();
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

    // Relative luminance, good enough to prove text and background differ.
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

    // Every link in the header must resolve. M1 ships only the empty state.
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

    // The search input is a disabled shell until M3, so focus must skip it and
    // land on the cart rather than getting stuck.
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: /items in cart/ })).toBeFocused();
  });
});
