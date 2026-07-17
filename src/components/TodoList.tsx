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
import { Segmented } from './ui/Segmented';
import { Button } from './ui/Button';
import { UndoToast } from './ui/UndoToast';

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
          <span
            className="inline-block h-10 w-10 mb-4 rounded-full border-2 border-t-transparent"
            style={{ borderColor: 'var(--color-mint)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
            aria-hidden="true"
          />
          <p className="text-muted font-medium">{t('todo.loading')}</p>
        </div>
      </div>
    );
  }

  if (error && state.items.length === 0) {
    return (
      <div className="shell py-8">
        <div
          className="card card--tint tint-coral p-4"
          style={{ boxShadow: 'none', border: '1.5px solid color-mix(in oklab, var(--color-accent-3) 40%, transparent)' }}
          role="alert"
        >
          <p className="font-semibold text-ink">{t('headings.error')}</p>
          <p className="text-sm text-muted mt-0.5 break-words">{error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={retry}>
            {t('buttons.retry')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="shell">
      <div className="pt-4">
        <Segmented
          aria-label={t('todo.heading')}
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'list', label: t('todo.tabs.active') },
            { value: 'recurring', label: t('todo.tabs.recurring') },
          ]}
        />
      </div>

      {activeTab === 'list' ? (
        <div className="py-5">
          {error && (
            <div
              className="card card--tint tint-coral p-3 mb-4 flex items-start justify-between gap-3"
              style={{ boxShadow: 'none' }}
              role="alert"
            >
              <p className="text-sm text-ink break-words min-w-0">{error}</p>
              <button onClick={retry} className="btn btn--soft btn--sm shrink-0">
                {t('buttons.retry')}
              </button>
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 style={{ fontSize: 'var(--text-xl)' }}>{t('todo.heading')}</h2>
              <span className="chip tint-mint" title={isConnected ? t('status.live') : t('status.offline')}>
                <span
                  aria-hidden="true"
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: isConnected ? 'var(--color-mint)' : 'var(--color-accent-3)',
                  }}
                />
                {isConnected ? t('status.live') : t('status.offline')}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {isSaving && (
                <span
                  className="inline-block h-4 w-4 rounded-full border-2 border-t-transparent"
                  style={{ borderColor: 'var(--color-mint)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
                  aria-label={t('buttons.saving')}
                />
              )}
              {checkedItems.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearCompleted} disabled={isSaving}>
                  {t('todo.clearCompleted')}
                </Button>
              )}
            </div>
          </div>

          {/* Add item — on a mint band, the route's accent. */}
          <form onSubmit={handleAddItem}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                placeholder={t('todo.addItemPlaceholder')}
                aria-label={t('todo.addItemPlaceholder')}
                className="field"
                style={{ background: 'color-mix(in oklab, var(--color-mint) 7%, var(--color-paper))' }}
              />
              <Button
                type="submit"
                className="shrink-0 btn--icon"
                disabled={!newItemName.trim()}
                aria-label={t('todo.addItemPlaceholder')}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </Button>
            </div>

            {/* A pill toggle, not a checkbox. A checkbox here sat directly above
              * a column of item checkboxes and read as "Recurring" being the
              * first todo. The pill is unmistakably a control, and it wears the
              * same lavender + ↻ as the recurring badge it produces. */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <button
                type="button"
                aria-pressed={isRecurring}
                onClick={() => setIsRecurring(!isRecurring)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-[background-color,border-color,color]"
                style={{
                  minHeight: 'auto',
                  minWidth: 'auto',
                  border: `1.5px solid ${isRecurring ? 'var(--color-lavender)' : 'var(--color-rule)'}`,
                  background: isRecurring
                    ? 'color-mix(in oklab, var(--color-lavender) 22%, var(--color-paper))'
                    : 'transparent',
                  color: isRecurring ? 'var(--color-ink)' : 'var(--color-ink-2)',
                  transitionDuration: 'var(--dur-hover)',
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
                  <path d="M21 3v5h-5" />
                  <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
                  <path d="M3 21v-5h5" />
                </svg>
                {t('todo.recurring')}
              </button>

              {isRecurring && (
                <select
                  value={recurrenceInterval}
                  onChange={(e) => setRecurrenceInterval(e.target.value)}
                  aria-label={t('todo.recurring')}
                  className="field text-sm"
                  style={{ width: 'auto', paddingBlock: '0.35rem' }}
                >
                  <option value="daily">{t('todo.intervals.daily')}</option>
                  <option value="weekly">{t('todo.intervals.weekly')}</option>
                  <option value="monthly">{t('todo.intervals.monthly')}</option>
                </select>
              )}
            </div>
          </form>

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
                <ul className="mt-4 grid gap-1.5 list-none p-0 m-0">
                  {uncheckedItems.map((item) => (
                    <TodoListItem
                      key={item.id}
                      item={item}
                      onToggle={handleToggle}
                      onDelete={deleteItem}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          )}

          {checkedItems.length > 0 && (
            <div className="mt-6">
              <hr className="seam mb-3" />
              <p className="mono-label mb-2">
                {t('todo.completedCount', { count: checkedItems.length })}
              </p>
              <ul className="grid gap-1.5 list-none p-0 m-0">
                {checkedItems.map((item) => (
                  <TodoListItem
                    key={item.id}
                    item={item}
                    onToggle={handleToggle}
                    onDelete={deleteItem}
                  />
                ))}
              </ul>
            </div>
          )}

          {state.items.length === 0 && (
            <div className="py-10 flex items-start gap-3">
              <span className="mark mt-1.5 shrink-0" aria-hidden="true" />
              <p className="text-muted">{t('todo.emptyList')}</p>
            </div>
          )}

          {lastUnchecked && (
            <UndoToast
              message={t('todo.completedItem')}
              itemName={lastUnchecked.name}
              onUndo={handleUndo}
            />
          )}
        </div>
      ) : (
        <div className="py-5">
          <RecurringTodoItems />
        </div>
      )}
    </div>
  );
}
