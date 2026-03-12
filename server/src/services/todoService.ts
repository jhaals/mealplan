import { prisma } from '../db';
import { addDays, format } from 'date-fns';

export interface TodoListState {
  items: TodoItemResponse[];
  createdAt: string;
}

export interface TodoItemResponse {
  id: string;
  name: string;
  checked: boolean;
  sortOrder: number;
  isRecurring: boolean;
  recurrenceInterval: string | null;
  recurrenceDays: number | null;
  nextDueDate: string | null;
  lastCompletedAt: string | null;
  createdAt: string;
}

/**
 * Ensure singleton TodoList exists
 */
async function ensureTodoList() {
  let list = await prisma.todoList.findUnique({
    where: { id: 'singleton' },
  });

  if (!list) {
    list = await prisma.todoList.create({
      data: { id: 'singleton' },
    });
  }

  return list;
}

function mapItem(item: {
  id: string;
  name: string;
  checked: boolean;
  sortOrder: number;
  isRecurring: boolean;
  recurrenceInterval: string | null;
  recurrenceDays: number | null;
  nextDueDate: string | null;
  lastCompletedAt: Date | null;
  createdAt: Date;
}): TodoItemResponse {
  return {
    id: item.id,
    name: item.name,
    checked: item.checked,
    sortOrder: item.sortOrder,
    isRecurring: item.isRecurring,
    recurrenceInterval: item.recurrenceInterval,
    recurrenceDays: item.recurrenceDays,
    nextDueDate: item.nextDueDate,
    lastCompletedAt: item.lastCompletedAt?.toISOString() ?? null,
    createdAt: item.createdAt.toISOString(),
  };
}

/**
 * Get the current todo list with items that are due (or non-recurring)
 */
export async function getTodoList(): Promise<TodoListState> {
  const list = await ensureTodoList();

  const today = format(new Date(), 'yyyy-MM-dd');

  const items = await prisma.todoItem.findMany({
    where: {
      todoListId: 'singleton',
      OR: [
        // Non-recurring items always show
        { isRecurring: false },
        // Recurring items that are due (nextDueDate <= today) or have no due date set
        {
          isRecurring: true,
          OR: [
            { nextDueDate: null },
            { nextDueDate: { lte: today } },
          ],
        },
      ],
    },
    orderBy: { sortOrder: 'asc' },
  });

  return {
    items: items.map(mapItem),
    createdAt: list.createdAt.toISOString(),
  };
}

/**
 * Get all recurring items (including those not yet due)
 */
export async function getRecurringItems(): Promise<TodoItemResponse[]> {
  await ensureTodoList();

  const items = await prisma.todoItem.findMany({
    where: {
      todoListId: 'singleton',
      isRecurring: true,
    },
    orderBy: { sortOrder: 'asc' },
  });

  return items.map(mapItem);
}

/**
 * Calculate next due date based on recurrence settings
 */
function calculateNextDueDate(
  recurrenceInterval: string,
  recurrenceDays: number | null,
  fromDate?: Date
): string {
  const base = fromDate ?? new Date();
  let nextDate: Date;

  switch (recurrenceInterval) {
    case 'daily':
      nextDate = addDays(base, 1);
      break;
    case 'weekly':
      nextDate = addDays(base, 7);
      break;
    case 'monthly':
      nextDate = addDays(base, 30);
      break;
    case 'custom':
      nextDate = addDays(base, recurrenceDays ?? 7);
      break;
    default:
      nextDate = addDays(base, 7);
  }

  return format(nextDate, 'yyyy-MM-dd');
}

/**
 * Add a new item to the todo list
 */
