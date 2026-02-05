import { useReducer, useEffect } from 'react';
import type { MealPlanState, MealAction, Meal } from '../types';
import { saveMealPlan, loadMealPlan } from '../utils/storage';
import { getOrCreateDay, getNextDay } from '../utils/dateHelpers';
import { format, addDays } from 'date-fns';

const initialState: MealPlanState = {
  startDate: null,
  days: [],
  currentDay: null,
};

function mealPlanReducer(state: MealPlanState, action: MealAction): MealPlanState {
  switch (action.type) {
    case 'SET_START_DATE': {
      return {
        ...state,
        startDate: action.payload,
        currentDay: action.payload,
      };
    }

    case 'ADD_MEAL': {
      const { meal, day } = action.payload;
      const targetDay = day || state.currentDay || state.startDate;

      if (!targetDay) {
        console.error('Cannot add meal: no target day specified');
        return state;
      }

      // Create the full meal object
      const newMeal: Meal = {
        id: crypto.randomUUID(),
        name: meal.name,
        createdAt: new Date(),
      };

      // Find or create the day
      const dayIndex = state.days.findIndex((d) => d.date === targetDay);

      let newDays;
      if (dayIndex >= 0) {
        // Day exists, replace the meal (only one meal per day)
        newDays = state.days.map((d, i) =>
          i === dayIndex ? { ...d, meals: [newMeal] } : d
        );
      } else {
        // Day doesn't exist, create it with the meal
        const newDay = getOrCreateDay(state.days, targetDay);
        newDay.meals = [newMeal];
        newDays = [...state.days, newDay].sort((a, b) => a.date.localeCompare(b.date));
      }

      // Auto-increment to next day
      const nextDay = getNextDay(targetDay);

      return {
        ...state,
        days: newDays,
        currentDay: nextDay,
      };
    }

    case 'DELETE_MEAL': {
      const { mealId, day } = action.payload;

      // Remove meal from its day
      let newDays = state.days.map((d) => {
        if (d.date === day) {
          return {
            ...d,
            meals: d.meals.filter((m) => m.id !== mealId),
          };
        }
        return d;
      });

      // Remove empty days and shift subsequent days
      const emptyDayIndex = newDays.findIndex((d) => d.date === day && d.meals.length === 0);

      if (emptyDayIndex >= 0 && state.startDate) {
        // Remove the empty day
        newDays = newDays.filter((d) => d.date !== day);

        // Renumber all days sequentially from start date
        newDays = newDays.map((d, index) => ({
          ...d,
          date: format(addDays(new Date(state.startDate!), index), 'yyyy-MM-dd'),
        }));
      }

      // Adjust currentDay if needed
      const newCurrentDay = state.currentDay
        ? getNextDay(newDays[newDays.length - 1]?.date || state.startDate!)
        : state.currentDay;

      return {
        ...state,
        days: newDays,
        currentDay: newCurrentDay,
      };
    }

    case 'MOVE_MEAL': {
      const { mealId, sourceDay, targetDay } = action.payload;

      // If moving to same day, no-op
      if (sourceDay === targetDay) return state;

      // Find the meal to move
      const sourceDayObj = state.days.find((d) => d.date === sourceDay);
      const mealToMove = sourceDayObj?.meals.find((m) => m.id === mealId);

      if (!mealToMove) {
        console.error('Meal not found');
        return state;
      }

      // Remove meal from source day
      let newDays = state.days.map((d) => {
        if (d.date === sourceDay) {
          return {
            ...d,
            meals: d.meals.filter((m) => m.id !== mealId),
          };
        }
        return d;
      });

      // Add meal to target day (replace any existing meal, only one per day)
      const targetDayIndex = newDays.findIndex((d) => d.date === targetDay);
      if (targetDayIndex >= 0) {
        newDays = newDays.map((d, i) =>
          i === targetDayIndex ? { ...d, meals: [mealToMove] } : d
        );
      } else {
        // Create target day if it doesn't exist
        const newDay = getOrCreateDay(state.days, targetDay);
        newDay.meals = [mealToMove];
        newDays = [...newDays, newDay].sort((a, b) => a.date.localeCompare(b.date));
      }

      return {
        ...state,
        days: newDays,
      };
    }

    case 'SWAP_MEALS': {
      const { meal1Id, meal1Day, meal2Id, meal2Day } = action.payload;

      // Find both meals
      const day1 = state.days.find((d) => d.date === meal1Day);
      const day2 = state.days.find((d) => d.date === meal2Day);
      const meal1 = day1?.meals.find((m) => m.id === meal1Id);
      const meal2 = day2?.meals.find((m) => m.id === meal2Id);

      if (!meal1 || !meal2) return state;

      // Swap meals between days
      const newDays = state.days.map((d) => {
        if (d.date === meal1Day) {
          return {
            ...d,
            meals: d.meals.map((m) => (m.id === meal1Id ? meal2 : m)),
          };
        }
        if (d.date === meal2Day) {
          return {
            ...d,
            meals: d.meals.map((m) => (m.id === meal2Id ? meal1 : m)),
          };
        }
        return d;
      });

      return { ...state, days: newDays };
    }

    case 'LOAD_STATE': {
      return action.payload;
    }

    default:
      return state;
  }
}

export function useMealPlanner() {
  const [state, dispatch] = useReducer(mealPlanReducer, initialState);

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = loadMealPlan();
    if (savedState) {
      dispatch({ type: 'LOAD_STATE', payload: savedState });
    }
  }, []);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (state.startDate) {
      saveMealPlan(state);
    }
  }, [state]);

  return {
    state,
    setStartDate: (date: string) => dispatch({ type: 'SET_START_DATE', payload: date }),
    addMeal: (meal: Omit<Meal, 'id' | 'createdAt'>, day?: string) =>
      dispatch({ type: 'ADD_MEAL', payload: { meal, day } }),
    deleteMeal: (mealId: string, day: string) =>
      dispatch({ type: 'DELETE_MEAL', payload: { mealId, day } }),
    moveMeal: (mealId: string, sourceDay: string, targetDay: string) =>
      dispatch({ type: 'MOVE_MEAL', payload: { mealId, sourceDay, targetDay } }),
    swapMeals: (meal1Id: string, meal1Day: string, meal2Id: string, meal2Day: string) =>
      dispatch({ type: 'SWAP_MEALS', payload: { meal1Id, meal1Day, meal2Id, meal2Day } }),
  };
}
