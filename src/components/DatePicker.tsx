import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toISODate } from '../utils/dateHelpers';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const { t } = useTranslation();
  const [selectedDate, setSelectedDate] = useState<string>(
    value || toISODate(new Date())
  );

  const handleSubmit = () => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <Card variant="elevated" className="p-8 max-w-md w-full animate-[fadeIn_0.5s_ease-out]">
      <h3 className="text-2xl font-display font-semibold text-charcoal-800 dark:text-cream-100 mb-6 text-center">
        {t('forms.chooseStartDate')}
      </h3>
      <div className="space-y-5">
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-semibold text-charcoal-700 dark:text-cream-200 mb-3"
          >
            {t('forms.startDate')}
          </label>
          <input
            id="start-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="
              w-full px-5 py-4 text-base
              border-2 border-cream-300 dark:border-charcoal-600
              rounded-xl
              bg-white dark:bg-charcoal-800
              text-charcoal-800 dark:text-cream-100
              focus:ring-4 focus:ring-primary-500/20
              focus:border-primary-500
              transition-all duration-200
              shadow-soft
              min-h-[52px]
            "
          />
        </div>
        <Button onClick={handleSubmit} size="lg" className="w-full">
          {t('buttons.startPlanning')}
        </Button>
      </div>
    </Card>
  );
}
