import { test, expect } from "@playwright/test";

test.describe("search", () => {
  test("a shopper can find a specific product from the home page", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("searchbox", { name: "Search products" }).fill("macbook");
    await page.getByRole("button", { name: "Search" }).click();

    await expect(page).toHaveURL(/\/search\?q=macbook/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("macbook");

    const firstCard = page.getByRole("article").first();
    await expect(firstCard).toContainText(/MacBook/i);

    await firstCard.getByRole("link").first().click();
    await expect(page).toHaveURL(/\/product\//);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/MacBook/i);
  });

  test("results are stated as a count, with no sponsored rows", async ({ page }) => {
    await page.goto("/search?q=watch");

    const count = await page.getByRole("article").count();
    expect(count).toBeGreaterThan(0);
    await expect(page.getByText(`${count} products`)).toBeVisible();

    // D10: no ad slots anywhere, ever.
    await expect(page.getByText(/sponsored/i)).toHaveCount(0);
  });

  test("results contain no duplicate products", async ({ page }) => {
    await page.goto("/search");

    // One row per product, never one per variant — the grid aggregates.
    const hrefs = await page
      .getByRole("article")
      .getByRole("link")
      .evaluateAll((els) => els.map((e) => (e as HTMLAnchorElement).pathname));
    expect(hrefs.length).toBeGreaterThan(0);
    expect(new Set(hrefs).size, "every result must be a distinct product").toBe(
      hrefs.length,
    );
  });

  test("filtering by category narrows the results and shows a removable chip", async ({
    page,
  }) => {
    await page.goto("/search");
    const before = await page.getByRole("article").count();

    await page
      .getByRole("navigation", { name: "Category" })
      .getByRole("link", { name: /^Laptops/ })
      .click();

    await expect(page).toHaveURL(/category=laptops/);
    const after = await page.getByRole("article").count();
    expect(after).toBeLessThan(before);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Laptops");

    // Amazon shows an applied filter only as a ticked box. Ours is a chip you
    // can remove in one click.
    const chip = page.getByRole("link", { name: /Laptops.*remove this filter/ });
    await expect(chip).toBeVisible();
    await chip.click();

    await expect(page).not.toHaveURL(/category=/);
    expect(await page.getByRole("article").count()).toBe(before);
  });

  test("sorting by price actually orders the results", async ({ page }) => {
    await page.goto("/search?sort=price-asc");

    const prices = await page
      .getByRole("article")
      .evaluateAll((cards) =>
        cards.map((c) => {
          const text = c.textContent ?? "";
          const match = text.match(/\$([\d,]+\.\d{2})/);
          return match ? Number(match[1].replace(/,/g, "")) : NaN;
        }),
      );

    expect(prices.length).toBeGreaterThan(1);
    expect(prices.some(Number.isNaN)).toBe(false);
    const sorted = [...prices].sort((a, b) => a - b);
    expect(prices).toEqual(sorted);
  });

  test("filters and sort compose, and survive reload and the back button", async ({
    page,
  }) => {
    await page.goto("/search?q=watch&category=mens-watches&sort=price-desc");

    const composed = page.url();
    const count = await page.getByRole("article").count();
    expect(count).toBeGreaterThan(0);

    await page.reload();
    await expect(page).toHaveURL(composed);
    expect(await page.getByRole("article").count()).toBe(count);
    await expect(page.getByRole("link", { name: "Price: high to low" })).toHaveAttribute(
      "aria-current",
      "true",
    );

    await page.goto("/search?q=watch");
    await page.goBack();
    // Retrying assertion: goBack() can resolve before the URL settles.
    await expect(page).toHaveURL(composed);
  });

  test("a search with no matches offers a way out", async ({ page }) => {
    await page.goto("/search?q=zzzznotathing");

    await expect(page.getByText("0 products")).toBeVisible();
    await expect(page.getByText(/Nothing matched/)).toBeVisible();
    await expect(page.getByRole("link", { name: "Browse categories" })).toBeVisible();

    await page.getByRole("link", { name: "Browse categories" }).click();
    await expect(page).toHaveURL(/\/$/);
  });

  test("an empty-in-this-category search offers the wider search", async ({ page }) => {
    await page.goto("/search?q=macbook&category=sunglasses");

    await expect(page.getByText("0 products")).toBeVisible();
    const wider = page.getByRole("link", { name: "Search all categories" });
    await expect(wider).toBeVisible();

    await wider.click();
    await expect(page).toHaveURL(/q=macbook/);
    await expect(page).not.toHaveURL(/category=/);
    expect(await page.getByRole("article").count()).toBeGreaterThan(0);
  });

  test("filters and sort are reachable and operable by keyboard", async ({ page }) => {
    await page.goto("/search?q=watch");

    const facet = page
      .getByRole("navigation", { name: "Category" })
      .getByRole("link", { name: /^Men's Watches/ });
    await facet.focus();
    await expect(facet).toBeFocused();

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/category=mens-watches/);

    const chip = page.getByRole("link", { name: /remove this filter/ }).first();
    await chip.focus();
    await expect(chip).toBeFocused();
  });

  test("the search box keeps the query so it can be edited", async ({ page }) => {
    await page.goto("/");
    const box = page.getByRole("searchbox", { name: "Search products" });

    await box.fill("shirt");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=shirt/);

    // It used to empty itself, forcing a retype.
    await expect(box).toHaveValue("shirt");

    // And it is editable from there, not just populated.
    await box.fill("shirts blue");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=shirts\+blue/);
    await expect(box).toHaveValue("shirts blue");
  });

  test("plurals, brands and category names all match", async ({ page }) => {
    // Plural → singular: substring already handles the other direction.
    // A product can match on its category name, so assert that the right
    // category is represented rather than that the word is in the card.
    for (const [query, category] of [
      ["watches", /Watches/],
      ["bags", /Bags/],
      ["sunglasses", /Sunglasses/],
    ] as const) {
      await page.goto(`/search?q=${query}`);
      expect(
        await page.getByRole("article").count(),
        `"${query}" must return results`,
      ).toBeGreaterThan(0);
      await expect(
        page
          .getByRole("navigation", { name: "Category" })
          .getByRole("link", { name: category })
          .first(), // "Watches" matches both men's and women's
      ).toBeVisible();
    }

    // Brand.
    await page.goto("/search?q=apple");
    expect(await page.getByRole("article").count()).toBeGreaterThan(0);
    await expect(page.getByRole("article").first()).toContainText(/apple/i);

    // Category name — no product is titled "Laptops".
    await page.goto("/search?q=laptops");
    expect(await page.getByRole("article").count()).toBeGreaterThan(0);
    await expect(
      page.getByRole("navigation", { name: "Category" }).getByRole("link", {
        name: /^Laptops/,
      }),
    ).toBeVisible();

    // Multiple words narrow rather than widen.
    const broad = await page.goto("/search?q=apple").then(() => page.getByRole("article").count());
    const narrow = await page
      .goto("/search?q=apple+watch")
      .then(() => page.getByRole("article").count());
    expect(narrow).toBeLessThan(broad);
  });

  test("a category filter with no query is named in the heading", async ({ page }) => {
    await page.goto("/search?category=womens-bags");

    // It used to say "All products" while showing only one category.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Women's Bags");
    await expect(page.getByRole("heading", { level: 1 })).not.toHaveText("All products");

    // The unfiltered page still says "All products".
    await page.goto("/search");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("All products");
  });

  test("no horizontal scroll on the search page", async ({ page }) => {
    await page.goto("/search?q=watch&category=mens-watches");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

/**
 * Search, filters and sort are URL state and plain links and forms, so they
 * must work with JavaScript off. This caught a real regression: making the
 * search box a Client Component briefly left the pre-hydration fallback with
 * no input at all.
 */
test.describe("search without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("the form, filters and sort all still work", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("searchbox", { name: "Search products" }).fill("watch");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page).toHaveURL(/q=watch/);
    expect(await page.getByRole("article").count()).toBeGreaterThan(0);

    await page
      .getByRole("navigation", { name: "Category" })
      .getByRole("link", { name: /^Men's Watches/ })
      .click();
    await expect(page).toHaveURL(/category=mens-watches/);

    await page.getByRole("link", { name: "Price: low to high" }).click();
    await expect(page).toHaveURL(/sort=price-asc/);
    await expect(page).toHaveURL(/q=watch/);
    await expect(page).toHaveURL(/category=mens-watches/);
  });
});
