import { test, expect } from "@playwright/test";

test("home renders header and map", async ({ page }) => {
  await page.goto("/");

  // Wait for the loading screen to disappear before checking UI elements
  await page.waitForSelector(".loading", { state: "hidden", timeout: 30_000 }).catch(() => {
    // Loading spinner may already be gone — continue
  });

  // Header rendered — check for the burger menu button (always present, config-independent)
  await expect(page.getByRole("button", { name: "Toggle sidebar" })).toBeVisible({ timeout: 15_000 });

  // Header logo image is present (alt text varies by config, so just verify an img exists in the header)
  await expect(page.locator("div.border-b img").first()).toBeVisible({ timeout: 15_000 });

  // Map container
  await expect(page.locator("#map")).toBeVisible({ timeout: 15_000 });
});
