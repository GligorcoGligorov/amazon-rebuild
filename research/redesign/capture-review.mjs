/*
 * Walks checkout to the review step as the demo account and captures it at
 * both widths, so the resolved receipt is on record (D36).
 *   node research/redesign/capture-review.mjs <baseURL> <outDir>
 * Adds one item to the demo cart; it does not place an order.
 */
import { chromium } from "@playwright/test";

const [base, out] = process.argv.slice(2);
const browser = await chromium.launch();
for (const [width, height, scale] of [[375, 812, 2], [1280, 800, 1]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  await page.goto(base + "/sign-in", { waitUntil: "networkidle" });
  await page.getByLabel("Email").fill("demo@8xstore.dev");
  await page.getByLabel("Password").fill("demo1234");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
  await page.goto(base + "/product/blue-black-check-shirt-83", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
  await page.getByRole("dialog").waitFor();
  await page.goto(base + "/checkout", { waitUntil: "networkidle" });
  await page.getByRole("region", { name: "Delivery address" }).getByRole("link").first().click();
  await page.getByRole("link", { name: /Standard — arrives/ }).click();
  await page.getByRole("link", { name: "Use this payment method" }).click();
  await page.waitForURL(/step=review/);
  await page.waitForLoadState("networkidle");
  await page.screenshot({ path: `${out}/checkout-review-${width}.png`, fullPage: true });
  console.log("saved checkout-review", width);
  await ctx.close();
}
await browser.close();
