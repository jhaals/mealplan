import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDayDisplay } from '../utils/dateHelpers';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
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

  /* Deliberately not a card. The add field is the page's working surface, so
   * it sits directly on the paper with a pear band behind it — a different
   * material from the meal cards it produces. */
  return (
    <form onSubmit={handleSubmit}>
      <div className="flex items-end gap-2">
        <Input
          label={t('forms.mealName')}
          placeholder={t('forms.mealNamePlaceholder')}
          value={mealName}
          onChange={(e) => setMealName(e.target.value)}
          required
        />
        <Button type="submit" className="shrink-0" disabled={!mealName.trim()}>
          {t('buttons.addMeal')}
        </Button>
      </div>

      {targetDayDisplay && (
        <p className="mt-2 text-sm text-muted">
          {t('messages.willBeAddedTo')}{' '}
          <span className="hl font-medium">
            {targetDayDisplay.dayName}, {targetDayDisplay.dateStr}
          </span>
        </p>
      )}
    </form>
  );
}
