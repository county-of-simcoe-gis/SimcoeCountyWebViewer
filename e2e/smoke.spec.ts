import { test, expect } from '@playwright/test';

test('home renders header and map', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('img[alt="Simcoe County"]')).toBeVisible();
  await expect(page.locator('#map')).toBeVisible();
});


