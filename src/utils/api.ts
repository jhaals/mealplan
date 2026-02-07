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

export interface ArchivedMealPlan {
  id: string;
  startDate: string;
  endDate: string;
  days: { date: string; meals: { id: string; name: string; createdAt: string }[] }[];
  createdAt: string;
}
