export interface Meal {
  id: string;
  name: string;
  createdAt: Date;
}

export interface DayPlan {
  date: string; // ISO date string (YYYY-MM-DD)
  meals: Meal[];
}

export interface MealPlanState {
  startDate: string | null; // ISO date (null until user picks)
  days: DayPlan[]; // Dynamically grows as meals are added
  currentDay: string | null; // Auto-increments after each meal add
}

export type MealAction =
  | { type: 'SET_START_DATE'; payload: string }
  | { type: 'ADD_MEAL'; payload: { meal: Omit<Meal, 'id' | 'createdAt'>; day?: string } }
  | { type: 'DELETE_MEAL'; payload: { mealId: string; day: string } }
  | { type: 'MOVE_MEAL'; payload: { mealId: string; sourceDay: string; targetDay: string } }
  | { type: 'SWAP_MEALS'; payload: { meal1Id: string; meal1Day: string; meal2Id: string; meal2Day: string } }
  | { type: 'RESET' }
  | { type: 'LOAD_STATE'; payload: MealPlanState };
