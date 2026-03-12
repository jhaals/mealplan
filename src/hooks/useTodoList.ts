import { useReducer, useEffect, useState, useCallback } from 'react';
import type { TodoListState } from '../types';
import * as api from '../utils/api';
import { useServerSentEvents } from './useServerSentEvents';

const initialState: TodoListState = {
  items: [],
  createdAt: new Date().toISOString(),
};

type TodoListAction =
  | { type: 'LOAD_STATE'; payload: TodoListState };

function todoListReducer(state: TodoListState, action: TodoListAction): TodoListState {
  switch (action.type) {
    case 'LOAD_STATE':
      return action.payload;
    default:
      return state;
  }
}

export function useTodoList() {
  const [state, dispatch] = useReducer(todoListReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(false);

  const refreshState = useCallback(async () => {
    try {
      const data = await api.getTodoList();
      dispatch({ type: 'LOAD_STATE', payload: data });
    } catch (err) {
      console.error('Failed to refresh state:', err);
      throw err;
    }
  }, []);

  // SSE message handler
  const handleSSEMessage = useCallback((data: any) => {
    if (data.type === 'todo-list-changed') {
      console.log('[SSE TodoList] Change notification received');

      if (isDragging) {
        console.log('[SSE TodoList] Buffering update (drag in progress)');
        setPendingUpdate(true);
        return;
      }

      if (!isLoading && !isSaving) {
        refreshState().catch((err) => {
          console.error('[SSE TodoList] Failed to refresh after update:', err);
        });
      } else {
        console.log('[SSE TodoList] Buffering update (operation in progress)');
        setPendingUpdate(true);
      }
    }
  }, [isDragging, isLoading, isSaving, refreshState]);

  // SSE connection
  const { isConnected } = useServerSentEvents({
    url: '/api/todo-list/events',
    onMessage: handleSSEMessage,
    enabled: true,
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await api.getTodoList();
        dispatch({ type: 'LOAD_STATE', payload: data });
      } catch (err) {
        console.error('Failed to load todo list:', err);
        setError(err instanceof Error ? err.message : 'Failed to load todo list');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // Apply pending updates after drag completes
  useEffect(() => {
    if (!isDragging && pendingUpdate && !isLoading && !isSaving) {
      console.log('[SSE TodoList] Applying buffered update');
      setPendingUpdate(false);
      refreshState().catch((err) => {
        console.error('[SSE TodoList] Failed to apply buffered update:', err);
      });
    }
  }, [isDragging, pendingUpdate, isLoading, isSaving, refreshState]);

  const addItem = useCallback(async (
    name: string,
    isRecurring: boolean = false,
    recurrenceInterval: string | null = null,
    recurrenceDays: number | null = null
  ) => {
    try {
      setIsSaving(true);
      setError(null);
      await api.addTodoItem(name, isRecurring, recurrenceInterval, recurrenceDays);
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
      await api.toggleTodoItem(itemId);
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
      await api.deleteTodoItem(itemId);
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
      await api.reorderTodoItems(itemIds);
      await refreshState();
    } catch (err) {
      console.error('Failed to reorder items:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder items');
      throw err;
    } finally {
      setIsSaving(false);
    }
  }, [refreshState]);

  const clearCompleted = useCallback(async () => {
    try {
      setIsSaving(true);
      setError(null);
      await api.clearCompletedTodoItems();
      await refreshState();
    } catch (err) {
      console.error('Failed to clear completed:', err);
      setError(err instanceof Error ? err.message : 'Failed to clear completed items');
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
      setError(err instanceof Error ? err.message : 'Failed to load todo list');
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
    clearCompleted,
    retry,
    setIsDragging,
    isConnected,
  };
}
