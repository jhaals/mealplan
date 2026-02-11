import { useState, useRef, useEffect } from 'react';
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
import * as api from '../utils/api';

export function ShoppingList() {
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
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-600 border-t-transparent mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading shopping list...</p>
        </div>
      </div>
    );
  }

  if (error && state.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center max-w-md px-4">
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-6 mb-4">
            <h2 className="text-xl font-semibold text-red-900 dark:text-red-200 mb-2">Error</h2>
            <p className="text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={retry}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'list'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Current List
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'history'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            History
          </button>
          <button
            onClick={() => setActiveTab('prompt')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'prompt'
                ? 'border-primary-600 text-primary-700 dark:text-primary-400'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            Sort Prompt
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
                Retry
              </button>
            </div>
          )}

          {/* Google Keep-style card */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Card header */}
            <div className="px-2 py-1 flex items-center justify-between border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm">Shopping List</h2>
              <div className="flex items-center gap-2">
                {isSaving && (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-600 border-t-transparent"></div>
                )}
                {uncheckedItems.length > 1 && (
                  <button
                    onClick={sortItems}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    Sort
                  </button>
                )}
                {state.items.length > 0 && (
                  <button
                    onClick={archiveAndCreateNew}
                    disabled={isSaving}
                    className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                  >
                    New List
                  </button>
                )}
              </div>
            </div>

            {/* Add item form */}
            <form onSubmit={handleAddItem} className="px-2 py-1 border-b border-gray-100 dark:border-gray-700">
              <div className="flex items-center gap-1.5">
                <span className="text-primary-600 text-base font-bold">+</span>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="Add item..."
                  className="flex-1 bg-transparent border-none outline-none text-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
                />
              </div>
            </form>

            {/* Unchecked items (sortable) */}
            {uncheckedItems.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={uncheckedItems.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="divide-y divide-gray-50 dark:divide-gray-700">
                    {uncheckedItems.map((item) => (
                      <ShoppingListItem
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
              <div>
                <div className="px-2 py-0.5 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600">
                  <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    {checkedItems.length} checked {checkedItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>
                <div className="divide-y divide-gray-50 dark:divide-gray-700">
                  {checkedItems.map((item) => (
                    <ShoppingListItem
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
              <div className="px-2 py-3 text-center">
                <p className="text-gray-400 dark:text-gray-500 text-xs">Your shopping list is empty</p>
              </div>
            )}
          </div>

          {/* Undo toast */}
          {lastUnchecked && (
            <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50">
              <span className="text-sm">Checked off "{lastUnchecked.name}"</span>
              <button
                onClick={handleUndo}
                className="text-sm font-semibold text-primary-400 hover:text-primary-300"
              >
                Undo
              </button>
            </div>
          )}
        </div>
      ) : activeTab === 'history' ? (
        <div className="p-4">
          <ShoppingListHistory />
        </div>
      ) : (
        <div className="p-4">
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
