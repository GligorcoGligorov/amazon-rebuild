import { defineConfig, devices } from "@playwright/test";
import { config } from "dotenv";

config({ path: ".env.local" });

// Point at a deployed URL to run the same specs against it:
//   E2E_BASE_URL=https://… pnpm test:e2e
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const isRemote = Boolean(process.env.E2E_BASE_URL);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },

  // Every flow spec runs at both widths. Mobile is first because it is the
  // primary, judged experience — a failure there should be the first thing read.
  //
  // Both projects run on Chromium. The iPhone descriptor gives us the viewport,
  // touch and mobile UA, but its default engine is WebKit, and carrying a second
  // browser download costs more on every run than it buys: what these specs
  // assert is layout and behaviour at a width, not engine-specific rendering.
  projects: [
    {
      name: "mobile-375",
      use: {
        ...devices["iPhone 13"],
        browserName: "chromium",
        viewport: { width: 375, height: 812 },
      },
    },
    {
      name: "desktop-1280",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } },
    },
  ],

  webServer: isRemote
    ? undefined
    : {
        command: "pnpm build && pnpm start",
        url: "http://localhost:3000",
        reuseExistingServer: !process.env.CI,
        timeout: 180_000,
      },
});
