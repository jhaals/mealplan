import { test, expect } from '@playwright/test';

test.describe('Todo Descriptions', () => {
  test.beforeEach(async ({ request }) => {
    // Start from an empty list — remove every existing item
    const res = await request.get('/api/todo-list');
    const list = await res.json();
    for (const item of list.items) {
      await request.delete(`/api/todo-list/items/${item.id}`);
    }
  });

  test('can expand a task without a description and add one', async ({ page }) => {
    await page.goto('/todos');

    await page.getByPlaceholder('Add task...').fill('Water the plants');
    await page.getByPlaceholder('Add task...').press('Enter');
    await expect(page.getByText('Water the plants')).toBeVisible();

    // The description editor stays closed until the title is clicked
    await expect(page.getByLabel('Task description')).toBeHidden();

    await page.getByRole('button', { name: 'Water the plants' }).click();

    const description = page.getByLabel('Task description');
    await expect(description).toBeVisible();
    await expect(description).toHaveValue('');

    await description.fill('Only the ones on the balcony');

    // Clicking the title again saves and collapses
    await page.getByRole('button', { name: 'Water the plants' }).click();
    await expect(page.getByLabel('Task description')).toBeHidden();

    // Reopening shows the saved description as rendered text
    await page.getByRole('button', { name: 'Water the plants' }).click();
    await expect(page.getByText('Only the ones on the balcony')).toBeVisible();

    // Clicking that text returns to the editor
    await page.getByText('Only the ones on the balcony').click();
    await expect(page.getByLabel('Task description')).toHaveValue(
      'Only the ones on the balcony'
    );
  });

  test('description persists across a page reload', async ({ page }) => {
    await page.goto('/todos');

    await page.getByPlaceholder('Add task...').fill('Book dentist');
    await page.getByPlaceholder('Add task...').press('Enter');

    await page.getByRole('button', { name: 'Book dentist' }).click();
    await page.getByLabel('Task description').fill('Ask about the night guard');
    // Blur commits and drops back to the rendered view, staying expanded
    await page.getByLabel('Task description').blur();
    await expect(page.getByText('Ask about the night guard')).toBeVisible();

    await page.reload();

    await page.getByRole('button', { name: 'Book dentist' }).click();
    await expect(page.getByText('Ask about the night guard')).toBeVisible();
  });

  test('collapses without saving when Escape is pressed', async ({ page }) => {
    await page.goto('/todos');

    await page.getByPlaceholder('Add task...').fill('Renew passport');
    await page.getByPlaceholder('Add task...').press('Enter');

    await page.getByRole('button', { name: 'Renew passport' }).click();
    await page.getByLabel('Task description').fill('discarded text');
    await page.getByLabel('Task description').press('Escape');

    await expect(page.getByLabel('Task description')).toBeHidden();

    await page.getByRole('button', { name: 'Renew passport' }).click();
    await expect(page.getByLabel('Task description')).toHaveValue('');
  });

  test('clearing a description removes it', async ({ page }) => {
    await page.goto('/todos');

    await page.getByPlaceholder('Add task...').fill('Return library books');
    await page.getByPlaceholder('Add task...').press('Enter');

    await page.getByRole('button', { name: 'Return library books' }).click();
    await page.getByLabel('Task description').fill('Due Friday');
    await page.getByRole('button', { name: 'Return library books' }).click();

    // Reopen, edit, and clear it out
    await page.getByRole('button', { name: 'Return library books' }).click();
    await page.getByText('Due Friday').click();
    await page.getByLabel('Task description').fill('');
    await page.getByRole('button', { name: 'Return library books' }).click();

    // With no description left, reopening goes straight back to the editor
    await page.getByRole('button', { name: 'Return library books' }).click();
    await expect(page.getByLabel('Task description')).toHaveValue('');
  });

  test('can add a description while creating a task', async ({ page }) => {
    await page.goto('/todos');

    // The field is opt-in, so quick-add stays a single field by default
    await expect(page.getByLabel('New task description')).toBeHidden();
    await page.getByRole('button', { name: 'Description' }).click();

    const newDescription = page.getByLabel('New task description');
    await expect(newDescription).toBeVisible();

    await page.getByPlaceholder('Add task...').fill('Call the plumber');
    await newDescription.fill('Leaking pipe under the sink');
    await page.getByPlaceholder('Add task...').press('Enter');

    await expect(page.getByText('Call the plumber')).toBeVisible();

    // The form resets: field collapses and clears for the next task
    await expect(page.getByLabel('New task description')).toBeHidden();

    // And the description was saved with the new task
    await page.getByRole('button', { name: 'Call the plumber' }).click();
    await expect(page.getByText('Leaking pipe under the sink')).toBeVisible();
  });

  test('creating a task without a description leaves it empty', async ({ page }) => {
    await page.goto('/todos');

    await page.getByPlaceholder('Add task...').fill('Take out the bins');
    await page.getByPlaceholder('Add task...').press('Enter');
    await expect(page.getByText('Take out the bins')).toBeVisible();

    // No description means expanding opens straight into the editor, empty
    await page.getByRole('button', { name: 'Take out the bins' }).click();
    await expect(page.getByLabel('Task description')).toHaveValue('');
  });

  test('renders URLs in a description as clickable links', async ({ page }) => {
    await page.goto('/todos');

    await page.getByPlaceholder('Add task...').fill('Read the docs');
    await page.getByPlaceholder('Add task...').press('Enter');

    await page.getByRole('button', { name: 'Read the docs' }).click();
    await page
      .getByLabel('Task description')
      .fill('Start at https://example.com/guide, then the rest.');
    await page.getByLabel('Task description').blur();

    const link = page.getByRole('link', { name: 'https://example.com/guide' });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute('href', 'https://example.com/guide');
    await expect(link).toHaveAttribute('target', '_blank');
    await expect(link).toHaveAttribute('rel', /noopener/);

    // The trailing comma belongs to the sentence, not the URL
    await expect(page.getByText(', then the rest.')).toBeVisible();
  });

  test('does not linkify non-http schemes', async ({ page }) => {
    await page.goto('/todos');

    await page.getByPlaceholder('Add task...').fill('Scheme check');
    await page.getByPlaceholder('Add task...').press('Enter');

    await page.getByRole('button', { name: 'Scheme check' }).click();
    await page
      .getByLabel('Task description')
      .fill('javascript:alert(1) and file:///etc/passwd');
    await page.getByLabel('Task description').blur();

    await expect(
      page.getByText('javascript:alert(1) and file:///etc/passwd')
    ).toBeVisible();
    // Rendered as plain text — no anchor is produced for either scheme
    const item = page.locator('li').filter({ hasText: 'Scheme check' });
    await expect(item.locator('a')).toHaveCount(0);
  });
});
