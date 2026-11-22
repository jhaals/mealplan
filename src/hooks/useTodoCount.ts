import { useCallback, useEffect, useState } from 'react';
import * as api from '../utils/api';
import { useServerSentEvents } from './useServerSentEvents';

/** Number of open (unchecked) todo items, kept live through SSE. */
export function useTodoCount() {
  const [count, setCount] = useState(0);

  const refresh = useCallback(() => {
    api
      .getTodoList()
      .then((list) => setCount(list.items.filter((item) => !item.checked).length))
      .catch((err) => console.error('Failed to load todo count:', err));
  }, []);

  useEffect(() => {
    refresh();
    // Recurring items become due over time; refresh when the app is reopened.
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [refresh]);

  const handleMessage = useCallback(
    (data: { type: string }) => {
      if (data.type === 'todo-list-changed') refresh();
    },
    [refresh],
  );

  useServerSentEvents({ url: '/api/todo-list/events', onMessage: handleMessage });

  return count;
}
