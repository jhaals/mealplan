import { Hono } from 'hono';
import * as shoppingListService from '../services/shoppingListService';
import { AppError } from '../middleware/errorHandler';

const shoppingList = new Hono();

/**
 * GET /api/shopping-list
 * Get current shopping list
 */
shoppingList.get('/', async (c) => {
  const list = await shoppingListService.getShoppingList();
  return c.json(list);
});

/**
 * POST /api/shopping-list/items
 * Add new item
 */
shoppingList.post('/items', async (c) => {
  const body = await c.req.json();
  const { name } = body;

  if (!name || typeof name !== 'string') {
    throw new AppError(400, 'Item name is required');
  }

  const item = await shoppingListService.addItem(name.trim());
  return c.json(item, 201);
});

/**
 * PUT /api/shopping-list/items/:itemId/toggle
 * Toggle item checked state
 */
shoppingList.put('/items/:itemId/toggle', async (c) => {
  const itemId = c.req.param('itemId');

  try {
    const item = await shoppingListService.toggleItem(itemId);
    return c.json(item);
  } catch {
    throw new AppError(404, 'Item not found');
  }
});

/**
 * DELETE /api/shopping-list/items/:itemId
 * Delete an item
 */
shoppingList.delete('/items/:itemId', async (c) => {
  const itemId = c.req.param('itemId');

  try {
    await shoppingListService.deleteItem(itemId);
    return c.body(null, 204);
  } catch {
    throw new AppError(404, 'Item not found');
  }
});

/**
 * PUT /api/shopping-list/reorder
 * Reorder items
 */
shoppingList.put('/reorder', async (c) => {
  const body = await c.req.json();
  const { itemIds } = body;

  if (!Array.isArray(itemIds)) {
    throw new AppError(400, 'itemIds array is required');
  }

  await shoppingListService.reorderItems(itemIds);
  return c.json({ success: true });
});

/**
 * POST /api/shopping-list/archive
 * Archive current list and start a new one
 */
shoppingList.post('/archive', async (c) => {
  const list = await shoppingListService.archiveAndCreateNew();
  return c.json(list);
});

/**
 * GET /api/shopping-list/history
 * Get archived shopping lists
 */
shoppingList.get('/history', async (c) => {
  const history = await shoppingListService.getShoppingListHistory();
  return c.json(history);
});

/**
 * DELETE /api/shopping-list/history/:id
 * Delete an archived shopping list
 */
shoppingList.delete('/history/:id', async (c) => {
  const id = c.req.param('id');
  try {
    await shoppingListService.deleteArchivedShoppingList(id);
    return c.body(null, 204);
  } catch (e: unknown) {
    if (e && typeof e === 'object' && 'code' in e && e.code === 'P2025') {
      throw new AppError(404, 'Archived shopping list not found');
    }
    throw e;
  }
});

/**
 * POST /api/shopping-list/sort
 * Sort shopping list items using AI
 */
shoppingList.post('/sort', async (c) => {
  await shoppingListService.sortItemsWithAI();
  return c.json({ success: true });
});

/**
 * GET /api/shopping-list/config
 * Get shopping list configuration (custom sorting prompt)
 */
shoppingList.get('/config', async (c) => {
  const config = await shoppingListService.getConfig();
  return c.json(config);
});

/**
 * PUT /api/shopping-list/config
 * Update shopping list configuration (custom sorting prompt)
 */
shoppingList.put('/config', async (c) => {
  const body = await c.req.json();
  const { sortingPrompt } = body;

  // Validate: must be null or non-empty string
  if (sortingPrompt !== null && (typeof sortingPrompt !== 'string' || sortingPrompt.trim() === '')) {
    return c.json({ error: 'sortingPrompt must be null or a non-empty string' }, 400);
  }

  await shoppingListService.updateConfig(sortingPrompt);
  return c.json({ success: true });
});

/**
 * GET /api/shopping-list/config/default-prompt
 * Get the default sorting prompt (for reference in UI)
 */
shoppingList.get('/config/default-prompt', async (c) => {
  const { DEFAULT_SORTING_PROMPT } = await import('../services/geminiService');
  return c.json({ defaultPrompt: DEFAULT_SORTING_PROMPT });
});

export default shoppingList;
