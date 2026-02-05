import { MealCard } from './MealCard';
import { formatDayDisplay } from '../utils/dateHelpers';
import type { DayPlan } from '../types';

interface MealListProps {
  days: DayPlan[];
  onDeleteMeal: (mealId: string, day: string) => void;
  onMoveMeal: (mealId: string, sourceDay: string, targetDay: string) => void;
}

export function MealList({ days, onDeleteMeal }: MealListProps) {
  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 mb-4">
          <svg
            className="w-16 h-16 mx-auto"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-1">No meals yet</h3>
        <p className="text-gray-600">Add your first meal to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {days.map((day) => {
        const { dayName, dateStr } = formatDayDisplay(day.date);

        return (
          <div key={day.date}>
            {/* Day Header */}
            <div className="mb-3">
              <h3 className="text-lg font-semibold text-gray-900">
                {dayName}, {dateStr}
              </h3>
              <p className="text-sm text-gray-600">
                {day.meals.length} {day.meals.length === 1 ? 'meal' : 'meals'}
              </p>
            </div>

            {/* Meals */}
            {day.meals.length === 0 ? (
              <p className="text-sm text-gray-500 italic py-4">No meals for this day</p>
            ) : (
              <div>
                {day.meals.map((meal) => (
                  <MealCard
                    key={meal.id}
                    meal={meal}
                    day={day.date}
                    onDelete={onDeleteMeal}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
