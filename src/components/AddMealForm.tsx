import { useState } from 'react';
import { formatDayDisplay } from '../utils/dateHelpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import type { DayPlan, Meal } from '../types';

interface AddMealFormProps {
  currentDay: string | null;
  days: DayPlan[];
  onAddMeal: (meal: Omit<Meal, 'id' | 'createdAt'>, day?: string) => void;
}

export function AddMealForm({ currentDay, days, onAddMeal }: AddMealFormProps) {
  const [mealName, setMealName] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Use selected day if set, otherwise use currentDay
  const targetDay = selectedDay || currentDay;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!mealName.trim()) {
      return;
    }

    onAddMeal(
      {
        name: mealName.trim(),
      },
      selectedDay || undefined
    );

    // Reset form
    setMealName('');
    setSelectedDay(null);
  };

  const targetDayDisplay = targetDay ? formatDayDisplay(targetDay) : null;

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Meal</h3>
      <form onSubmit={handleSubmit} className="space-y-3">
        <Input
          label="Meal Name"
          placeholder="e.g., Chicken Salad"
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          required
          autoFocus
        />

        {/* Day Override */}
        {days.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Add to Day
            </label>
            <select
              value={selectedDay || ''}
              onChange={(e) => setSelectedDay(e.target.value || null)}
              className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
            >
              <option value="">
                {targetDayDisplay
                  ? `${targetDayDisplay.dayName}, ${targetDayDisplay.dateStr} (Auto)`
                  : 'Select a day'}
              </option>
              {days.map((day) => {
                const display = formatDayDisplay(day.date);
                return (
                  <option key={day.date} value={day.date}>
                    {display.dayName}, {display.dateStr}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {targetDayDisplay && !selectedDay && (
          <p className="text-sm text-gray-600">
            Will be added to <span className="font-medium">{targetDayDisplay.dayName}</span>
          </p>
        )}

        <Button type="submit" size="lg" className="w-full">
          Add Meal
        </Button>
      </form>
    </Card>
  );
}
