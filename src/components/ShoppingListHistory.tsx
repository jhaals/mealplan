import { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { getShoppingListHistory, deleteArchivedShoppingList } from '../utils/api';
import type { ArchivedShoppingList } from '../types';
import { format } from 'date-fns';

export function ShoppingListHistory() {
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

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this archived shopping list?')) return;
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
        <p className="text-gray-500">No previous shopping lists yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((list) => {
        const isExpanded = expandedId === list.id;
        const totalItems = list.items.length;
        const checkedItems = list.items.filter(i => i.checked).length;
        const dateStr = format(new Date(list.createdAt), 'MMM d, yyyy');

        return (
          <Card key={list.id} className="p-3">
            <div className="flex items-start gap-2">
              <button
                onClick={() => setExpandedId(isExpanded ? null : list.id)}
                className="flex-1 text-left"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900">{dateStr}</p>
                    <p className="text-sm text-gray-500">
                      {totalItems} {totalItems === 1 ? 'item' : 'items'} · {checkedItems} checked
                    </p>
                  </div>
                  <span className="text-gray-400 text-lg">
                    {isExpanded ? '▲' : '▼'}
                  </span>
                </div>
              </button>
              <button
                onClick={() => handleDelete(list.id)}
                disabled={deletingId === list.id}
                className="p-1.5 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 flex-shrink-0"
                title="Delete archived list"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>

            {isExpanded && (
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1">
                {list.items.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 py-0.5">
                    <div
                      className="w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0"
                      style={{
                        borderColor: item.checked ? '#22c55e' : '#d1d5db',
                        backgroundColor: item.checked ? '#22c55e' : 'transparent',
                      }}
                    >
                      {item.checked && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        item.checked ? 'line-through text-gray-400' : 'text-gray-700'
                      }`}
                    >
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}
