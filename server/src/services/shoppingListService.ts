import { prisma } from '../db';

export interface ShoppingListState {
  items: ShoppingListItem[];
  createdAt: string;
}

export interface ShoppingListItem {
  id: string;
  name: string;
  checked: boolean;
  sortOrder: number;
  createdAt: string;
}

export interface ArchivedShoppingList {
  id: string;
  items: ShoppingListItem[];
  createdAt: string;
}

/**
 * Ensure singleton ShoppingList exists
 */
async function ensureShoppingList() {
  let list = await prisma.shoppingList.findUnique({
    where: { id: 'singleton' },
  });

  if (!list) {
    list = await prisma.shoppingList.create({
      data: { id: 'singleton' },
    });
  }

  return list;
}

/**
 * Get the current shopping list with all items
 */
export async function getShoppingList(): Promise<ShoppingListState> {
  const list = await ensureShoppingList();

  const items = await prisma.shoppingListItem.findMany({
    where: { shoppingListId: 'singleton' },
    orderBy: { sortOrder: 'asc' },
  });

  return {
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      checked: item.checked,
      sortOrder: item.sortOrder,
      createdAt: item.createdAt.toISOString(),
    })),
    createdAt: list.createdAt.toISOString(),
  };
}

/**
 * Add a new item to the shopping list
 */
export async function addItem(name: string): Promise<ShoppingListItem> {
  await ensureShoppingList();

  // Get the max sortOrder to append at the end
  const maxItem = await prisma.shoppingListItem.findFirst({
    where: { shoppingListId: 'singleton' },
    orderBy: { sortOrder: 'desc' },
  });

  const nextOrder = (maxItem?.sortOrder ?? -1) + 1;

  const item = await prisma.shoppingListItem.create({
    data: {
      shoppingListId: 'singleton',
      name,
      sortOrder: nextOrder,
    },
  });

  return {
    id: item.id,
    name: item.name,
    checked: item.checked,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt.toISOString(),
  };
}

/**
 * Toggle the checked state of an item
 */
export async function toggleItem(itemId: string): Promise<ShoppingListItem> {
  const item = await prisma.shoppingListItem.findUnique({
    where: { id: itemId },
  });

  if (!item) {
    throw new Error('Item not found');
  }

  const updated = await prisma.shoppingListItem.update({
    where: { id: itemId },
    data: { checked: !item.checked },
  });

  return {
    id: updated.id,
    name: updated.name,
    checked: updated.checked,
    sortOrder: updated.sortOrder,
    createdAt: updated.createdAt.toISOString(),
  };
}

/**
 * Delete an item from the shopping list
 */
export async function deleteItem(itemId: string): Promise<void> {
  await prisma.shoppingListItem.delete({
    where: { id: itemId },
  });
}

/**
 * Reorder items in the shopping list
 */
export async function reorderItems(itemIds: string[]): Promise<void> {
  const updates = itemIds.map((id, index) =>
    prisma.shoppingListItem.update({
      where: { id },
      data: { sortOrder: index },
    })
  );

  await prisma.$transaction(updates);
}

/**
 * Archive the current list and start a new one
 */
export async function archiveAndCreateNew(): Promise<ShoppingListState> {
  const currentList = await getShoppingList();

  // Only archive if there are items
  if (currentList.items.length > 0) {
    await prisma.archivedShoppingList.create({
      data: {
        data: JSON.stringify(currentList.items),
        createdAt: new Date(currentList.createdAt),
      },
    });
  }

  // Delete all current items
  await prisma.shoppingListItem.deleteMany({
    where: { shoppingListId: 'singleton' },
  });

  // Reset the createdAt timestamp by recreating
  await prisma.shoppingList.update({
    where: { id: 'singleton' },
    data: { createdAt: new Date() },
  });

  return getShoppingList();
}

/**
 * Get archived shopping lists
 */
export async function getShoppingListHistory(): Promise<ArchivedShoppingList[]> {
  const archived = await prisma.archivedShoppingList.findMany({
    orderBy: { createdAt: 'desc' },
  });

  return archived.map((list) => {
    let items: ShoppingListItem[] = [];
    try {
      items = JSON.parse(list.data);
    } catch {
      items = [];
    }
    return {
      id: list.id,
      items,
      createdAt: list.createdAt.toISOString(),
    };
  });
}
