import { useReducer, useEffect, useState, useCallback } from 'react';
import type { ShoppingListState } from '../types';
import * as api from '../utils/api';

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

  const refreshState = useCallback(async () => {
    try {
      const data = await api.getShoppingList();
      dispatch({ type: 'LOAD_STATE', payload: data });
    } catch (err) {
      console.error('Failed to refresh state:', err);
      throw err;
    }
  }, []);

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
    retry,
  };
}
