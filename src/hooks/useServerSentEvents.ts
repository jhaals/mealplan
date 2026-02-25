import { useEffect, useRef, useState } from 'react';

interface UseServerSentEventsOptions {
  url: string;
  onMessage: (data: any) => void;
  enabled?: boolean;
}

export function useServerSentEvents({ url, onMessage, enabled = true }: UseServerSentEventsOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Construct absolute URL for EventSource
    const protocol = window.location.protocol;
    const host = window.location.host;
    const sseUrl = `${protocol}//${host}${url}`;

    console.log('[SSE] Connecting to', sseUrl);

    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      console.log('[SSE] Connected');
      setIsConnected(true);
      setError(null);
    };

    // Handle custom 'shopping-list-changed' events
    eventSource.addEventListener('shopping-list-changed', (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch (err) {
        console.error('[SSE] Failed to parse message:', err);
      }
    });

    // Handle 'connected' event (initial handshake)
    eventSource.addEventListener('connected', (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[SSE] Connection established:', data.clientId);
      } catch (err) {
        console.error('[SSE] Failed to parse connected event:', err);
      }
    });

    eventSource.onerror = (event) => {
      console.error('[SSE] Error or disconnected:', event);
      setIsConnected(false);

      // EventSource automatically reconnects with exponential backoff
      // No manual reconnection needed - browser handles it
      if (eventSource.readyState === EventSource.CLOSED) {
        setError('SSE connection closed');
      } else {
        setError('SSE connection error (reconnecting...)');
      }
    };

    eventSourceRef.current = eventSource;

    return () => {
      console.log('[SSE] Closing connection');
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [url, enabled, onMessage]);

  return { isConnected, error };
}
