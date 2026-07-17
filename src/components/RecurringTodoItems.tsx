import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/Button';
import { formatDayDisplay } from '../utils/dateHelpers';
import type { TodoItem } from '../types';
import * as api from '../utils/api';

export function RecurringTodoItems() {
  const { t } = useTranslation();
  const [items, setItems] = useState<TodoItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadItems = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await api.getRecurringTodoItems();
      setItems(data);
    } catch (err) {
      console.error('Failed to load recurring items:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recurring items');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void Promise.resolve().then(loadItems);
  }, []);

  const handleDelete = async (itemId: string) => {
    try {
      await api.deleteTodoItem(itemId);
      setItems((prev) => prev.filter((i) => i.id !== itemId));
    } catch (err) {
      console.error('Failed to delete recurring item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
    }
  };

  /* nextDueDate is an ISO day string; lastCompletedAt is a full timestamp.
   * formatDayDisplay handles the locale (en / sv) for both.
   * Date only, no weekday: "Monthly · Next due: Friday, Jul 17" wraps this
   * mono meta line at 390px and strands the date on its own row. */
  const formatDate = (value: string): string => formatDayDisplay(value).dateStr;

  const formatInterval = (item: TodoItem): string => {
    switch (item.recurrenceInterval) {
      case 'daily':
        return t('todo.intervals.daily');
      case 'weekly':
        return t('todo.intervals.weekly');
      case 'monthly':
        return t('todo.intervals.monthly');
      case 'custom':
        return t('todo.intervals.custom', { days: item.recurrenceDays ?? 0 });
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <span
          className="inline-block h-8 w-8 rounded-full border-2 border-t-transparent"
          style={{ borderColor: 'var(--color-lavender)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
          aria-label={t('todo.loading')}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="card card--tint tint-coral p-4"
        style={{ boxShadow: 'none' }}
        role="alert"
      >
        <p className="text-sm text-ink break-words">{error}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={loadItems}>
          {t('buttons.retry')}
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="py-10 flex items-start gap-3">
        <span className="mark mt-1.5 shrink-0" aria-hidden="true" />
        <p className="text-muted">{t('todo.noRecurringItems')}</p>
      </div>
    );
  }

  return (
    <section>
      <h2 className="mono-label mb-3">{t('todo.allRecurringItems')}</h2>

      <ul className="grid gap-1.5 list-none p-0 m-0">
        {items.map((item) => (
          <li
            key={item.id}
            className="card card--tint tint-lav group flex items-center gap-2 p-3"
            style={{ boxShadow: 'none' }}
          >
            {/* The interval rides a chip next to the name rather than the meta
              * line: "Monthly · Next due: Jul 17" is too wide for mono at 320px
              * and stranded the date on its own row. The chip also matches the
              * lavender ↻ badge these tasks wear in the active list. */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-ink break-words min-w-0">{item.name}</span>
                <span className="chip tint-lav shrink-0">{formatInterval(item)}</span>
              </div>
              {/* Dates are formatted and locale-aware like everywhere else in
                * the app — nextDueDate arrives as a raw ISO string. */}
              {(item.nextDueDate || item.lastCompletedAt) && (
                <span className="mono-label block mt-0.5" style={{ textTransform: 'none' }}>
                  {item.nextDueDate && <>{t('todo.nextDue')}: {formatDate(item.nextDueDate)}</>}
                  {item.nextDueDate && item.lastCompletedAt && ' · '}
                  {item.lastCompletedAt && (
                    <>{t('todo.lastCompleted')}: {formatDate(item.lastCompletedAt)}</>
                  )}
                </span>
              )}
            </div>

            <button
              onClick={() => handleDelete(item.id)}
              className="shrink-0 grid place-items-center rounded-full text-muted transition-colors hover:text-accent-3"
              style={{ width: 44, height: 44, minWidth: 44 }}
              aria-label={t('todo.aria.deleteItem')}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                <path d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
