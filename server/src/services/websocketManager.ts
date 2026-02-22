import type { WebSocket } from 'ws';

interface Client {
  ws: WebSocket;
  id: string;
}

class WebSocketManager {
  private clients: Map<string, Client> = new Map();

  addClient(id: string, ws: WebSocket) {
    this.clients.set(id, { ws, id });
    console.log(`[WS] Client connected: ${id} (total: ${this.clients.size})`);
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(`[WS] Client disconnected: ${id} (total: ${this.clients.size})`);
  }

  broadcastShoppingListChange() {
    const message = JSON.stringify({
      type: 'shopping-list-changed',
      timestamp: new Date().toISOString(),
    });

    let sentCount = 0;
    this.clients.forEach((client) => {
      try {
        if (client.ws.readyState === 1) { // OPEN
          client.ws.send(message);
          sentCount++;
        }
      } catch (err) {
        console.error(`[WS] Failed to send to client ${client.id}:`, err);
      }
    });

    if (sentCount > 0) {
      console.log(`[WS] Broadcast shopping list change to ${sentCount} clients`);
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

// Singleton instance
export const wsManager = new WebSocketManager();
