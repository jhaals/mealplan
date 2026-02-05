import type { MealPlanState } from '../types';

const STORAGE_KEY = 'mealprepp_state';

/**
 * Save meal plan state to localStorage
 */
export function saveMealPlan(state: MealPlanState): void {
  try {
    const serialized = JSON.stringify(state);
    localStorage.setItem(STORAGE_KEY, serialized);
  } catch (error) {
    console.error('Failed to save meal plan:', error);
    // Handle quota exceeded or other storage errors
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      alert('Storage quota exceeded. Please delete some meals to free up space.');
    }
  }
}

/**
 * Load meal plan state from localStorage
 * Returns null if no saved state exists or if loading fails
 */
export function loadMealPlan(): MealPlanState | null {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    if (!serialized) return null;

    const state = JSON.parse(serialized);

    // Convert date strings back to Date objects for meals
    if (state.days) {
      state.days.forEach((day: any) => {
        if (day.meals) {
          day.meals.forEach((meal: any) => {
            if (meal.createdAt) {
              meal.createdAt = new Date(meal.createdAt);
            }
          });
        }
      });
    }

    return state;
  } catch (error) {
    console.error('Failed to load meal plan:', error);
    return null;
  }
}

/**
 * Clear all saved meal plan data
 */
export function clearMealPlan(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear meal plan:', error);
  }
}
