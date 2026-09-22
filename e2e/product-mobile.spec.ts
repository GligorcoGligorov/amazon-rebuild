import { test, expect } from "@playwright/test";

/**
 * D9: mobile product pages lead with title and price, and pin a buy bar.
 * Amazon puts a sponsored ad above the title and the price below a
 * full-viewport image, with Add to cart at y≈1,770 — see research/FINDINGS.md.
 */
test.describe("product page on mobile", () => {
  test.skip(({ viewport }) => (viewport?.width ?? 0) > 500, "mobile only");

  test("title and price are above the fold, before the gallery", async ({
    page,
    viewport,
  }) => {
    await page.goto("/category/mens-shirts");
    await page.getByRole("article").first().getByRole("link").click();

    const fold = viewport!.height;

    const titleBox = await page.getByRole("heading", { level: 1 }).boundingBox();
    const priceBox = await page
      .getByRole("region", { name: /.*/ })
      .first()
      .locator("p")
      .filter({ hasText: /^\$/ })
      .first()
      .boundingBox();
    const galleryBox = await page.locator("main img").first().boundingBox();

    expect(titleBox!.y, "title must be above the fold").toBeLessThan(fold);
    expect(priceBox!.y, "price must be above the fold").toBeLessThan(fold);
    expect(
      priceBox!.y,
      "price must come before the main gallery image",
    ).toBeLessThan(galleryBox!.y);
  });

  test("the sticky buy bar stays visible while scrolling", async ({ page, viewport }) => {
    await page.goto("/category/mens-shirts");
    await page.getByRole("article").first().getByRole("link").click();

    const bar = page.getByRole("button", { name: /Add to cart|Out of stock/ }).last();
    await expect(bar).toBeVisible();

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(bar).toBeVisible();

    const box = await bar.boundingBox();
    expect(
      box!.y + box!.height,
      "buy bar must remain within the viewport after scrolling",
    ).toBeLessThanOrEqual(viewport!.height + 1);
  });

  test("no horizontal scroll on any catalog page", async ({ page }) => {
    for (const path of ["/", "/category/laptops"]) {
      await page.goto(path);
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth - document.documentElement.clientWidth,
      );
      expect(overflow, `${path} must not scroll sideways`).toBeLessThanOrEqual(1);
    }

    await page.goto("/category/laptops");
    await page.getByRole("article").first().getByRole("link").click();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, "product page must not scroll sideways").toBeLessThanOrEqual(1);
  });
});
