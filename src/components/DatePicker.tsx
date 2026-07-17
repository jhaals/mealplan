import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toISODate } from '../utils/dateHelpers';
import { Button } from './ui/Button';

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
    <div className="max-w-sm">
      <label htmlFor="start-date" className="mono-label block mb-1.5">
        {t('forms.startDate')}
      </label>
      <div className="flex items-center gap-2">
        <input
          id="start-date"
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="field"
        />
        <Button onClick={handleSubmit} className="shrink-0">
          {t('buttons.startPlanning')}
        </Button>
      </div>
    </div>
  );
}
