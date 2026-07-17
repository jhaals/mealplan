import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { getShoppingListHistory, deleteArchivedShoppingList } from '../utils/api';
import type { ArchivedShoppingList } from '../types';
import { format } from 'date-fns';

export function ShoppingListHistory() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ArchivedShoppingList[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getShoppingListHistory();
        setHistory(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load history');
      } finally {
        setIsLoading(false);
      }
    };

    loadHistory();
  }, []);

  /* Same reasoning as MealPlanHistory — the archive delete is irreversible
   * server-side, so it keeps a real confirm() rather than optimistic + Undo. */
  const handleDelete = async (id: string) => {
    if (!confirm(t('confirmations.deleteArchivedList'))) return;
    try {
      setDeletingId(id);
      await deleteArchivedShoppingList(id);
      setHistory((prev) => prev.filter((l) => l.id !== id));
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
          style={{ borderColor: 'var(--color-accent-2)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
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
        <p className="text-muted">{t('messages.noPreviousShoppingLists')}</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-2 list-none p-0 m-0">
      {history.map((list) => {
        const isExpanded = expandedId === list.id;
        const totalItems = list.items.length;
        const checkedItems = list.items.filter(i => i.checked).length;
        const dateStr = format(new Date(list.createdAt), 'MMM d, yyyy');
        const panelId = `list-${list.id}`;

        return (
          <li key={list.id} className="card p-1.5 flex items-start gap-1">
            <button
              onClick={() => setExpandedId(isExpanded ? null : list.id)}
              className="flex-1 min-w-0 text-left p-2 rounded-2xl"
              aria-expanded={isExpanded}
              aria-controls={panelId}
            >
              <div className="flex justify-between items-center gap-2">
                <div className="min-w-0">
                  <p className="font-display font-semibold text-ink">{dateStr}</p>
                  <p className="mono-label mt-0.5">
                    {t('counts.items', { count: totalItems })} ·{' '}
                    {t('counts.checked', { count: checkedItems })}
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
                <div id={panelId} className="mt-3">
                  <hr className="seam mb-2" />
                  <ul className="grid gap-1 list-none p-0 m-0">
                    {list.items.map((item) => (
                      <li key={item.id} className="flex items-center gap-2">
                        <span
                          className="grid place-items-center rounded-full shrink-0"
                          style={{
                            width: 16,
                            height: 16,
                            border: `2px solid ${item.checked ? 'var(--color-mint)' : 'var(--color-rule)'}`,
                            background: item.checked ? 'var(--color-mint)' : 'transparent',
                          }}
                          aria-hidden="true"
                        >
                          {item.checked && (
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-ink)" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                              <path d="m5 13 4 4L19 7" />
                            </svg>
                          )}
                        </span>
                        <span
                          className="text-sm min-w-0 break-words"
                          style={
                            item.checked
                              ? { textDecoration: 'line-through', color: 'var(--color-ink-2)', opacity: 0.7 }
                              : { color: 'var(--color-ink)' }
                          }
                        >
                          {item.name}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </button>

            <button
              onClick={() => handleDelete(list.id)}
              disabled={deletingId === list.id}
              className="shrink-0 grid place-items-center rounded-full text-muted transition-colors hover:text-accent-3 disabled:opacity-50"
              style={{ width: 44, height: 44, minWidth: 44 }}
              aria-label={t('aria.deleteArchivedList')}
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
