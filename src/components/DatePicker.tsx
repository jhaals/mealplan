import { useState } from 'react';
import { toISODate } from '../utils/dateHelpers';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface DatePickerProps {
  value: string | null;
  onChange: (date: string) => void;
}

export function DatePicker({ value, onChange }: DatePickerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(
    value || toISODate(new Date())
  );

  const handleSubmit = () => {
    if (selectedDate) {
      onChange(selectedDate);
    }
  };

  return (
    <Card className="p-6 max-w-md w-full">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Choose Your Start Date
      </h3>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="start-date"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Start Date
          </label>
          <input
            id="start-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 min-h-[44px]"
          />
        </div>
        <Button onClick={handleSubmit} size="lg" className="w-full">
          Start Planning
        </Button>
      </div>
    </Card>
  );
}
