import { test, expect } from '@playwright/test';

test.describe('Meal Plan', () => {
  test.beforeEach(async ({ request }) => {
    // Reset the meal plan before each test via API
    await request.delete('/api/meal-plan');
    // Clean up any history
    const historyRes = await request.get('/api/meal-plan/history');
    const history = await historyRes.json();
    for (const plan of history) {
      await request.delete(`/api/meal-plan/history/${plan.id}`);
    }
  });

  test('shows welcome page when no start date is set', async ({ page }) => {
    await page.goto('/meals');
    await expect(page.getByText('Welcome to MealPlan')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Start Planning' })).toBeVisible();
  });

  test('can set a start date and begin planning', async ({ page }) => {
    await page.goto('/meals');
    await page.getByLabel('Start Date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Start Planning' }).click();
    await expect(page.getByRole('heading', { name: 'Add Meal' })).toBeVisible();
    await expect(page.getByText('No meals yet')).toBeVisible();
  });

  test('can add a meal', async ({ page }) => {
    await page.goto('/meals');
    await page.getByLabel('Start Date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Start Planning' }).click();
    await expect(page.getByRole('heading', { name: 'Add Meal' })).toBeVisible();

    await page.getByPlaceholder('e.g., Chicken Salad').fill('Pasta Bolognese');
    await page.getByRole('button', { name: 'Add Meal' }).click();

    await expect(page.getByText('Pasta Bolognese')).toBeVisible();
  });

  test('auto-advances current day after adding a meal', async ({ page }) => {
    await page.goto('/meals');
    await page.getByLabel('Start Date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Start Planning' }).click();

    // Add first meal
    await page.getByPlaceholder('e.g., Chicken Salad').fill('Monday Dinner');
    await page.getByRole('button', { name: 'Add Meal' }).click();
    await expect(page.getByText('Monday Dinner')).toBeVisible();

    // Add second meal (should auto-advance to next day)
    await page.getByPlaceholder('e.g., Chicken Salad').fill('Tuesday Dinner');
    await page.getByRole('button', { name: 'Add Meal' }).click();
    await expect(page.getByText('Tuesday Dinner')).toBeVisible();

    // Both meals should be visible
    await expect(page.getByText('Monday Dinner')).toBeVisible();
    await expect(page.getByText('Tuesday Dinner')).toBeVisible();
  });

  test('can delete a meal', async ({ page }) => {
    await page.goto('/meals');
    await page.getByLabel('Start Date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Start Planning' }).click();

    await page.getByPlaceholder('e.g., Chicken Salad').fill('Meal to Delete');
    await page.getByRole('button', { name: 'Add Meal' }).click();
    await expect(page.getByText('Meal to Delete')).toBeVisible();

    await page.getByLabel('Delete meal').click();
    await expect(page.getByText('Meal to Delete')).not.toBeVisible();
    await expect(page.getByText('No meals yet')).toBeVisible();
  });

  test('can reset meal plan (start new week)', async ({ page }) => {
    await page.goto('/meals');
    await page.getByLabel('Start Date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Start Planning' }).click();

    await page.getByPlaceholder('e.g., Chicken Salad').fill('Some Meal');
    await page.getByRole('button', { name: 'Add Meal' }).click();
    await expect(page.getByText('Some Meal')).toBeVisible();

    await page.getByRole('button', { name: 'Start New Week' }).click();
    await expect(page.getByText('Welcome to MealPlan')).toBeVisible();
  });

  test('can view meal plan history after reset', async ({ page }) => {
    await page.goto('/meals');
    await page.getByLabel('Start Date').fill('2026-02-09');
    await page.getByRole('button', { name: 'Start Planning' }).click();

    await page.getByPlaceholder('e.g., Chicken Salad').fill('Archived Meal');
    await page.getByRole('button', { name: 'Add Meal' }).click();
    await expect(page.getByText('Archived Meal')).toBeVisible();

    // Reset to archive
    await page.getByRole('button', { name: 'Start New Week' }).click();
    await expect(page.getByText('Welcome to MealPlan')).toBeVisible();

    // View history
    await page.getByRole('button', { name: 'View Previous Plans' }).click();
    // History items are collapsed - expand the first entry
    await page.getByText('1 day · 1 meal').click();
    await expect(page.getByText('Archived Meal')).toBeVisible();
  });
});
