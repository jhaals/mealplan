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

  test('compact header settings switch views and theme', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/shopping');
    const header = page.locator('header');
    const settings = header.getByRole('button', { name: 'Settings', exact: true });
    await expect(header.getByRole('heading', { name: 'Shopping List', exact: true })).toBeVisible();
    await expect(header.getByRole('button', { name: 'Sort', exact: true })).toBeDisabled();
    await expect(header.getByRole('button', { name: 'New List', exact: true })).toBeDisabled();
    await expect(header.getByTitle('Live', { exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Current List', exact: true })).not.toBeVisible();

    await settings.click();
    await page.getByRole('button', { name: 'Sort Prompt', exact: true }).click();
    await expect(page).toHaveURL(/view=prompt/);
    await expect(page.getByRole('textbox')).toBeVisible();
    await expect(page.locator('#header-settings')).not.toBeVisible();
    await page.reload();
    await expect(page.getByRole('textbox')).toBeVisible();

    await settings.click();
    await page.getByRole('button', { name: 'Current List', exact: true }).click();
    await expect(page.getByPlaceholder('Add item...')).toBeVisible();
    await settings.click();
    await page.getByRole('button', { name: 'Theme: System theme. Change theme.' }).click();
    await expect(page.getByRole('button', { name: 'Theme: Light theme. Change theme.' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('#header-settings')).not.toBeVisible();
    await expect(settings).toBeFocused();
    await settings.click();
    await header.getByRole('heading').click();
    await expect(page.locator('#header-settings')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
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
    for (const width of [320, 1280]) {
      await page.setViewportSize({ width, height: 800 });
      await expect(page.locator('header').getByRole('button', { name: 'Sort', exact: true })).toBeEnabled();
      await expect(page.locator('header').getByRole('button', { name: 'New List', exact: true })).toBeEnabled();
      const heading = await page.locator('header h1').boundingBox();
      const action = await page.locator('header').getByRole('button', { name: 'Sort', exact: true }).boundingBox();
      expect(Math.abs((heading!.y + heading!.height / 2) - (action!.y + action!.height / 2))).toBeLessThan(2);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
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

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('button', { name: 'History' }).click();
    // History items are collapsed - expand the first entry
    await page.getByText('1 item · 0 checked').click();
    await expect(page.getByText('History Item')).toBeVisible();
  });
});
