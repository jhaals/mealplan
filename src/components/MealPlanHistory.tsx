import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { formatDayDisplay } from '../utils/dateHelpers';
import { getMealPlanHistory, type ArchivedMealPlan } from '../utils/api';

export function MealPlanHistory() {
  const [history, setHistory] = useState<ArchivedMealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getMealPlanHistory();
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2"></div>
        <p className="text-gray-600 text-sm">Loading history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">No previous meal plans yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((plan) => {
        const startDisplay = formatDayDisplay(plan.startDate);
        const endDisplay = formatDayDisplay(plan.endDate);
        const isExpanded = expandedId === plan.id;
        const totalMeals = plan.days.reduce((sum, day) => sum + day.meals.length, 0);

        return (
          <Card key={plan.id} className="p-3">
            <button
              onClick={() => setExpandedId(isExpanded ? null : plan.id)}
              className="w-full text-left"
            >
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">
                    {startDisplay.dateStr} – {endDisplay.dateStr}
                  </p>
                  <p className="text-sm text-gray-500">
                    {plan.days.length} days · {totalMeals} meals
                  </p>
                </div>
                <span className="text-gray-400 text-lg">
                  {isExpanded ? '▲' : '▼'}
                </span>
              </div>
            </button>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                {plan.days.map((day) => {
                  const dayDisplay = formatDayDisplay(day.date);
                  return (
                    <div key={day.date}>
                      <p className="text-sm font-medium text-gray-700">
                        {dayDisplay.dayName}, {dayDisplay.dateStr}
                      </p>
                      <ul className="ml-4 text-sm text-gray-600">
                        {day.meals.map((meal) => (
                          <li key={meal.id}>• {meal.name}</li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
