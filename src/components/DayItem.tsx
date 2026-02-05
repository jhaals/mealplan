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
      className={`p-4 border-b border-gray-200 cursor-pointer transition-all min-h-[60px] ${
        isActive
          ? 'bg-primary-50 border-l-4 border-l-primary-600'
          : isOver
          ? 'bg-primary-100 border-l-4 border-l-primary-400'
          : 'hover:bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-gray-900">{dayName}</h3>
          <p className="text-sm text-gray-600">{dateStr}</p>
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
