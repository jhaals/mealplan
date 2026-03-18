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
    <Card variant="elevated" className="p-5">
      <h3 className="text-xl font-display font-semibold text-charcoal-800 dark:text-cream-100 mb-4">
        {t('headings.addMeal')}
      </h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label={t('forms.mealName')}
          placeholder={t('forms.mealNamePlaceholder')}
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          required
          autoFocus
        />

        {targetDayDisplay && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sage-100 dark:bg-charcoal-700/50 border border-sage-200 dark:border-charcoal-600">
            <svg className="w-4 h-4 text-primary-600 dark:text-primary-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
            <p className="text-sm text-charcoal-700 dark:text-cream-200">
              {t('messages.willBeAddedTo')} <span className="font-semibold text-primary-600 dark:text-primary-400">{targetDayDisplay.dayName}, {targetDayDisplay.dateStr}</span>
            </p>
          </div>
        )}

        <Button type="submit" size="lg" className="w-full">
          {t('buttons.addMeal')}
        </Button>
      </form>
    </Card>
  );
}
