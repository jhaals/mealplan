import { useState } from 'react';
import { formatDayDisplay } from '../utils/dateHelpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import type { Meal } from '../types';

interface AddMealFormProps {
  currentDay: string | null;
  onAddMeal: (meal: Omit<Meal, 'id' | 'createdAt'>) => void;
}

export function AddMealForm({ currentDay, onAddMeal }: AddMealFormProps) {
  const [mealName, setMealName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!mealName.trim()) {
      return;
    }

    onAddMeal({
      name: mealName.trim(),
    });

    // Reset form
    setMealName('');
  };

  const targetDayDisplay = currentDay ? formatDayDisplay(currentDay) : null;

  return (
    <Card className="p-3">
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Meal</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          label="Meal Name"
          placeholder="e.g., Chicken Salad"
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          required
          autoFocus
        />

        {targetDayDisplay && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Will be added to <span className="font-medium">{targetDayDisplay.dayName}, {targetDayDisplay.dateStr}</span>
          </p>
        )}

        <Button type="submit" size="lg" className="w-full">
          Add Meal
        </Button>
      </form>
    </Card>
  );
}
