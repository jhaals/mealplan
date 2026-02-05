import { useReducer, useEffect, useState, useCallback } from 'react';
import type { MealPlanState, MealAction, Meal } from '../types';
import * as api from '../utils/api';

const initialState: MealPlanState = {
  startDate: null,
  days: [],
  currentDay: null,
};

function mealPlanReducer(state: MealPlanState, action: MealAction): MealPlanState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;

    default:
      return state;
  }
}

export function useMealPlanner() {
  const [state, dispatch] = useReducer(mealPlanReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load state from API on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getMealPlan();

        // Convert createdAt strings to Date objects
        const normalizedData: MealPlanState = {
          ...data,
          days: data.days.map(day => ({
            ...day,
            meals: day.meals.map(meal => ({
              ...meal,
              createdAt: new Date(meal.createdAt),
            })),
          })),
        };

        dispatch({ type: 'LOAD_STATE', payload: normalizedData });
      } catch (err) {
        console.error('Failed to load meal plan:', err);
        setError(err instanceof Error ? err.message : 'Failed to load meal plan');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const data = await api.getMealPlan();

      // Convert createdAt strings to Date objects
      const normalizedData: MealPlanState = {
        ...data,
        days: data.days.map(day => ({
          ...day,
          meals: day.meals.map(meal => ({
            ...meal,
            createdAt: new Date(meal.createdAt),
          })),
        })),
      };

      dispatch({ type: 'LOAD_STATE', payload: normalizedData });
    } catch (err) {
      console.error('Failed to refresh state:', err);
      throw err;
    }
  }, []);

  const setStartDate = useCallback(async (date: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.setStartDate(date);
      await refreshState();
    } catch (err) {
      console.error('Failed to set start date:', err);
      setError(err instanceof Error ? err.message : 'Failed to set start date');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const addMeal = useCallback(async (meal: Omit<Meal, 'id' | 'createdAt'>, day?: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.addMeal(meal.name, day);
      await refreshState();
    } catch (err) {
      console.error('Failed to add meal:', err);
      setError(err instanceof Error ? err.message : 'Failed to add meal');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deleteMeal = useCallback(async (mealId: string, day: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.deleteMeal(mealId, day);
      await refreshState();
    } catch (err) {
      console.error('Failed to delete meal:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete meal');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const moveMeal = useCallback(async (mealId: string, sourceDay: string, targetDay: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.moveMeal(mealId, sourceDay, targetDay);
      await refreshState();
    } catch (err) {
      console.error('Failed to move meal:', err);
      setError(err instanceof Error ? err.message : 'Failed to move meal');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const swapMeals = useCallback(async (
    meal1Id: string,
    meal1Day: string,
    meal2Id: string,
    meal2Day: string
  ) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.swapMeals(meal1Id, meal1Day, meal2Id, meal2Day);
      await refreshState();
    } catch (err) {
      console.error('Failed to swap meals:', err);
      setError(err instanceof Error ? err.message : 'Failed to swap meals');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const reset = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      await api.resetMealPlan();
      dispatch({ type: 'LOAD_STATE', payload: initialState });
    } catch (err) {
      console.error('Failed to reset meal plan:', err);
      setError(err instanceof Error ? err.message : 'Failed to reset meal plan');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const retry = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await refreshState();
    } catch (err) {
      console.error('Failed to retry:', err);
      setError(err instanceof Error ? err.message : 'Failed to load meal plan');
    } finally {
      setIsLoading(false);
    }
  }, [refreshState]);

  return {
    state,
    isLoading,
    isSaving,
    error,
    setStartDate,
    addMeal,
    deleteMeal,
    moveMeal,
    swapMeals,
    reset,
    retry,
  };
}
