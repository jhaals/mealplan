import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import * as todoService from '../services/todoService';
import { AppError } from '../middleware/errorHandler';
import { sseManager } from '../services/sseManager';

const todoList = new Hono();

/**
 * GET /api/todo-list/events
 * Server-Sent Events endpoint for real-time updates
 */
todoList.get('/events', async (c) => {
  return streamSSE(c, async (stream) => {
    const clientId = crypto.randomUUID();

    sseManager.addClient(clientId, stream, c.req.raw.signal);

    await stream.writeSSE({
      event: 'connected',
      data: JSON.stringify({ clientId, timestamp: new Date().toISOString() }),
    });

    while (!c.req.raw.signal.aborted) {
      await stream.sleep(3600000);
    }
  });
});

/**
 * GET /api/todo-list
 * Get current todo list (only due items)
 */
todoList.get('/', async (c) => {
  const list = await todoService.getTodoList();
  return c.json(list);
});

/**
 * GET /api/todo-list/recurring
 * Get all recurring items (including not yet due)
 */
todoList.get('/recurring', async (c) => {
  const items = await todoService.getRecurringItems();
  return c.json(items);
});

/**
 * POST /api/todo-list/items
 * Add new item
 */
todoList.post('/items', async (c) => {
  const body = await c.req.json();
  const { name, isRecurring, recurrenceInterval, recurrenceDays } = body;

  if (!name || typeof name !== 'string') {
    throw new AppError(400, 'Item name is required');
  }

  const item = await todoService.addItem(
    name.trim(),
    isRecurring ?? false,
    recurrenceInterval ?? null,
    recurrenceDays ?? null
  );
  sseManager.broadcastTodoListChange();
  return c.json(item, 201);
});

/**
 * PUT /api/todo-list/items/:itemId/toggle
 * Toggle item checked state
 */
todoList.put('/items/:itemId/toggle', async (c) => {
  const itemId = c.req.param('itemId');

  try {
    const item = await todoService.toggleItem(itemId);
    sseManager.broadcastTodoListChange();
    return c.json(item);
  } catch {
    throw new AppError(404, 'Item not found');
  }
});

/**
 * PUT /api/todo-list/items/:itemId
 * Update an item
 */
todoList.put('/items/:itemId', async (c) => {
  const itemId = c.req.param('itemId');
  const body = await c.req.json();

  try {
    const item = await todoService.updateItem(itemId, body);
    sseManager.broadcastTodoListChange();
    return c.json(item);
  } catch {
    throw new AppError(404, 'Item not found');
  }
});

/**
 * DELETE /api/todo-list/items/:itemId
 * Delete an item
 */
todoList.delete('/items/:itemId', async (c) => {
  const itemId = c.req.param('itemId');

  try {
    await todoService.deleteItem(itemId);
    sseManager.broadcastTodoListChange();
    return c.body(null, 204);
  } catch {
    throw new AppError(404, 'Item not found');
  }
});

/**
 * PUT /api/todo-list/reorder
 * Reorder items
 */
todoList.put('/reorder', async (c) => {
  const body = await c.req.json();
  const { itemIds } = body;

  if (!Array.isArray(itemIds)) {
    throw new AppError(400, 'itemIds array is required');
  }

  await todoService.reorderItems(itemIds);
  sseManager.broadcastTodoListChange();
  return c.json({ success: true });
});

/**
 * POST /api/todo-list/clear-completed
 * Clear all completed non-recurring items
 */
todoList.post('/clear-completed', async (c) => {
  await todoService.clearCompleted();
  sseManager.broadcastTodoListChange();
  return c.json({ success: true });
});

export default todoList;
