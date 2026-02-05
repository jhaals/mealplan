import { DayItem } from './DayItem';
import type { DayPlan } from '../types';

interface DayColumnProps {
  days: DayPlan[];
  currentDay: string | null;
  moveMeal: (mealId: string, sourceDay: string, targetDay: string) => void;
}

export function DayColumn({ days, currentDay }: DayColumnProps) {
  if (days.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p className="text-sm">No days yet</p>
        <p className="text-xs mt-1">Add your first meal to get started</p>
      </div>
    );
  }

  return (
    <div className="md:min-h-full">
      <div className="md:sticky md:top-0">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Your Week</h2>
        </div>
        {days.map((day) => (
          <DayItem key={day.date} day={day} isActive={day.date === currentDay} />
        ))}
      </div>
    </div>
  );
}
