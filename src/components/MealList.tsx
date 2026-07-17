import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { MealCard } from './MealCard';
import { formatDayDisplay, toISODate } from '../utils/dateHelpers';
import type { DayPlan } from '../types';

interface MealListProps {
  days: DayPlan[];
  onDeleteMeal: (mealId: string, day: string) => void;
  onMoveMeal: (mealId: string, sourceDay: string, targetDay: string) => void;
}

/* One row of the day rail. Each day is a drop target, which is what makes
 * "drag a meal onto another day" reachable — the previous flat list rendered
 * no day containers, so the day droppable never mounted. */
function DayRow({
  day,
  index,
  isToday,
  onDeleteMeal,
}: {
  day: DayPlan;
  index: number;
  isToday: boolean;
  onDeleteMeal: (mealId: string, day: string) => void;
}) {
  const { t } = useTranslation();
  const { dayName, dateStr } = formatDayDisplay(day.date);
  const dayOfMonth = new Date(day.date).getDate();

  const { setNodeRef, isOver } = useDroppable({
    id: day.date,
    data: { type: 'day', date: day.date },
  });

  return (
    <li
      className={`day ${isToday ? 'day--today' : ''}`}
      style={{ animation: `hum-rise 400ms var(--ease-snap) ${index * 60}ms backwards` }}
    >
      <span className="day__num" aria-hidden="true">
        {dayOfMonth}
      </span>

      <div className="day__head">
        <h3 className="day__name">{dayName}</h3>
        <span className="mono-label">{dateStr}</span>
        {isToday && <span className="chip tint-coral">{t('messages.today')}</span>}
      </div>

      <div ref={setNodeRef} className={`day__body ${isOver ? 'is-over' : ''}`}>
        {day.meals.length === 0 ? (
          <p className="day__empty">{t('messages.dropMealHere')}</p>
        ) : (
          day.meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} day={day.date} onDelete={onDeleteMeal} />
          ))
        )}
      </div>
    </li>
  );
}

export function MealList({ days, onDeleteMeal }: MealListProps) {
  const { t } = useTranslation();

  if (days.length === 0) {
    return (
      <div className="py-12">
        <div className="flex items-start gap-3">
          <span className="mark mt-2 shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h3 style={{ fontSize: 'var(--text-xl)' }}>{t('messages.emptyMealListTitle')}</h3>
            <p className="text-muted mt-2 max-w-prose">{t('messages.emptyMealListDescription')}</p>
          </div>
        </div>
      </div>
    );
  }

  const today = toISODate(new Date());

  return (
    <ol className="rail">
      {days.map((day, index) => (
        <DayRow
          key={day.date}
          day={day}
          index={index}
          isToday={day.date === today}
          onDeleteMeal={onDeleteMeal}
        />
      ))}
    </ol>
  );
}
