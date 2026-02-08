import { useDroppable } from '@dnd-kit/core';
import { formatDayDisplay } from '../utils/dateHelpers';
import type { DayPlan } from '../types';

interface DayItemProps {
  day: DayPlan;
  isActive: boolean;
}

export function DayItem({ day, isActive }: DayItemProps) {
  const { dayName, dateStr } = formatDayDisplay(day.date);
  const mealCount = day.meals.length;

  const { setNodeRef, isOver } = useDroppable({
    id: day.date,
    data: {
      type: 'day',
      date: day.date,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 border-b border-gray-200 dark:border-gray-700 cursor-pointer transition-all min-h-[60px] ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/30 border-l-4 border-l-primary-600'
          : isOver
          ? 'bg-primary-100 dark:bg-primary-900/20 border-l-4 border-l-primary-400'
          : 'hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-gray-100">{dayName}</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">{dateStr}</p>
        </div>
        {mealCount > 0 && (
          <div className="flex items-center justify-center w-8 h-8 bg-primary-600 text-white rounded-full text-sm font-medium">
            {mealCount}
          </div>
        )}
      </div>
    </div>
  );
}
