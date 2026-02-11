import { useTranslation } from 'react-i18next';
import { MealCard } from './MealCard';
import type { DayPlan } from '../types';

interface MealListProps {
  days: DayPlan[];
  onDeleteMeal: (mealId: string, day: string) => void;
  onMoveMeal: (mealId: string, sourceDay: string, targetDay: string) => void;
}

export function MealList({ days, onDeleteMeal }: MealListProps) {
  const { t } = useTranslation();

  if (days.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 dark:text-gray-500 mb-4">
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
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-1">{t('messages.emptyMealListTitle')}</h3>
        <p className="text-gray-600 dark:text-gray-400">{t('messages.emptyMealListDescription')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {days.map((day) => (
        <div key={day.date}>
          {day.meals.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              day={day.date}
              onDelete={onDeleteMeal}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
