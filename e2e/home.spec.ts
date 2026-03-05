import { test, expect } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Web Viewer/i);
  // Ensure main app container renders
  await expect(page.locator("#app-root")).toBeVisible();
});
