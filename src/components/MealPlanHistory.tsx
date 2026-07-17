import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { formatDayDisplay } from '../utils/dateHelpers';
import { getMealPlanHistory, deleteArchivedMealPlan, type ArchivedMealPlan } from '../utils/api';

export function MealPlanHistory() {
  const { t } = useTranslation();
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

  /* A real confirm() stays here on purpose. The house stance is optimistic
   * update + Undo, but deleting an archived plan is irreversible server-side —
   * there is nothing to undo it with. */
  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmations.deleteArchivedPlan'))) return;
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
        <span
          className="inline-block h-8 w-8 mb-2 rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--color-accent-deep)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
          aria-hidden="true"
        />
        <p className="text-muted text-sm">{t('messages.loadingHistory')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card card--tint tint-coral p-4" style={{ boxShadow: 'none' }} role="alert">
        <p className="text-sm text-ink break-words">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="py-10 flex items-start gap-3">
        <span className="mark mt-1.5 shrink-0" aria-hidden="true" />
        <p className="text-muted">{t('messages.noPreviousMealPlans')}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2 list-none p-0 m-0">
      {history.map((plan) => {
        const startDisplay = formatDayDisplay(plan.startDate);
        const endDisplay = formatDayDisplay(plan.endDate);
        const isExpanded = expandedId === plan.id;
        const totalMeals = plan.days.reduce((sum, day) => sum + day.meals.length, 0);
        const panelId = `plan-${plan.id}`;

        return (
          <li key={plan.id} className="card p-1.5 flex items-start gap-1">
            <button
              onClick={() => setExpandedId(isExpanded ? null : plan.id)}
              className="flex-1 min-w-0 text-left p-2 rounded-2xl"
              aria-expanded={isExpanded}
              aria-controls={panelId}
            >
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink">
                    {startDisplay.dateStr} – {endDisplay.dateStr}
                  </p>
                  <p className="mono-label mt-0.5">
                    {t('counts.days', { count: plan.days.length })} · {t('counts.meals', { count: totalMeals })}
                  </p>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
                  className="shrink-0 text-muted transition-transform"
                  style={{ transform: isExpanded ? 'rotate(180deg)' : 'none' }}
                  aria-hidden="true"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>

              {isExpanded && (
                <div id={panelId} className="mt-3 grid gap-2">
                  <hr className="seam" />
                  {plan.days.map((day) => {
                    const dayDisplay = formatDayDisplay(day.date);
                    return (
                      <div key={day.date}>
                        <p className="text-sm font-medium text-ink">
                          {dayDisplay.dayName}, {dayDisplay.dateStr}
                        </p>
                        <ul className="mt-0.5 grid gap-0.5 list-none p-0 m-0">
                          {day.meals.map((meal) => (
                            <li key={meal.id} className="text-sm text-muted flex gap-2">
                              <span aria-hidden="true">·</span>
                              <span className="min-w-0 break-words">{meal.name}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </button>

            <button
              onClick={() => handleDelete(plan.id)}
              disabled={deletingId === plan.id}
              className="shrink-0 grid place-items-center rounded-full text-muted transition-colors hover:text-accent-3 disabled:opacity-50"
              style={{ width: 44, height: 44, minWidth: 44 }}
              aria-label={t('aria.deleteArchivedPlan')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