export async function addItem(
  name: string,
  isRecurring: boolean = false,
  recurrenceInterval: string | null = null,
  recurrenceDays: number | null = null
): Promise<TodoItemResponse> {
  await ensureTodoList();

  const maxItem = await prisma.todoItem.findFirst({
    where: { todoListId: 'singleton' },
    orderBy: { sortOrder: 'desc' },
  });

  const nextOrder = (maxItem?.sortOrder ?? -1) + 1;

  let nextDueDate: string | null = null;
  if (isRecurring && recurrenceInterval) {
    // Set initial due date to today (task is immediately due)
    nextDueDate = format(new Date(), 'yyyy-MM-dd');
  }

  const item = await prisma.todoItem.create({
    data: {
      todoListId: 'singleton',
      name,
      sortOrder: nextOrder,
      isRecurring,
      recurrenceInterval,
      recurrenceDays,
      nextDueDate,
    },
  });

  return mapItem(item);
}

/**
 * Toggle the checked state of an item.
 * For recurring items, completing them schedules the next occurrence.
 */
export async function toggleItem(itemId: string): Promise<TodoItemResponse> {
  const item = await prisma.todoItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  const newChecked = !item.checked;

  // For recurring items being checked (completed), schedule next occurrence
  if (item.isRecurring && newChecked && item.recurrenceInterval) {
    const nextDueDate = calculateNextDueDate(
      item.recurrenceInterval,
      item.recurrenceDays
    );

    const updated = await prisma.todoItem.update({
      where: { id: itemId },
      data: {
        checked: false, // Reset to unchecked for next occurrence
        lastCompletedAt: new Date(),
        nextDueDate,
      },
    });

    return mapItem(updated);
  }

  // Non-recurring items just toggle
  const updated = await prisma.todoItem.update({
    where: { id: itemId },
    data: { checked: newChecked },
  });

  return mapItem(updated);
}

/**
 * Delete an item from the todo list
 */
export async function deleteItem(itemId: string): Promise<void> {
  await prisma.todoItem.delete({
    where: { id: itemId },
  });
}

/**
 * Clear all completed (checked) non-recurring items
 */
export async function clearCompleted(): Promise<void> {
  await prisma.todoItem.deleteMany({
    where: {
      todoListId: 'singleton',
      checked: true,
      isRecurring: false,
    },
  });
}

/**
 * Reorder items in the todo list
 */
export async function reorderItems(itemIds: string[]): Promise<void> {
  const updates = itemIds.map((id, index) =>
    prisma.todoItem.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(updates);
}

/**
 * Update a todo item (name, recurrence settings)
 */
export async function updateItem(
  itemId: string,
  data: {
    name?: string;
    isRecurring?: boolean;
    recurrenceInterval?: string | null;
    recurrenceDays?: number | null;
  }
): Promise<TodoItemResponse> {
  const item = await prisma.todoItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  const updateData: Record<string, unknown> = {};

  if (data.name !== undefined) {
    updateData.name = data.name;
  }

  if (data.isRecurring !== undefined) {
    updateData.isRecurring = data.isRecurring;

    if (data.isRecurring) {
      const interval = data.recurrenceInterval ?? item.recurrenceInterval ?? 'weekly';
      const days = data.recurrenceDays ?? item.recurrenceDays;
      updateData.recurrenceInterval = interval;
      updateData.recurrenceDays = days;

      // If becoming recurring and no due date, set to today
      if (!item.nextDueDate) {
        updateData.nextDueDate = format(new Date(), 'yyyy-MM-dd');
      }
    } else {
      // If becoming non-recurring, clear recurrence fields
      updateData.recurrenceInterval = null;
      updateData.recurrenceDays = null;
      updateData.nextDueDate = null;
      updateData.lastCompletedAt = null;
    }
  }

  if (data.recurrenceInterval !== undefined) {
    updateData.recurrenceInterval = data.recurrenceInterval;
  }

  if (data.recurrenceDays !== undefined) {
    updateData.recurrenceDays = data.recurrenceDays;
  }

  const updated = await prisma.todoItem.update({
    where: { id: itemId },
    data: updateData,
  });

  return mapItem(updated);
}
