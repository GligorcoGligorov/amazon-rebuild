/*
 * Captures the store at 375px and 1280px for the redesign record (D36).
 *   node research/redesign/capture.mjs <baseURL> <outDir> [name,name,…]
 * The optional list limits which shots are taken (home, design-system,
 * category, search, product, drawer, cart, sign-in, checkout, account, orders).
 * Signs in with the demo account for the checkout and account pages.
 */
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const [base, out, only] = process.argv.slice(2);
const wanted = (name) => !only || only.split(",").includes(name);
mkdirSync(out, { recursive: true });
const PRODUCT = "/product/blue-black-check-shirt-83";

const browser = await chromium.launch();
for (const [width, height, scale] of [[375, 812, 2], [1280, 800, 1]]) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale });
  const page = await ctx.newPage();
  const shot = async (name, full = true) => {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 60));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForLoadState("networkidle");
    await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: full });
    console.log("saved", name, width);
  };
  const visit = async (path, name) => {
    if (!wanted(name)) return;
    try {
      await page.goto(base + path, { waitUntil: "networkidle" });
      await shot(name);
    } catch (e) {
      console.log("FAILED", name, width, e.message.split("\n")[0]);
    }
  };

  await visit("/", "home");
  await visit("/design-system", "design-system");
  await visit("/category/laptops", "category");
  await visit("/search?q=watch", "search");
  if (wanted("product") || wanted("drawer")) await page.goto(base + PRODUCT, { waitUntil: "networkidle" });
  await visit(PRODUCT, "product");
  if (wanted("drawer")) try {
    await page.getByRole("button", { name: "Add to cart", exact: true }).first().click();
    await page.getByRole("dialog").waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${out}/drawer-${width}.png` });
    console.log("saved drawer", width);
  } catch (e) {
    console.log("FAILED drawer", width, e.message.split("\n")[0]);
  }
  await visit("/cart", "cart");
  await visit("/sign-in", "sign-in");
  if (["checkout", "account", "orders"].some(wanted)) try {
    await page.goto(base + "/sign-in", { waitUntil: "networkidle" });
    await page.getByLabel("Email").fill("demo@8xstore.dev");
    await page.getByLabel("Password").fill("demo1234");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"));
  } catch (e) {
    console.log("FAILED sign-in", width, e.message.split("\n")[0]);
  }
  await visit("/checkout", "checkout");
  await visit("/account", "account");
  await visit("/orders", "orders");
  await ctx.close();
}
await browser.close();
