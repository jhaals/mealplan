import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useTodoList } from '../hooks/useTodoList';
import { TodoListItem } from './TodoListItem';
import { RecurringTodoItems } from './RecurringTodoItems';

export function TodoList() {
  const { t } = useTranslation();
  const {
    state,
    isLoading,
    isSaving,
    error,
    addItem,
    toggleItem,
    deleteItem,
    reorderItems,
    clearCompleted,
    retry,
    setIsDragging,
    isConnected,
  } = useTodoList();

  const [newItemName, setNewItemName] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState<string>('weekly');
  const [activeTab, setActiveTab] = useState<'list' | 'recurring'>('list');
  const [lastUnchecked, setLastUnchecked] = useState<{ id: string; name: string } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  const mouseSensor = useSensor(MouseSensor, {
    activationConstraint: { distance: 10 },
  });

  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 250, tolerance: 5 },
  });

  const sensors = useSensors(mouseSensor, touchSensor);

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    try {
      await addItem(
        trimmed,
        isRecurring,
        isRecurring ? recurrenceInterval : null,
        isRecurring && recurrenceInterval === 'custom' ? 7 : null
      );
      setNewItemName('');
      setIsRecurring(false);
    } catch {
      // Error handled by hook
    }
  };

  const handleToggle = async (itemId: string) => {
    const item = state.items.find(i => i.id === itemId);
    if (item && !item.checked && !item.isRecurring) {
      // About to check a non-recurring item - store for undo
      setLastUnchecked({ id: item.id, name: item.name });
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
      undoTimeoutRef.current = setTimeout(() => {
        setLastUnchecked(prev => prev?.id === item.id ? null : prev);
        undoTimeoutRef.current = null;
      }, 5000);
    } else {
      setLastUnchecked(null);
    }
    await toggleItem(itemId);
  };

  const handleUndo = async () => {
    if (lastUnchecked) {
      await toggleItem(lastUnchecked.id);
      setLastUnchecked(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = state.items.findIndex(i => i.id === active.id);
    const newIndex = state.items.findIndex(i => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(state.items, oldIndex, newIndex);
    await reorderItems(reordered.map(i => i.id));
  };

  const uncheckedItems = state.items.filter(i => !i.checked);
  const checkedItems = state.items.filter(i => i.checked);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">{t('todo.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && state.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-200 mb-2">{t('headings.error')}</h2>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={retry}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            {t('buttons.retry')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex border-b border-cream-300 dark:border-charcoal-700">
          <button
            onClick={() => setActiveTab('list')}
            className={`
              px-5 py-2.5 text-sm font-semibold
              border-b-2 transition-all duration-200
              relative
              ${activeTab === 'list'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-charcoal-600 dark:text-cream-300 hover:text-primary-600 dark:hover:text-primary-400'
              }
            `}
          >
            {t('todo.tabs.active')}
          </button>
          <button
            onClick={() => setActiveTab('recurring')}
            className={`
              px-5 py-2.5 text-sm font-semibold
              border-b-2 transition-all duration-200
              relative
              ${activeTab === 'recurring'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-charcoal-600 dark:text-cream-300 hover:text-primary-600 dark:hover:text-primary-400'
              }
            `}
          >
            {t('todo.tabs.recurring')}
          </button>
        </div>
      </div>

      {activeTab === 'list' ? (
        <div className="p-4">
          {/* Error banner */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-start justify-between">
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              <button onClick={retry} className="ml-4 text-sm text-red-700 dark:text-red-300 hover:text-red-900 dark:hover:text-red-100 font-medium">
                {t('buttons.retry')}
              </button>
            </div>
          )}

          {/* Kitchen Notepad Card */}
          <div className="bg-white dark:bg-charcoal-800 rounded-xl shadow-medium border border-cream-300 dark:border-charcoal-700 overflow-hidden relative">
            {/* Subtle paper texture overlay */}
            <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none" style={{
              backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 31px, rgba(0,0,0,0.1) 31px, rgba(0,0,0,0.1) 32px)`
            }}></div>

            {/* Card header */}
            <div className="px-4 py-3 flex items-center justify-between border-b border-cream-200 dark:border-charcoal-700 relative z-10">
              <div className="flex items-center gap-3">
                <h2 className="font-display font-semibold text-charcoal-800 dark:text-cream-100 text-lg">{t('todo.heading')}</h2>
                {/* SSE status indicator */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-cream-100 dark:bg-charcoal-700">
                  <div
                    className={`h-2 w-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}
                    title={isConnected ? 'SSE Connected' : 'SSE Disconnected'}
                  />
                  <span className="text-xs font-medium text-charcoal-600 dark:text-cream-300">
                    {isConnected ? 'Live' : 'Offline'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-600 border-t-transparent"></div>
                )}
                {checkedItems.length > 0 && (
                  <button
                    onClick={clearCompleted}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-semibold text-charcoal-700 dark:text-cream-200 bg-cream-100 dark:bg-charcoal-700 border border-cream-300 dark:border-charcoal-600 rounded-lg hover:bg-sage-100 dark:hover:bg-charcoal-600 transition-all disabled:opacity-50 shadow-soft"
                  >
                    {t('todo.clearCompleted')}
                  </button>
                )}
              </div>
            </div>

            {/* Add item form */}
            <form onSubmit={handleAddItem} className="px-4 py-3 border-b border-cream-200 dark:border-charcoal-700 relative z-10">
              <div className="flex items-center gap-3">
                <span className="text-primary-600 dark:text-primary-400 text-xl font-bold">+</span>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder={t('todo.addItemPlaceholder')}
                  className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-charcoal-800 dark:text-cream-100 placeholder-charcoal-400 dark:placeholder-charcoal-500"
                />
              </div>
              {/* Recurring toggle */}
              <div className="flex items-center gap-3 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={isRecurring}
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`
                      flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center
                      transition-all duration-200
                      ${isRecurring
                        ? 'border-primary-500 bg-primary-500 scale-100'
                        : 'border-sage-300 dark:border-charcoal-500 bg-transparent hover:border-primary-400'
                      }
                    `}
                  >
                    {isRecurring && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </button>
                  <span className="text-xs font-medium text-charcoal-600 dark:text-cream-300">{t('todo.recurring')}</span>
                </label>
                {isRecurring && (
                  <select
                    value={recurrenceInterval}
                    onChange={(e) => setRecurrenceInterval(e.target.value)}
                    className="text-xs font-medium bg-cream-100 dark:bg-charcoal-700 border border-cream-300 dark:border-charcoal-600 rounded-lg px-2 py-1 text-charcoal-700 dark:text-cream-200"
                  >
                    <option value="daily">{t('todo.intervals.daily')}</option>
                    <option value="weekly">{t('todo.intervals.weekly')}</option>
                    <option value="monthly">{t('todo.intervals.monthly')}</option>
                  </select>
                )}
              </div>
            </form>

            {/* Unchecked items (sortable) */}
            {uncheckedItems.length > 0 && (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={() => setIsDragging(true)}
                onDragEnd={(event) => {
                  handleDragEnd(event);
                  setIsDragging(false);
                }}
                onDragCancel={() => setIsDragging(false)}
              >
                <SortableContext items={uncheckedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {uncheckedItems.map((item) => (
                      <TodoListItem
                        key={item.id}
                        item={item}
                        onToggle={handleToggle}
                        onDelete={deleteItem}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {/* Checked items section */}
            {checkedItems.length > 0 && (
              <div className="relative z-10">
                <div className="px-4 py-2 bg-sage-100 dark:bg-charcoal-700/70 border-t border-cream-200 dark:border-charcoal-600">
                  <span className="text-xs font-semibold text-charcoal-600 dark:text-cream-400 uppercase tracking-wide">
                    {t('todo.completedCount', { count: checkedItems.length })}
                  </span>
                </div>
                <div>
                  {checkedItems.map((item) => (
                    <TodoListItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDelete={deleteItem}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {state.items.length === 0 && (
              <div className="px-4 py-8 text-center relative z-10">
                <svg className="w-12 h-12 mx-auto mb-3 text-sage-300 dark:text-charcoal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="text-charcoal-400 dark:text-charcoal-500 text-sm font-medium">{t('todo.emptyList')}</p>
              </div>
            )}
          </div>

          {/* Undo toast with elastic animation */}
          {lastUnchecked && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-[fadeIn_0.3s_ease-out]">
              <div className="bg-charcoal-800 dark:bg-cream-100 text-cream-100 dark:text-charcoal-800 px-5 py-3 rounded-xl shadow-raised flex items-center gap-4 border border-charcoal-700 dark:border-cream-200">
                <span className="text-sm font-medium">{t('todo.completedItem')} <span className="font-semibold">"{lastUnchecked.name}"</span></span>
                <button
                  onClick={handleUndo}
                  className="text-sm font-bold text-primary-400 dark:text-primary-600 hover:text-primary-300 dark:hover:text-primary-500 transition-colors"
                >
                  {t('buttons.undo')}
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4">
          <RecurringTodoItems />
        </div>
      )}
    </div>
  );
}
