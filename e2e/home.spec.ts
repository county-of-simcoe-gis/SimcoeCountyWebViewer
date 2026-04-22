import { test, expect } from "@playwright/test";

test("home page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Interactive Map/i);
  // Ensure main app container renders
  await expect(page.locator("#app-root")).toBeVisible();
});
