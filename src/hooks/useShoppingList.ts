import { useReducer, useEffect, useState, useCallback } from 'react';
import type { ShoppingListState } from '../types';
import * as api from '../utils/api';
import { useWebSocket } from './useWebSocket';

const initialState: ShoppingListState = {
  items: [],
  createdAt: new Date().toISOString(),
};

type ShoppingListAction =
  | { type: 'LOAD_STATE'; payload: ShoppingListState };

function shoppingListReducer(state: ShoppingListState, action: ShoppingListAction): ShoppingListState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;
    default:
      return state;
  }
}

export function useShoppingList() {
  const [state, dispatch] = useReducer(shoppingListReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(false);

  // WebSocket message handler
  const handleWebSocketMessage = useCallback((data: any) => {
    if (data.type === 'shopping-list-changed') {
      console.log('[ShoppingList] Change notification received');

      // If dragging, buffer update to apply after drag completes
      if (isDragging) {
        console.log('[ShoppingList] Buffering update (drag in progress)');
        setPendingUpdate(true);
        return;
      }

      // If not loading/saving, refresh immediately
      if (!isLoading && !isSaving) {
        refreshState().catch((err) => {
          console.error('[ShoppingList] Failed to refresh after WS update:', err);
        });
      } else {
        console.log('[ShoppingList] Buffering update (operation in progress)');
        setPendingUpdate(true);
      }
    }
  }, [isDragging, isLoading, isSaving]);

  const refreshState = useCallback(async () => {
    try {
      const data = await api.getShoppingList();
      dispatch({ type: 'LOAD_STATE', payload: data });
    } catch (err) {
      console.error('Failed to refresh state:', err);
      throw err;
    }
  }, []);

  // WebSocket connection
  const { isConnected } = useWebSocket({
    url: '/ws/shopping-list',
    onMessage: handleWebSocketMessage,
    enabled: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getShoppingList();
        dispatch({ type: 'LOAD_STATE', payload: data });
      } catch (err) {
        console.error('Failed to load shopping list:', err);
        setError(err instanceof Error ? err.message : 'Failed to load shopping list');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Apply pending updates after drag completes
  useEffect(() => {
    if (!isDragging && pendingUpdate && !isLoading && !isSaving) {
      console.log('[ShoppingList] Applying buffered update');
      setPendingUpdate(false);
      refreshState().catch((err) => {
        console.error('[ShoppingList] Failed to apply buffered update:', err);
      });
    }
  }, [isDragging, pendingUpdate, isLoading, isSaving, refreshState]);

  const addItem = useCallback(async (name: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.addShoppingItem(name);
      await refreshState();
    } catch (err) {
      console.error('Failed to add item:', err);
      setError(err instanceof Error ? err.message : 'Failed to add item');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const toggleItem = useCallback(async (itemId: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.toggleShoppingItem(itemId);
      await refreshState();
    } catch (err) {
      console.error('Failed to toggle item:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle item');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const deleteItem = useCallback(async (itemId: string) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.deleteShoppingItem(itemId);
      await refreshState();
    } catch (err) {
      console.error('Failed to delete item:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete item');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const reorderItems = useCallback(async (itemIds: string[]) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.reorderShoppingItems(itemIds);
      await refreshState();
    } catch (err) {
      console.error('Failed to reorder items:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder items');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const archiveAndCreateNew = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      const data = await api.archiveShoppingList();
      dispatch({ type: 'LOAD_STATE', payload: data });
    } catch (err) {
      console.error('Failed to archive list:', err);
      setError(err instanceof Error ? err.message : 'Failed to archive list');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const sortItems = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      await api.sortShoppingItems();
      await refreshState();
    } catch (err) {
      console.error('Failed to sort items:', err);
      setError(err instanceof Error ? err.message : 'Failed to sort items');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const updateConfig = useCallback(async (sortingPrompt: string | null) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.updateShoppingListConfig(sortingPrompt);
    } catch (err) {
      console.error('Failed to update config:', err);
      setError(err instanceof Error ? err.message : 'Failed to update config');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  const retry = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await refreshState();
    } catch (err) {
      console.error('Failed to retry:', err);
      setError(err instanceof Error ? err.message : 'Failed to load shopping list');
    } finally {
      setIsLoading(false);
    }
  }, [refreshState]);

  return {
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
  };
}
