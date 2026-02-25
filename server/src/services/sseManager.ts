import { StreamSSE } from 'hono/streaming';

interface SSEClient {
  stream: StreamSSE;
  id: string;
  aborted: boolean;
}

class SSEManager {
  private clients: Map<string, SSEClient> = new Map();
  private keepAliveInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Send keep-alive comments every 30 seconds to prevent proxy timeouts
    this.keepAliveInterval = setInterval(() => {
      this.sendKeepAlive();
    }, 30000);
  }

  addClient(id: string, stream: StreamSSE, signal: AbortSignal) {
    const client: SSEClient = { stream, id, aborted: false };
    this.clients.set(id, client);

    // Handle client disconnect
    signal.addEventListener('abort', () => {
      client.aborted = true;
      this.removeClient(id);
    });

    console.log(`[SSE] Client connected: ${id} (total: ${this.clients.size})`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(`[SSE] Client disconnected: ${id} (total: ${this.clients.size})`);
  }

  async sendKeepAlive() {
    const now = Date.now();
    for (const [id, client] of this.clients) {
      if (!client.aborted) {
        try {
          // Send comment (: prefix) - keeps connection alive, ignored by EventSource
          await client.stream.write(`: keepalive ${now}\n\n`);
        } catch (err) {
          console.error(`[SSE] Keep-alive failed for client ${id}:`, err);
          client.aborted = true;
          this.removeClient(id);
        }
      }
    }
  }

  async broadcastShoppingListChange() {
    const data = JSON.stringify({
      type: 'shopping-list-changed',
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    for (const [id, client] of this.clients) {
      if (!client.aborted) {
        try {
          await client.stream.writeSSE({
            event: 'shopping-list-changed',
            data,
          });
          sentCount++;
        } catch (err) {
          console.error(`[SSE] Failed to send to client ${id}:`, err);
          client.aborted = true;
          this.removeClient(id);
        }
      }
    }

    if (sentCount > 0) {
      console.log(`[SSE] Broadcast shopping list change to ${sentCount} clients`);
    }
  }

  getClientCount() {
    return this.clients.size;
  }

  destroy() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
  }
}

// Singleton instance
export const sseManager = new SSEManager();
