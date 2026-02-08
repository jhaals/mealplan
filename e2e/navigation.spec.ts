import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('can navigate between meal plan and shopping list', async ({ page }) => {
    await page.goto('/meals');
    await expect(page.getByRole('link', { name: 'Meal Plan' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Shopping List' })).toBeVisible();

    // Navigate to shopping list
    await page.getByRole('link', { name: 'Shopping List' }).click();
    await expect(page).toHaveURL(/\/shopping/);

    // Navigate back to meal plan
    await page.getByRole('link', { name: 'Meal Plan' }).click();
    await expect(page).toHaveURL(/\/meals/);
  });

  test('redirects root to /meals', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/meals/);
  });

  test('health endpoint returns ok', async ({ request }) => {
    const response = await request.get('/health');
    expect(response.ok()).toBeTruthy();
    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
  });
});
