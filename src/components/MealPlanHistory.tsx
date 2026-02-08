import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { formatDayDisplay } from '../utils/dateHelpers';
import { getMealPlanHistory, deleteArchivedMealPlan, type ArchivedMealPlan } from '../utils/api';

export function MealPlanHistory() {
  const [history, setHistory] = useState<ArchivedMealPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this archived meal plan?')) return;
    try {
      setDeletingId(id);
      await deleteArchivedMealPlan(id);
      setHistory((prev) => prev.filter((p) => p.id !== id));
      if (expandedId === id) setExpandedId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent mb-2"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">Loading history...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">No previous meal plans yet.</p>
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
            <div className="flex items-start gap-2">
              <button
                onClick={() => setExpandedId(isExpanded ? null : plan.id)}
                className="flex-1 text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {startDisplay.dateStr} – {endDisplay.dateStr}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {plan.days.length} days · {totalMeals} meals
                    </p>
                  </div>
                  <span className="text-gray-400 dark:text-gray-500 text-lg">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>
              <button
                onClick={() => handleDelete(plan.id)}
                disabled={deletingId === plan.id}
                className="p-1.5 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50 flex-shrink-0"
                title="Delete archived plan"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700 space-y-2">
                {plan.days.map((day) => {
                  const dayDisplay = formatDayDisplay(day.date);
                  return (
                    <div key={day.date}>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {dayDisplay.dayName}, {dayDisplay.dateStr}
                      </p>
                      <ul className="ml-4 text-sm text-gray-600 dark:text-gray-400">
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
