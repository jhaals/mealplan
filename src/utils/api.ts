import type { MealPlanState, Meal } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let errorMessage = `HTTP error ${response.status}`;
    try {
      const errorData = await response.json();
      errorMessage = errorData.error?.message || errorMessage;
    } catch {
      // Ignore JSON parsing errors
    }
    throw new ApiError(response.status, errorMessage);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

/**
 * Get the complete meal plan
 */
export async function getMealPlan(): Promise<MealPlanState> {
  return fetchJSON<MealPlanState>('/api/meal-plan');
}

/**
 * Set the start date for the meal plan
 */
export async function setStartDate(startDate: string): Promise<MealPlanState> {
  return fetchJSON<MealPlanState>('/api/meal-plan/start-date', {
    method: 'PUT',
    body: JSON.stringify({ startDate }),
  });
}

/**
 * Add a new meal
 */
export async function addMeal(name: string, day?: string): Promise<Meal> {
  return fetchJSON<Meal>('/api/meal-plan/meals', {
    method: 'POST',
    body: JSON.stringify({ name, day }),
  });
}

/**
 * Delete a meal
 */
export async function deleteMeal(mealId: string, day: string): Promise<void> {
  return fetchJSON<void>(`/api/meal-plan/meals/${mealId}?day=${encodeURIComponent(day)}`, {
    method: 'DELETE',
  });
}

/**
 * Move a meal from one day to another
 */
export async function moveMeal(
  mealId: string,
  sourceDay: string,
  targetDay: string
): Promise<void> {
  return fetchJSON<void>(`/api/meal-plan/meals/${mealId}/move`, {
    method: 'PUT',
    body: JSON.stringify({ sourceDay, targetDay }),
  });
}

/**
 * Swap two meals between days
 */
export async function swapMeals(
  meal1Id: string,
  meal1Day: string,
  meal2Id: string,
  meal2Day: string
): Promise<void> {
  return fetchJSON<void>('/api/meal-plan/meals/swap', {
    method: 'PUT',
    body: JSON.stringify({ meal1Id, meal1Day, meal2Id, meal2Day }),
  });
}

/**
 * Reset the entire meal plan
 */
export async function resetMealPlan(): Promise<void> {
  return fetchJSON<void>('/api/meal-plan', {
    method: 'DELETE',
  });
}

/**
 * Get archived meal plan history
 */
export async function getMealPlanHistory(): Promise<ArchivedMealPlan[]> {
  return fetchJSON<ArchivedMealPlan[]>('/api/meal-plan/history');
}

/**
 * Delete an archived meal plan
 */
export async function deleteArchivedMealPlan(id: string): Promise<void> {
  return fetchJSON<void>(`/api/meal-plan/history/${id}`, {
    method: 'DELETE',
  });
}

export interface ArchivedMealPlan {
  id: string;
  startDate: string;
  endDate: string;
  days: { date: string; meals: { id: string; name: string; createdAt: string }[] }[];
  createdAt: string;
}

// ========== Shopping List API ==========

import type { ShoppingListState, ShoppingListItem, ArchivedShoppingList } from '../types';

/**
 * Get the current shopping list
 */
export async function getShoppingList(): Promise<ShoppingListState> {
  return fetchJSON<ShoppingListState>('/api/shopping-list');
}

/**
 * Add an item to the shopping list
 */
export async function addShoppingItem(name: string): Promise<ShoppingListItem> {
  return fetchJSON<ShoppingListItem>('/api/shopping-list/items', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });
}

/**
 * Toggle an item's checked state
 */
export async function toggleShoppingItem(itemId: string): Promise<ShoppingListItem> {
  return fetchJSON<ShoppingListItem>(`/api/shopping-list/items/${itemId}/toggle`, {
    method: 'PUT',
  });
}

/**
 * Delete an item from the shopping list
 */
export async function deleteShoppingItem(itemId: string): Promise<void> {
  return fetchJSON<void>(`/api/shopping-list/items/${itemId}`, {
    method: 'DELETE',
  });
}

/**
 * Reorder items in the shopping list
 */
export async function reorderShoppingItems(itemIds: string[]): Promise<void> {
  return fetchJSON<void>('/api/shopping-list/reorder', {
    method: 'PUT',
    body: JSON.stringify({ itemIds }),
  });
}

/**
 * Archive current list and start a new one
 */
export async function archiveShoppingList(): Promise<ShoppingListState> {
  return fetchJSON<ShoppingListState>('/api/shopping-list/archive', {
    method: 'POST',
  });
}

/**
 * Get archived shopping list history
 */
export async function getShoppingListHistory(): Promise<ArchivedShoppingList[]> {
  return fetchJSON<ArchivedShoppingList[]>('/api/shopping-list/history');
}

/**
 * Delete an archived shopping list
 */
export async function deleteArchivedShoppingList(id: string): Promise<void> {
  return fetchJSON<void>(`/api/shopping-list/history/${id}`, {
    method: 'DELETE',
  });
}

// ========== TRMNL API ==========

export interface TRMNLPushResponse {
  success: boolean;
  message?: string;
  error?: string;
  pushedAt?: string;
}

export interface TRMNLConfig {
  enabled: boolean;
  hasWebhookUrl: boolean;
}

/**
 * Push meal plan to TRMNL device (manual force push)
 */
export async function pushToTRMNL(): Promise<TRMNLPushResponse> {
  return fetchJSON<TRMNLPushResponse>('/api/trmnl/push', {
    method: 'POST',
  });
}

/**
 * Get TRMNL configuration status
 */
export async function getTRMNLConfig(): Promise<TRMNLConfig> {
  return fetchJSON<TRMNLConfig>('/api/trmnl/config');
}

export interface TRMNLStatus {
  lastPushAt: string | null;
  lastPushError: string | null;
  hasPushed: boolean;
}

/**
 * Get TRMNL push status
 */
export async function getTRMNLStatus(): Promise<TRMNLStatus> {
  return fetchJSON<TRMNLStatus>('/api/trmnl/status');
}
