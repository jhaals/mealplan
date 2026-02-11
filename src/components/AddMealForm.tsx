import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
      <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">{t('headings.addMeal')}</h3>
      <form onSubmit={handleSubmit} className="space-y-2">
        <Input
          label={t('forms.mealName')}
          placeholder={t('forms.mealNamePlaceholder')}
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          required
          autoFocus
        />

        {targetDayDisplay && (
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {t('messages.willBeAddedTo')} <span className="font-medium">{targetDayDisplay.dayName}, {targetDayDisplay.dateStr}</span>
          </p>
        )}

        <Button type="submit" size="lg" className="w-full">
          {t('buttons.addMeal')}
        </Button>
      </form>
    </Card>
  );
}
