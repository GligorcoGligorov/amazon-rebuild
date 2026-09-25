import { test, expect } from "@playwright/test";

/*
 * The store was renamed from 8xstore to Almanac when 8x changed the brief from
 * an Amazon clone to an original storefront (D36). The name assertions below
 * follow the brand; what they check — the logo link exists, is focusable, is
 * tappable, and page titles carry the store name — is unchanged.
 */
const PAGES = [
  ["/", "home"],
  ["/search?q=watch", "search"],
  ["/category/laptops", "category"],
  ["/product/blue-black-check-shirt-83", "product"],
  ["/cart", "cart"],
  ["/sign-in", "sign in"],
  ["/no-such-page", "404"],
] as const;

test.describe("polish pass", () => {
  test("no page scrolls sideways", async ({ page }) => {
    for (const [path, label] of PAGES) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${label} must not scroll sideways`).toBeLessThanOrEqual(1);
    }
  });

  test("every page has a title that says what it is", async ({ page }) => {
    for (const [path, label] of PAGES) {
      await page.goto(path);
      const title = await page.title();
      expect(title, `${label} needs a real title`).not.toBe("");
      expect(title, `${label} title must be specific`).toMatch(/Almanac/);
    }
  });

  test("an unknown URL gets a real 404 with a way out", async ({ page }) => {
    const res = await page.goto("/no-such-page");
    expect(res?.status()).toBe(404);

    // It used to be the bare Next default: no header, no footer, no exit.
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("contentinfo")).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/can't find/i);
    await page.getByRole("link", { name: "Go to the home page" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("an unknown product 404s inside the shop chrome", async ({ page }) => {
    const res = await page.goto("/product/definitely-not-a-product");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("banner")).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse all products" })).toBeVisible();
  });

  test("header controls are big enough to tap on mobile", async ({ page, viewport }) => {
    test.skip((viewport?.width ?? 0) > 500, "mobile only");
    await page.goto("/");

    // They were 28px before this pass. A thumb wants 44.
    for (const name of [/Almanac/, /Sign in/, /items in cart/]) {
      const box = await page.getByRole("link", { name }).first().boundingBox();
      expect(box!.height, `${name} tap target`).toBeGreaterThanOrEqual(40);
    }
  });

  test("focused controls show a visible ring", async ({ page }) => {
    await page.goto("/");
    const link = page.getByRole("link", { name: "Almanac" });
    await link.focus();

    const outline = await link.evaluate((el) => {
      const s = getComputedStyle(el);
      return { width: s.outlineWidth, style: s.outlineStyle };
    });
    expect(outline.style).not.toBe("none");
    expect(parseFloat(outline.width)).toBeGreaterThan(0);
  });

  test("the skip link works and lands on main", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const skip = page.getByRole("link", { name: "Skip to main content" });
    await expect(skip).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/#main$/);
  });
});
