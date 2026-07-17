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
import { useShoppingList } from '../hooks/useShoppingList';
import { ShoppingListItem } from './ShoppingListItem';
import { ShoppingListHistory } from './ShoppingListHistory';
import { SortPromptEditor } from './SortPromptEditor';
import { Segmented } from './ui/Segmented';
import { Button } from './ui/Button';
import { UndoToast } from './ui/UndoToast';
import * as api from '../utils/api';

export function ShoppingList() {
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
    sortItems,
    archiveAndCreateNew,
    updateConfig,
    retry,
    setIsDragging,
    isConnected,
  } = useShoppingList();

  const [newItemName, setNewItemName] = useState('');
  const [activeTab, setActiveTab] = useState<'list' | 'history' | 'prompt'>('list');
  const [lastUnchecked, setLastUnchecked] = useState<{ id: string; name: string } | null>(null);
  const undoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [sortingPrompt, setSortingPrompt] = useState<string>('');
  const [defaultPrompt, setDefaultPrompt] = useState<string>('');
  const [isLoadingPrompt, setIsLoadingPrompt] = useState(false);

  // Cleanup undo timeout on unmount
  useEffect(() => {
    return () => {
      if (undoTimeoutRef.current) {
        clearTimeout(undoTimeoutRef.current);
      }
    };
  }, []);

  // Load sorting prompt when prompt tab is active
  useEffect(() => {
    const loadPrompts = async () => {
      try {
        setIsLoadingPrompt(true);
        const [config, defaultData] = await Promise.all([
          api.getShoppingListConfig(),
          api.getDefaultSortingPrompt()
        ]);

        setSortingPrompt(config.sortingPrompt || '');
        setDefaultPrompt(defaultData.defaultPrompt);
      } catch (err) {
        console.error('Failed to load prompts:', err);
      } finally {
        setIsLoadingPrompt(false);
      }
    };

    if (activeTab === 'prompt') {
      loadPrompts();
    }
  }, [activeTab]);

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
      await addItem(trimmed);
      setNewItemName('');
    } catch {
      // Error handled by hook
    }
  };

  const handleToggle = async (itemId: string) => {
    const item = state.items.find(i => i.id === itemId);
    if (item && !item.checked) {
      // About to check - store for undo
      setLastUnchecked({ id: item.id, name: item.name });
      // Clear previous timeout and set new one
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
            style={{ borderColor: 'var(--color-accent-2)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
            aria-hidden="true"
          />
          <p className="text-muted font-medium">{t('messages.loadingShoppingList')}</p>
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
          aria-label={t('headings.shoppingList')}
          value={activeTab}
          onChange={setActiveTab}
          options={[
            { value: 'list', label: t('tabs.currentList') },
            { value: 'history', label: t('tabs.history') },
            { value: 'prompt', label: t('tabs.sortPrompt') },
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

          {/* Header — the list's identity, its live status, and its actions.
            * Density lever: this screen is deliberately denser than /meals. */}
          <div className="flex items-center justify-between gap-2 flex-wrap mb-3">
            <div className="flex items-center gap-2 min-w-0">
              <h2 style={{ fontSize: 'var(--text-xl)' }}>{t('headings.shoppingList')}</h2>
              <span
                className="chip tint-cyan"
                title={isConnected ? t('status.live') : t('status.offline')}
              >
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
                  style={{ borderColor: 'var(--color-accent-2)', borderTopColor: 'transparent', animation: 'hum-spin 700ms linear infinite' }}
                  aria-label={t('buttons.saving')}
                />
              )}
              {uncheckedItems.length > 1 && (
                <Button variant="secondary" size="sm" onClick={sortItems} disabled={isSaving}>
                  {t('buttons.sort')}
                </Button>
              )}
              {state.items.length > 0 && (
                <Button variant="outline" size="sm" onClick={archiveAndCreateNew} disabled={isSaving}>
                  {t('buttons.newList')}
                </Button>
              )}
            </div>
          </div>

          {/* Add item — sits on a cyan band, the route's accent. */}
          <form onSubmit={handleAddItem} className="flex items-center gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={t('forms.addItemPlaceholder')}
              aria-label={t('forms.addItemPlaceholder')}
              className="field"
              style={{ background: 'color-mix(in oklab, var(--color-accent-2) 7%, var(--color-paper))' }}
            />
            {/* Pear, not cyan: Hum's three-rule says pear owns primary action
              * regardless of which accent tints the route's surfaces. */}
            <Button
              type="submit"
              className="shrink-0 btn--icon"
              disabled={!newItemName.trim()}
              aria-label={t('forms.addItemPlaceholder')}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </Button>
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
                    <ShoppingListItem
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
                {t('counts.checkedItems', { count: checkedItems.length })}
              </p>
              <ul className="grid gap-1.5 list-none p-0 m-0">
                {checkedItems.map((item) => (
                  <ShoppingListItem
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
              <p className="text-muted">{t('messages.emptyShoppingList')}</p>
            </div>
          )}

          {lastUnchecked && (
            <UndoToast
              message={t('messages.checkedOff')}
              itemName={lastUnchecked.name}
              onUndo={handleUndo}
            />
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div className="py-5">
          <ShoppingListHistory />
        </div>
      ) : (
        <div className="py-5">
          <SortPromptEditor
            currentPrompt={sortingPrompt}
            defaultPrompt={defaultPrompt}
            isLoading={isLoadingPrompt}
            isSaving={isSaving}
            onSave={async (prompt) => {
              await updateConfig(prompt || null);
              setSortingPrompt(prompt);
            }}
            onReset={() => {
              setSortingPrompt('');
            }}
          />
        </div>
      )}
    </div>
  );
}
