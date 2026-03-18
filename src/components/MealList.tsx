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
      <div className="text-center py-16 animate-[fadeIn_0.6s_ease-out]">
        <div className="text-sage-300 dark:text-charcoal-500 mb-5">
          <svg
            className="w-20 h-20 mx-auto opacity-60"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
        <h3 className="text-xl font-display font-semibold text-charcoal-800 dark:text-cream-100 mb-2">
          {t('messages.emptyMealListTitle')}
        </h3>
        <p className="text-charcoal-600 dark:text-cream-300 max-w-md mx-auto">
          {t('messages.emptyMealListDescription')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {days.map((day, dayIndex) => (
        <div key={day.date}>
          {day.meals.map((meal, mealIndex) => (
            <div
              key={meal.id}
              style={{
                animation: `fadeInStagger 0.4s ease-out ${(dayIndex * 50 + mealIndex * 100)}ms backwards`
              }}
            >
              <MealCard
                meal={meal}
                day={day.date}
                onDelete={onDeleteMeal}
              />
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
