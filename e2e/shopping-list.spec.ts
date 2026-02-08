import { test, expect } from '@playwright/test';

test.describe('Shopping List', () => {
  test.beforeEach(async ({ request }) => {
    // Archive current list to start fresh
    await request.post('/api/shopping-list/archive');
    // Clean up history
    const historyRes = await request.get('/api/shopping-list/history');
    const history = await historyRes.json();
    for (const list of history) {
      await request.delete(`/api/shopping-list/history/${list.id}`);
    }
  });

  test('shows empty shopping list', async ({ page }) => {
    await page.goto('/shopping');
    await expect(page.getByText('Your shopping list is empty')).toBeVisible();
  });

  test('can add an item', async ({ page }) => {
    await page.goto('/shopping');
    await page.getByPlaceholder('Add item...').fill('Milk');
    await page.getByPlaceholder('Add item...').press('Enter');

    await expect(page.getByText('Milk')).toBeVisible();
  });

  test('can add multiple items', async ({ page }) => {
    await page.goto('/shopping');

    await page.getByPlaceholder('Add item...').fill('Bread');
    await page.getByPlaceholder('Add item...').press('Enter');
    await expect(page.getByText('Bread')).toBeVisible();

    await page.getByPlaceholder('Add item...').fill('Eggs');
    await page.getByPlaceholder('Add item...').press('Enter');
    await expect(page.getByText('Eggs')).toBeVisible();

    await page.getByPlaceholder('Add item...').fill('Butter');
    await page.getByPlaceholder('Add item...').press('Enter');

    await expect(page.getByText('Bread')).toBeVisible();
    await expect(page.getByText('Eggs')).toBeVisible();
    await expect(page.getByText('Butter')).toBeVisible();
  });

  test('can toggle an item as checked', async ({ page }) => {
    await page.goto('/shopping');

    await page.getByPlaceholder('Add item...').fill('Cheese');
    await page.getByPlaceholder('Add item...').press('Enter');
    await expect(page.getByText('Cheese')).toBeVisible();

    // Click the check button to check the item
    await page.getByRole('button', { name: 'Check item' }).click();
    await expect(page.getByText('1 checked item')).toBeVisible();
  });

  test('can delete an item', async ({ page }) => {
    await page.goto('/shopping');

    await page.getByPlaceholder('Add item...').fill('Item to Remove');
    await page.getByPlaceholder('Add item...').press('Enter');
    await expect(page.getByText('Item to Remove')).toBeVisible();

    await page.getByRole('button', { name: 'Delete item' }).click();
    await expect(page.getByText('Item to Remove')).not.toBeVisible();
    await expect(page.getByText('Your shopping list is empty')).toBeVisible();
  });

  test('can archive list and start new one', async ({ page }) => {
    await page.goto('/shopping');

    await page.getByPlaceholder('Add item...').fill('Archived Item');
    await page.getByPlaceholder('Add item...').press('Enter');
    await expect(page.getByText('Archived Item')).toBeVisible();

    await page.getByRole('button', { name: 'New List' }).click();
    await expect(page.getByText('Your shopping list is empty')).toBeVisible();
  });

  test('can view shopping list history', async ({ page }) => {
    await page.goto('/shopping');

    await page.getByPlaceholder('Add item...').fill('History Item');
    await page.getByPlaceholder('Add item...').press('Enter');
    await expect(page.getByText('History Item')).toBeVisible();

    // Archive to create history
    await page.getByRole('button', { name: 'New List' }).click();
    await expect(page.getByText('Your shopping list is empty')).toBeVisible();

    // Switch to history tab
    await page.getByRole('button', { name: 'History' }).click();
    // History items are collapsed - expand the first entry
    await page.getByText('1 item · 0 checked').click();
    await expect(page.getByText('History Item')).toBeVisible();
  });
});
