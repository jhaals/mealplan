import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
    loadItems();
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
      <div className="flex items-center justify-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        <button
          onClick={loadItems}
          className="mt-2 text-sm text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium"
        >
          {t('buttons.retry')}
        </button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400 dark:text-gray-500 text-sm">{t('todo.noRecurringItems')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
      <div className="px-2 py-1 border-b border-gray-100 dark:border-gray-700">
        <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
          {t('todo.allRecurringItems')}
        </h2>
      </div>
      <div className="divide-y divide-gray-50 dark:divide-gray-700">
        {items.map((item) => (
          <div key={item.id} className="flex items-center gap-2 px-2 py-1.5 group hover:bg-gray-50 dark:hover:bg-gray-700">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-gray-900 dark:text-gray-100 block truncate">{item.name}</span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {formatInterval(item)}
                {item.nextDueDate && (
                  <> · {t('todo.nextDue')}: {item.nextDueDate}</>
                )}
                {item.lastCompletedAt && (
                  <> · {t('todo.lastCompleted')}: {new Date(item.lastCompletedAt).toLocaleDateString()}</>
                )}
              </span>
            </div>
            <button
              onClick={() => handleDelete(item.id)}
              className="flex-shrink-0 p-1 text-gray-400 dark:text-gray-500 hover:text-red-600 dark:hover:text-red-400 rounded transition-colors opacity-100 sm:opacity-0 sm:group-hover:opacity-100 min-w-[32px] min-h-[32px] flex items-center justify-center"
              aria-label={t('todo.aria.deleteItem')}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
