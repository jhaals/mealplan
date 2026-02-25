import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import * as shoppingListService from '../services/shoppingListService';
import { AppError } from '../middleware/errorHandler';
import { sseManager } from '../services/sseManager';

const shoppingList = new Hono();

/**
 * GET /api/shopping-list/events
 * Server-Sent Events endpoint for real-time updates
 */
shoppingList.get('/events', async (c) => {
  return streamSSE(c, async (stream) => {
    const clientId = crypto.randomUUID();

    // Add client to manager
    sseManager.addClient(clientId, stream, c.req.raw.signal);

    // Send initial connection success event
    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ clientId, timestamp: new Date().toISOString() }),
    });

    // Keep connection open - manager handles keep-alive and broadcasts
    // Connection closes when client disconnects (AbortSignal fires)
    // Use a loop with reasonable sleep intervals (1 hour) to avoid timeout overflow
    while (!c.req.raw.signal.aborted) {
      await stream.sleep(3600000); // 1 hour in milliseconds
    }
  });
});

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
  sseManager.broadcastShoppingListChange();
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
    sseManager.broadcastShoppingListChange();
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
    sseManager.broadcastShoppingListChange();
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
  sseManager.broadcastShoppingListChange();
  return c.json({ success: true });
});

/**
 * POST /api/shopping-list/archive
 * Archive current list and start a new one
 */
shoppingList.post('/archive', async (c) => {
  const list = await shoppingListService.archiveAndCreateNew();
  sseManager.broadcastShoppingListChange();
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
  sseManager.broadcastShoppingListChange();
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
